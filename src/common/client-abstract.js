import {EventEmitter} from 'events'
import {inspect} from 'util'
import {ActionResponse} from './enums'
import maybeStack from 'maybestack'
import exists from 'deep-exists'

export default class ClientAbstract extends EventEmitter {
  /**
   * Client abstraction class for both {@link SocketeerClient} and {@link SocketeerServerClient}.
   * Not meant to be constructed directly.
   * @extends EventEmitter
   * @see [EventEmitter]{@link https://nodejs.org/api/events.html#events_class_events_eventemitter}
   * @return {ClientAbstract} Socketeer client abstraction.
   */
  constructor () {
    super()
    this._events = {}
    this._actions = {}
    this._actionCallbacks = {}
    this.data = {}
  }

  /**
   * Emits an event through its EventEmitter extension.
   * @see [EventEmitter.emit]{@link https://nodejs.org/api/events.html#events_emitter_emit_event_arg1_arg2}
   * @param name Event name
   * @param data Event data
   * @private
   */
  _emit (name, data) {
    super.emit(name, data)
  }

  /**
   * Attaches events to the socket. Listens to WebSocket's 'message', 'error',
   * and 'close' events.
   * @private
   */
  _attachEvents () {
    this._d('[super] attaching events')
    this.ws.on('message', this._handleMessage.bind(this))
    this.ws.on('error', this._handleError.bind(this))
    this.ws.on('close', this._handleClose.bind(this))
  }

  /**
   * Sends JSON.stringify-ed data to socket.
   * @see WebSocket.send
   * @param obj Object to `JSON.stringify` and send
   */
  send (obj) {
    let data = JSON.stringify(obj)
    this._d(`[super] sending data: ${data}`)
    this.ws.send(data)
  }

  /**
   * Event handler for WebSocket's 'error' event.
   *
   * This function emits a 'close' event immediately after to follow
   * node.js's net.Socket handling of connections. The ws library does not emit
   * a 'close' event after emitting an 'error' event.
   * @private
   * @param  {Error} err Error that occured.
   */
  _handleError (err) {
    this.d(`[super] handling error: ${maybeStack(err)}`)
    this._emit('error', err)
    this._handleClose(null, null, err)
  }

  /**
   * Event handler for WebSocket's 'close' event, as well as the 'error' event's
   * aftermath.
   * @private
   * @param           code        Socket close code.
   * @param           message     Socket close event.
   * @param  {Error}  error=null  Socket error, if socket closed because of an error.
   */
  _handleClose (code, message, error = null) {
    this._d(`[super] handling close: ` +
      `code: ${inspect(code)}, ` +
      `message: ${inspect(message)}, ` +
      `error: ${maybeStack(error)}`)
    this._emit('close', code, message, error)
  }

  /**
   * Event handler for WebSocket's 'message' event.
   *
   * Ignores all messages sent from the server if the socket is in a 'CLOSED'
   * or 'CLOSING' state, although this should never happen, as the classes that
   * extend this class should handle it.
   * @todo Handle data other than strings
   * @private
   * @param  data   WebSocket data.
   * @param  flags  WebSocket data flags.
   */
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
      // @TODO handle data other than strings
      return
    }

    try {
      this._d(`parsing message JSON: ${data}`)
      data = JSON.parse(data)
    } catch (err) {
      this._d(`JSON parse failed, ignoring: ${maybeStack(err)}`)
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

  /**
   * Handles actions sent from the socket.
   * @todo Convert into a suspend function
   * @private
   * @param data Data sent from the socket.
   * @throws Will throw any error that the action handler throws, via call or callback.
   */
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
          this._d(`action handler ${data.a} errored (callback fail), responding (${maybeStack(err)})`)
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
      this._d(`action handler errored (call fail), responding (${maybeStack(err)})`)
      this.send({
        i: data.i,
        s: ActionResponse.ERROR,
        d: ActionResponse.ERROR
      })
      throw err
    }
  }

  /**
   * Handles action responses sent from the socket.
   * @private
   * @param data Data sent from the socket.
   */
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

  /**
   * Handles events sent from the socket.
   * @private
   * @param data Data sent from the socket.
   */
  _handleEvent (data) {
    this._d(`handling event ${data.e}`)
    if (!this._events[data.e]) return
    let handlers = this._events[data.e]
    this._d(`event handlers for '${data.e}' exist, there are ${handlers.length} handlers`)
    handlers.forEach((evt) => setTimeout(() => evt(data.d)))
  }
}
