'use strict'

const EventEmitter = require('events').EventEmitter
const maybestack = require('maybestack')
const exists = require('deep-exists')
const setImmediateShim = require('set-immediate-shim')
const MessageQueue = require('./MessageQueue')
const enums = require('./enums')
const ActionResponse = enums.ActionResponse
const PROTOCOL_VERSION = enums.PROTOCOL_VERSION

class ClientAbstract extends EventEmitter {
  constructor () {
    super()

    this._emit = super.emit.bind(this) // EventEmitter's emit
    this.PROTOCOL_VERSION = PROTOCOL_VERSION
    if (!this._d) this._d = () => {} // [DEBUG]
    this._da = (msg) => this._d(`[abstract] ${msg}`) // [DEBUG]

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
    this._da('attaching events') // [DEBUG]
    this.ws.onmessage = (messageEvent) => this._handleMessage(messageEvent)
    this.ws.onerror = (err) => this._handleError(err)
    this.ws.onclose = (closeEvent) => this._handleClose(closeEvent)
  }

  _detachEvents () {
    this._da('detaching events') // [DEBUG]
    this.ws.onmessage = () => {
      this._da('warning: a detached websocket emitted the "message" event') // [DEBUG]
    }
    this.ws.onclose = () => {
      this._da('warning: a detached websocket emitted the "close" event') // [DEBUG]
    }
    // We want to handle any errors the websocket
    // might emit to prevent unneeded unhandled exceptions.
    this.ws.onerror = (err) => {
      this._da(`handling error of closed connection: ${maybestack(err)}`) // [DEBUG]
    }
  }

  emit (name, data) {
    this._da(`emitting event: ${name}`) // [DEBUG]
    this.send({
      e: name,
      d: data
    })
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data
    // TODO: isBinary: I don't think there is any time that data is a number.
    let isBinary = messageEvent.binary || (!(typeof data === 'string' || typeof data === 'number'))
    const _da = this._da // [DEBUG]
    _da('handling message') // [DEBUG]

    if (isBinary) {
      _da('message handler ignored due to unsupported binary data') // [DEBUG]
      return
    }

    if (typeof data !== 'string') {
      _da('warning: isBinary is false, but data is not a string!') // [DEBUG]
      return
    }

    let parsed
    try {
      _da('parsing message JSON') // [DEBUG]
      parsed = JSON.parse(data)
    } catch (err) {
      _da('JSON parse failed, ignoring: ' + maybestack(err)) // [DEBUG]
      return
    }

    if (exists(parsed, 'a')) {
      _da('data is action') // [DEBUG]
      this._handleAction(parsed)
    } else if (exists(parsed, 's')) {
      _da('data is action response') // [DEBUG]
      this._handleActionResponse(parsed)
    } else if (exists(parsed, 'e')) {
      _da('data is event') // [DEBUG]
      this._handleEvent(parsed)
    } else {
      _da('data is of unknown type, ignoring') // [DEBUG]
    }

    return
  }

  close (code, message) {
    this._da('closing connection') // [DEBUG]
    this.ws.close(code, message)
  }

  terminate () {
    this._da('terminating connection') // [DEBUG]
    this.ws.terminate()
  }

  _handleError (err) {
    this._da(`handling error: ${maybestack(err)}`) // [DEBUG]
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
      this._da('socketeer is closing, ignoring _handleError') // [DEBUG]
      return
    }
    this._emit('error', err, true)
    this._closeMustHaveError = true
    this.close()
    this._da('error handling: handling close') // [DEBUG]
    if (!err) err = new Error('unknown, unspecified error')
    this._handleClose({
      code: null,
      reason: null,
      error: err
    })
  }

  _handleClose (closeEvent) {
    this._da('handling close') // [DEBUG]
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
      this._da('socketeer is closing, ignoring _handleClose') // [DEBUG]
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
      this._da('ignoring close message because it does not have error, but it was specified that it should') // [DEBUG]
      return
    }
    this._socketeerClosing = true
    this._closeMustHaveError = false
    this._da('close code: ' + code) // [DEBUG]
    this._da('close message: ' + message) // [DEBUG]
    this._da('close error: ' + maybestack(error)) // [DEBUG]
    this._detachEvents()
    const eventName = (this._closeIsPause) ? 'pause' : 'close'
    this._emit(eventName, code, message, error)
  }

  _processQueue (msg, done) {
    if (!this.isOpen()) {
      this._da('socket is not open, pausing message queue') // [DEBUG]
      this._messageQueue.pause()
      this._messageQueue.unshift(msg)
      return setImmediateShim(done)
    } else {
      this._da('sending next message in queue') // [DEBUG]
      if (this._isBrowserClient) {
        this.ws.send(msg)
        return done()
      } else {
        return this.ws.send(msg, done)
      }
    }
  }

  _resumeMessageQueue () {
    this._da('resuming message queue') // [DEBUG]
    this._messageQueue.resume()
  }

  _clearMessageQueue () {
    this._da('clearing message queue') // [DEBUG]
    this._messageQueue.kill()
  }

  send (obj) {
    this._da('adding message to message queue') // [DEBUG]
    let data
    try {
      data = JSON.stringify(obj)
    } catch (err) {
      this._da(`could not stringify message for sending: ${maybestack(err)}`) // [DEBUG]
    }
    this._messageQueue.push(data)
  }

  _handleAction (data) {
    this._da(`handling action: ${data.a}`) // [DEBUG]
    const handler = this._actions.get(data.a)
    if (!handler) {
      this._da('action handler does not exist') // [DEBUG]
      return this.send({
        i: data.i,
        s: ActionResponse.NONEXISTENT,
        d: ActionResponse.NONEXISTENT
      })
    }

    let handlerPromise
    this._da('calling action handler') // [DEBUG]
    try {
      handlerPromise = handler(data.d)
    } catch (err) {
      this._da(`action handler errored (call fail), responding: ${maybestack(err)}`) // [DEBUG]
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
      this._da('action handler for action ' + data.a + ' does not return a promise') // [DEBUG]
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      // Non-connection closing error.
      return this._emit('error', new Error('action handler for ' + data.a + ' does not return a promise'))
    }

    handlerPromise.then((response) => {
      this._da(`action handler for ${data.a} thenned, responding`) // [DEBUG]
      this.send({
        i: data.i,
        s: ActionResponse.OK,
        d: response
      })
    }).catch((err) => {
      this._da(`action handler errored (promise catch), responding: ${maybestack(err)}`) // [DEBUG]
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
    this._da(`handling action response: ${data.i}`) // [DEBUG]
    const handler = this._actionPromises.get(data.i)
    // The timeout could have cleaned up the handler.
    if (!handler) return
    // Indicate to the action timeout that it should not do anything
    handler.finished = true
    if (handler.timeout) clearTimeout(handler.timeout)
    this._da('action response handler exists, continuing') // [DEBUG]
    this._da(`determining error from status: ${data.s}`) // [DEBUG]
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
    this._da('calling action response handler') // [DEBUG]
    try {
      if (!err) {
        handler.resolve(data.d)
      } else {
        handler.reject(err)
      }
    } catch (err) {
      this._emit('error', new Error('could not resolve or reject the action response handler: ' + err))
    }
    this._actionPromises.delete(data.i)
  }

  _handleEvent (data) {
    this._da(`handling event: ${data.e}`) // [DEBUG]
    const handlers = this._sEvents.get(data.e)
    if (!handlers || !handlers.length) return
    this._da(`handlers exist for event ${data.e}: there are ${handlers.length} handlers`) // [DEBUG]
    for (let handler of handlers) {
      try {
        handler(data.d)
      } catch (err) {
        this._da('an error occured calling the event handler') // [DEBUG]
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
    this._da(`defining event handler for ${name}`) // [DEBUG]
    if (!this._sEvents.get(name)) this._sEvents.set(name, [])
    this._sEvents.get(name).push(handler)
  }

  action (name, handler, force) {
    if (typeof handler !== 'function') {
      throw new Error('action handler is not a function')
    }
    this._da(`defining action handler for ${name}`) // [DEBUG]
    if (this._actions.get(name) && !force) {
      this._da('action handler is already defined') // [DEBUG]
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
          this._da(`Action ID ${id} timed out`) // [DEBUG]
          this._actionPromises.delete(id)
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
    this._da(`generated action id: ${this._currentActionId}`) // [DEBUG]
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
