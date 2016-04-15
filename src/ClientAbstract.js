'use strict'

const EventEmitter = require('events').EventEmitter
const maybestack = require('maybestack')
const exists = require('deep-exists')
const MessageQueue = require('./MessageQueue')
const enums = require('./enums')
const ActionResponse = enums.ActionResponse
const PROTOCOL_VERSION = enums.PROTOCOL_VERSION

class ClientAbstract extends EventEmitter {
  constructor () {
    super()

    this._emit = super.emit.bind(this) // EventEmitter's emit
    this.PROTOCOL_VERSION = PROTOCOL_VERSION
    if (!this._d) this._d = () => {}
    this._da = (msg) => this._d(`[abstract] ${msg}`)

    // We can't have _events, because it's an EventEmitter private property.
    this._sEvents = new Map()
    this._actions = new Map()
    this._actionPromises = new Map()
    this._currentActionId = 0
    this._messageQueue = new MessageQueue((msg, done) => this._processQueue(msg, done))
    // The message queue is paused by default.
    this._messageQueue.pause()

    this._closeMustHaveError = false
    this._socketeerClosing = false

    // Reserved variable for anyone except the library to use.
    // Helps with not polluting the Socketeer instance namespace.
    this.data = {}
  }

  _attachEvents () {
    this._da('attaching events')
    this.ws.onmessage = (messageEvent) => this._handleMessage(messageEvent)
    this.ws.onerror = (err) => this._handleError(err)
    this.ws.onclose = (closeEvent) => this._handleClose(closeEvent)
  }

  _detachEvents () {
    this._da('detaching events')
    this.ws.onmessage = () => {
      this._da('warning: a detached websocket emitted the "message" event')
    }
    this.ws.onclose = () => {
      this._da('warning: a detached websocket emitted the "close" event')
    }
    // We want to handle any errors the websocket
    // might emit to prevent unneeded unhandled exceptions.
    this.ws.onerror = (err) => {
      this._da(`handling error of closed connection: ${maybestack(err)}`)
    }
  }

  emit (name, data) {
    this._da(`emitting event: ${name}`)
    this.send({
      e: name,
      d: data
    })
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data
    // TODO: isBinary: I don't think there is any time that data is a number.
    let isBinary = messageEvent.binary || (!(typeof data === 'string' || typeof data === 'number'))
    const _da = this._da
    _da('handling message')

    if (isBinary) {
      _da('message handler ignored due to unsupported binary data')
      return
    }

    if (typeof data !== 'string') {
      _da('warning: isBinary is false, but data is not a string!')
      return
    }

    let parsed
    try {
      _da('parsing message JSON')
      parsed = JSON.parse(data)
    } catch (err) {
      _da('JSON parse failed, ignoring: ' + maybestack(err))
      return
    }

    if (exists(parsed, 'a')) {
      _da('data is action')
      this._handleAction(parsed)
    } else if (exists(parsed, 's')) {
      _da('data is action response')
      this._handleActionResponse(parsed)
    } else if (exists(parsed, 'e')) {
      _da('data is event')
      this._handleEvent(parsed)
    } else {
      _da('data is of unknown type, ignoring')
    }

    return
  }

  close (code, message) {
    this._da('closing connection')
    this.ws.close(code, message)
  }

  terminate () {
    this._da('terminating connection')
    this.ws.terminate()
  }

  _handleError (err) {
    this._da(`handling error: ${maybestack(err)}`)
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
      this._da('socketeer is closing, ignoring _handleError')
      return
    }
    this._emit('error', err, true)
    this._closeMustHaveError = true
    this.close()
    this._da('error handling: handling close')
    if (!err) err = new Error('unknown, unspecified error')
    this._handleClose({
      code: null,
      reason: null,
      error: err
    })
  }

  _handleClose (closeEvent) {
    this._da('handling close')
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
      this._da('socketeer is closing, ignoring _handleClose')
      return
    }
    if (!closeEvent) closeEvent = {}
    let error = closeEvent.error
    let code = closeEvent.code
    let message = closeEvent.reason
    if (!error) error = null
    // This is in the case the websocket emits the 'close' event
    //  before we get the chance to call the _handleClose
    //  in the _handleError function.
    // TODO: Is this really necessary?
    if (!error && this._closeMustHaveError) {
      this._da('ignoring close message because it does not have error, but it was specified that it should')
      return
    }
    this._socketeerClosing = true
    this._closeMustHaveError = false
    this._da('close code: ' + code)
    this._da('close message: ' + message)
    this._da('close error: ' + maybestack(error))
    this._detachEvents()
    const eventName = (this._closeIsPause) ? 'pause' : 'close'
    this._emit(eventName, code, message, error)
  }

  _processQueue (msg, done) {
    if (!this.isOpen()) {
      this._da('socket is not open, pausing message queue')
      this._messageQueue.pause()
      this._messageQueue.unshift(msg)
      return setImmediate(done)
    } else {
      this._da('sending next message in queue')
      return this.ws.send(msg, done)
    }
  }

  _resumeMessageQueue () {
    this._da('resuming message queue')
    this._messageQueue.resume()
  }

  _clearMessageQueue () {
    this._da('clearing message queue')
    this._messageQueue.kill()
  }

  send (obj) {
    this._da('adding message to message queue')
    let data
    try {
      data = JSON.stringify(obj)
    } catch (err) {
      this._da(`could not stringify message for sending: ${maybestack(err)}`)
    }
    this._messageQueue.push(data)
  }

  _handleAction (data) {
    this._da(`handling action: ${data.a}`)
    const handler = this._actions.get(data.a)
    if (!handler) {
      this._da('action handler does not exist')
      return this.send({
        i: data.i,
        s: ActionResponse.NONEXISTENT,
        d: ActionResponse.NONEXISTENT
      })
    }

    let handlerPromise
    this._da('calling action handler')
    try {
      handlerPromise = handler(data.d)
    } catch (err) {
      this._da(`action handler errored (call fail), responding: ${maybestack(err)}`)
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      // Non-connection closing error.
      return this._emit('error', new Error(`action handler for ${data.a} call errored: ${maybestack(err)}`))
    }

    // Make sure handlerPromise is actually a promise.
    if (!handlerPromise || typeof handlerPromise.then !== 'function' || typeof handlerPromise.catch !== 'function') {
      this._da('action handler for action ' + data.a + ' does not return a promise')
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      // Non-connection closing error.
      return this._emit('error', new Error('action handler for ' + data.a + ' does not return a promise'))
    }

    handlerPromise.then((response) => {
      this._da(`action handler for ${data.a} thenned, responding`)
      this.send({
        i: data.i,
        s: ActionResponse.OK,
        d: response
      })
    }).catch((err) => {
      this._da(`action handler errored (promise catch), responding: ${maybestack(err)}`)
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      // Non-connection closing error
      this._emit('error', new Error(`action handler for ${data.a} catch errored: ${maybestack(err)}`))
    })
  }

  _handleActionResponse (data) {
    this._da(`handling action response: ${data.i}`)
    // TODO: Action response handler cleanup after usage
    const handler = this._actionPromises.get(data.i)
    // We are not throwing an error if the connection sends an
    // action response for a nonexistent handler because the action
    // response handler map is cleaned up on a regular basis, same with
    // the action timing out.
    // It could indicate that the client or server is faulty, but
    // it'll have to be something the client or server code writer
    // needs to figure out.
    if (!handler) return
    // This is in case the server responds after the timeout.
    if (handler.finished) return
    handler.finished = true
    if (handler.timeout) clearTimeout(handler.timeout)
    this._da('action response handler exists, continuing')
    this._da(`determining error from status: ${data.s}`)
    let err
    switch (data.s) {
      case ActionResponse.OK: break
      case ActionResponse.ERROR:
        err = new Error('an error occured processing action')
        break
      case ActionResponse.NONEXISTENT:
        err = new Error('action does not exist')
        break
      default:
        err = new Error(`an unknown non-OK response was received: ${data.s}`)
    }
    this._da('calling action response handler')
    try {
      if (!err) {
        handler.resolve(data.d)
      } else {
        handler.reject(err)
      }
    } catch (err) {
      this._emit('error', new Error('could not resolve or reject the action response handler: ' + err))
    }
  }

  _handleEvent (data) {
    this._da(`handling event: ${data.e}`)
    const handlers = this._sEvents.get(data.e)
    if (!handlers || !handlers.length) return
    this._da(`handlers exist for event ${data.e}: there are ${handlers.length} handlers`)
    for (let handler of handlers) {
      try {
        handler(data.d)
      } catch (err) {
        this._da('an error occured calling the event handler')
        // Non-connection closing error
        this._emit('error', err)
        continue // Go ahead and take care of the other event handlers.
      }
    }
  }

  event (name, handler) {
    if (typeof handler !== 'function') {
      throw new Error('event handler is not a function')
    }
    this._da(`defining event handler for ${name}`)
    if (!this._sEvents.get(name)) this._sEvents.set(name, [])
    this._sEvents.get(name).push(handler)
  }

  action (name, handler, force) {
    if (typeof handler !== 'function') {
      throw new Error('action handler is not a function')
    }
    this._da(`defining action handler for ${name}`)
    if (this._actions.get(name) && !force) {
      this._da('action handler is already defined')
      throw new Error('action handler is already set (use the "force" flag to override)')
    }
    this._actions.set(name, handler)
  }

  request (name, data, opts) {
    return new Promise((resolve, reject) => {
      if (!opts) opts = {}
      if (opts.timeout === undefined) opts.timeout = 30000 // default 30 second timeout
      const id = this._generateActionId()
      const action = {
        resolve: resolve,
        reject: reject,
        finished: false
      }
      if (opts.timeout) {
        action.timeout = setTimeout(() => {
          if (action.finished) return
          this._d(`Action ID ${id} timed out`)
          action.finished = true
          action.reject(new Error('Action timed out'))
        }, opts.timeout)
      }
      this._actionPromises.set(id, action)
      this.send({
        i: id,
        a: name,
        d: data
      })
    })
  }

  _generateActionId () {
    this._da(`generated action id: ${this._currentActionId}`)
    return this._currentActionId++
  }

  isOpening () {
    return this.ws.readyState === this.ws.CONNECTING
  }

  isOpen () {
    return this.ws.readyState === this.ws.OPEN
  }

  isClosing () {
    return this.ws.readyState === this.ws.CLOSING
  }

  isClosed () {
    return this.ws.readyState === this.ws.CLOSED
  }
}

module.exports = ClientAbstract
