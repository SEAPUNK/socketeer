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
    this.ws.onmessage = (messageEvent) => this._handleMessage(messageEvent)
    this.ws.onerror = (err) => this._handleError(err)
    this.ws.onclose = (closeEvent) => this._handleClose(closeEvent)
  }

  _detachEvents () {
    this.ws.onmessage = () => {
    }
    this.ws.onclose = () => {
    }
    // We want to handle any errors the websocket
    // might emit to prevent unneeded unhandled exceptions.
    this.ws.onerror = (err) => {
    }
  }

  emit (name, data) {
    this.send({
      e: name,
      d: data
    })
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data
    // TODO: isBinary: I don't think there is any time that data is a number.
    let isBinary = messageEvent.binary || (!(typeof data === 'string' || typeof data === 'number'))

    if (isBinary) {
      return
    }

    if (typeof data !== 'string') {
      return
    }

    let parsed
    try {
      parsed = JSON.parse(data)
    } catch (err) {
      return
    }

    if (exists(parsed, 'a')) {
      this._handleAction(parsed)
    } else if (exists(parsed, 's')) {
      this._handleActionResponse(parsed)
    } else if (exists(parsed, 'e')) {
      this._handleEvent(parsed)
    } else {
    }

    return
  }

  close (code, message) {
    this.ws.close(code, message)
  }

  terminate () {
    this.ws.terminate()
  }

  _handleError (err) {
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
      return
    }
    this._emit('error', err, true)
    this._closeMustHaveError = true
    this.close()
    if (!err) err = new Error('unknown, unspecified error')
    this._handleClose({
      code: null,
      reason: null,
      error: err
    })
  }

  _handleClose (closeEvent) {
    // Assure that _handleClose or _handleError emits an event only once.
    if (this._socketeerClosing) {
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
      return
    }
    this._socketeerClosing = true
    this._closeMustHaveError = false
    this._detachEvents()
    const eventName = (this._closeIsPause) ? 'pause' : 'close'
    this._emit(eventName, code, message, error)
  }

  _processQueue (msg, done) {
    if (!this.isOpen()) {
      this._messageQueue.pause()
      this._messageQueue.unshift(msg)
      return setImmediateShim(done)
    } else {
      return this.ws.send(msg, done)
    }
  }

  _resumeMessageQueue () {
    this._messageQueue.resume()
  }

  _clearMessageQueue () {
    this._messageQueue.kill()
  }

  send (obj) {
    let data
    try {
      data = JSON.stringify(obj)
    } catch (err) {
    }
    this._messageQueue.push(data)
  }

  _handleAction (data) {
    const handler = this._actions.get(data.a)
    if (!handler) {
      return this.send({
        i: data.i,
        s: ActionResponse.NONEXISTENT,
        d: ActionResponse.NONEXISTENT
      })
    }

    let handlerPromise
    try {
      handlerPromise = handler(data.d)
    } catch (err) {
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
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      // Non-connection closing error.
      return this._emit('error', new Error('action handler for ' + data.a + ' does not return a promise'))
    }

    handlerPromise.then((response) => {
      this.send({
        i: data.i,
        s: ActionResponse.OK,
        d: response
      })
    }).catch((err) => {
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
    const handler = this._actionPromises.get(data.i)
    // The timeout could have cleaned up the handler.
    if (!handler) return
    // Indicate to the action timeout that it should not do anything
    handler.finished = true
    if (handler.timeout) clearTimeout(handler.timeout)
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
    const handlers = this._sEvents.get(data.e)
    if (!handlers || !handlers.length) return
    for (let handler of handlers) {
      try {
        handler(data.d)
      } catch (err) {
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
    if (!this._sEvents.get(name)) this._sEvents.set(name, [])
    this._sEvents.get(name).push(handler)
  }

  action (name, handler, force) {
    if (typeof handler !== 'function') {
      throw new Error('action handler is not a function')
    }
    if (this._actions.get(name) && !force) {
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
