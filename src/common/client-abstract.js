import {EventEmitter} from 'events'
import {inspect} from 'util'
import {ActionResponse} from './enums'
import exists from 'deep-exists'

export default class ClientAbstract extends EventEmitter {
  constructor () {
    super()
    this._events = {}
    this._actions = {}
    this._actionCallbacks = {}
    this.data = {}
  }

  _emit (name, data) {
    super.emit(name, data)
  }

  _attachEvents () {
    this._d('[super] attaching events')
    this.ws.on('message', this._handleMessage.bind(this))
    this.ws.on('error', this._handleError.bind(this))
    this.ws.on('close', this._handleClose.bind(this))
  }

  send (obj) {
    let data = JSON.stringify(obj)
    this._d(`[super] sending data: ${data}`)
    this.ws.send(data)
  }

  _handleError (err) {
    this.d(`[super] handling error: ${inspect(err)}`)
    this._emit('error', err)
    /*
      We are emitting 'close' as well because the ws library does
      not handle errors like net.Socket: error means that an error occured
      and the socket is closed: there will be no 'close' event.

      net.Socket's documentation states that if there is an 'error' event,
      then the socket is pretty much dead. There is no way to recover.
     */
    this._handleClose(null, null, err)
  }

  _handleClose (code, message, error = null) {
    this._d(`[super] handling close: `+
      `code: ${inspect(code)}, `+
      `message: ${inspect(message)}, `+
      `error: ${(exists(error, 'stack')) ? error.stack : error}`)
    this._emit('close', code, message, error)
  }

  _handleMessage (data, flags) {
    this._d('[super] handling message')
    if (
      this.ws.readyState === this.ws.CLOSING ||
      this.ws.readyState === this.ws.CLOSED
    ) {
      // The classes that extend ClientAbstract should be properly handling the
      // closed socket message, not ClientAbstract itself
      this._d('ignoring message, as socket is closing (this should never happen on super!)')
      return
    }

    if (typeof data !== 'string') {
      this._d('message is not string, ignoring')
      /** @todo  handle data other than JSON */
      return
    }

    try {
      this._d(`parsing message JSON: ${data}`)
      data = JSON.parse(data)
    } catch (err) {
      this._d(`JSON parse failed, ignoring: ${(exists(err, 'stack')) ? err.stack : err}`)
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
    try {
      this._d('calling action handler')
      handler(data.d, (err, response) => {
        if (err) {
          this._d(`action handler ${data.a} errored (callback fail), responding (${(exists(err, 'stack')) ? err.stack : err})`)
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
      this._d(`action handler errored (call fail), responding (${exists(err, 'stack') ? err.stack : err})`)
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionRepsonse.ERROR
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
    handlers.forEach((evt) => {
      setTimeout(() => {
        evt(data.d)
      })
    })
  }
}
