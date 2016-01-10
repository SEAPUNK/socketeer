import {EventEmitter} from 'events'
import {inspect} from 'util'
import {ActionResponse} from './enums'
import maybestack from 'maybestack'
import exists from 'deep-exists'

export default class ClientAbstract extends EventEmitter {
  constructor () {
    super()
    this._events = {}
    this._actions = {}
    this._actionCallbacks = {}
    this.data = {}
    this._currentActionId = 0
    this._PROTOCOL_VERSION = 1
  }

  _emit (name, ...args) {
    super.emit.apply(this, [name].concat(args))
  }

  _attachEvents () {
    this._d('[super] attaching events')
    this._wsMessageHandler = this._handleMessage.bind(this)
    this.ws.on('message', this._wsMessageHandler)
    this._wsErrorHandler = this._handleError.bind(this)
    this.ws.on('error', this._wsErrorHandler)
    this._wsCloseHandler = this._handleClose.bind(this)
    this.ws.on('close', this._wsCloseHandler)
  }

  send (obj) {
    let data = JSON.stringify(obj)
    this._d(`[super] sending data: ${data}`)
    this.ws.send(data)
  }

  _handleError (err) {
    this._d(`[super] handling error: ${maybestack(err)}`)
    this._emit('error', err)
    this.close(1011, 'Internal Error') // Code 1011 is used for internal errors per RFC
    this._handleClose(null, null, err)
  }

  _handleClose (code, message, error = null) {
    this._d(`[super] handling close: ` +
      `code: ${inspect(code)}, ` +
      `message: ${inspect(message)}, ` +
      `error: ${maybestack(error)}`)
    this.ws.removeListener('message', this._wsMessageHandler)
    this.ws.removeListener('error', this._wsErrorHandler)
    // We want to handle any errors the websocket might give us
    // to prevent any unneeded unhandled exceptions.
    this.ws.on('error', this._dummyErrorHandler)
    this.ws.removeListener('close', this._wsCloseHandler)
    this._emit('close', code, message, error)
  }

  _dummyErrorHandler (err) {
    this._d(`[super] dummy error handling ${maybestack(err)}`)
  }

  _handleMessage (data, flags) {
    this._d('[super] handling message')
    if (!this.isOpen()) {
      // The classes that extend ClientAbstract should be properly handling the
      // closed socket message, not ClientAbstract itself
      this._d('ignoring message, as socket is not open (this should never happen on super!)')
      return
    }

    if (typeof data !== 'string') {
      this._d('message is not string, ignoring')
      // @TODO handle data other than strings
      return
    }

    try {
      this._d(`parsing message JSON: ${data}`)
      data = JSON.parse(data)
    } catch (err) {
      this._d(`JSON parse failed, ignoring: ${maybestack(err)}`)
      return
    }

    if (exists(data, 'a')) {
      this._d('data is action')
      this._handleAction(data)
      return
    } else if (exists(data, 's')) {
      this._d('data is action response')
      this._handleActionResponse(data)
      return
    } else if (exists(data, 'e')) {
      this._d('data is event')
      this._handleEvent(data)
      return
    } else {
      this._d('data is unknown, ignoring')
      return
    }
  }

  _handleAction (data) {
    this._d(`handling action ${data.a}`)
    let handler = this._actions[data.a]
    if (!handler) {
      this._d('action handler does not exist')
      return this.send({
        i: data.i,
        s: ActionResponse.NONEXISTENT,
        d: ActionResponse.NONEXISTENT
      })
    }

    // @TODO use suspend instead
    try {
      this._d('calling action handler')
      handler(data.d, (err, response) => {
        if (err) {
          this._d(`action handler ${data.a} errored (callback fail), responding (${maybestack(err)})`)
          this.send({
            i: data.i,
            s: ActionResponse.ERROR,
            d: ActionResponse.ERROR
          })
          throw err
        } else {
          this._d(`action handler ${data.a} called back, responding`)
          return this.send({
            i: data.i,
            s: ActionResponse.OK,
            d: response
          })
        }
      })
    } catch (err) {
      this._d(`action handler errored (call fail), responding (${maybestack(err)})`)
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      throw err
    }
  }

  _handleActionResponse (data) {
    this._d(`handling action response ${data.i}`)
    let handler = this._actionCallbacks[data.i]
    if (!handler) return
    this._d('response handler exists, continuing')
    setTimeout(() => {
      this._d(`determining error from status: ${data.s}`)
      let err
      if (data.s !== ActionResponse.OK) {
        switch (data.s) {
          case ActionResponse.ERROR:
            err = new Error('a server error occured')
            break
          case ActionResponse.NONEXISTENT:
            err = new Error('action does not exist')
            break
          default:
            err = new Error(`a non-OK response was received: ${data.s}`)
        }
      }
      this._d(`calling action response handler`)
      handler(err, data.d)
    })
  }

  _handleEvent (data) {
    this._d(`handling event ${data.e}`)
    if (!this._events[data.e]) return
    let handlers = this._events[data.e]
    this._d(`event handlers for '${data.e}' exist, there are ${handlers.length} handlers`)
    handlers.forEach((evt) => setTimeout(() => evt(data.d)))
  }

  event (name, handler) {
    this._d(`defining event handler for ${name}`)
    if (!this._events[name]) {
      this._events[name] = []
    }
    this._events[name].push(handler)
  }

  action (name, handler, force) {
    this._d(`defining action handler for ${name}`)
    if (this._actions[name] && !force) {
      this._d('action handler is already defined')
      throw new Error('action is already defined')
    }
    this._actions[name] = handler
  }

  emit (name, data, callback) {
    this._d(`[super] emitting: ${name} - typeof callback: ${typeof callback}`)
    if (typeof callback === 'function') {
      this._emitAction(name, data, callback)
    } else {
      this._emitEvent(name, data)
    }
  }

  close (code, message) {
    this._d('closing connection')
    this.ws.close(code, message)
  }

  kill () {
    this._d('killing connection')
    this.ws.terminate()
  }

  _emitEvent (name, data) {
    this._d(`[super] emitting event: ${name}`)
    this.send({
      e: name,
      d: data
    })
  }

  _emitAction (name, data, callback) {
    this._d(`[super] emitting action: ${name}`)
    let id = this._generateActionId()
    this._actionCallbacks[id] = callback
    this.send({
      i: id,
      a: name,
      d: data
    })
  }

  _generateActionId () {
    this._d(`generating action id: ${this._currentActionId}`)
    return this._currentActionId++
  }

  isOpen () {
    return this.ws.readyState === this.ws.OPEN
  }

  isClosed () {
    return (
      this.ws.readyState === this.ws.CLOSING ||
      this.ws.readyState === this.ws.CLOSED
    )
  }
}
