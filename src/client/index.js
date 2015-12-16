import WebSocket from 'ws'
import ClientAbstract from '../common/client-abstract'
import debug from 'debug'
import {inspect} from 'util'
import maybeStack from 'maybestack'

export default class SocketeerClient extends ClientAbstract {
  /**
   * Creates the client.
   * Client immediately connects on intialization.
   * @see [ws.WebSocket]{@link https://github.com/websockets/ws/blob/master/doc/ws.md#new-wswebsocketaddress-protocols-options}
   * @extends ClientAbstract
   * @param  {String}       address                         Address to connect to.
   * @param  {String|Array} protocols                       Protocols to accept.
   * @param  {Object}       options={}                      Options to accept.
   * @param  {Number}       options.heartbeatTimeout=15000  Time to wait in ms for 'ping' event
   *                                                        before timing out the connection.
   * @param  {Number}       options.reconnectWait=5000      Time to wait in ms before re-establishing
   *                                                        connection when `reconnect()` is called.
   * @param  {Boolean}      options.failless=true           Whether Socketeer should handle unhandled 'error' events
   * @return {SocketeerClient} Client.
   */
  constructor (address, protocols, options = {}) {
    super()
    this._d = debug('socketeer:SocketeerClient')
    this._constructOpts = {
      address: address,
      protocols: protocols,
      options: options
    }
    this._d(`constructing websocket with options: ${inspect(this._constructOpts)}`)
    this.heartbeatTimeout = options.heartbeatTimeout || 15000
    this.reconnectWait = options.reconnectWait || 5000
    this.failless = (options.failless !== false)
    this._d(`heartbeat timeout set to ${this.heartbeatTimeout}`)
    this._d(`reconnect wait set to ${this.reconnectWait}`)
    this.closed = false
    this.ready = false
    this.ws = new WebSocket(address, protocols, options)
    this._attachEvents()
    if (this.failless) {
      this._d('[failless] adding client error handler')
      this.on('error', (err) => {
        this._d(`[failless] handling client error: ${maybeStack(err)}`)
      })
    }
  }

  /**
   * Attaches events to the socket. Listens to WebSocket's 'open' event once per connection,
   * and lets ClientAbstract handle the rest.
   * @private
   */
  _attachEvents () {
    this._d('attaching events')
    this.ws.once('open', this._handleOpen.bind(this))
    super._attachEvents()
  }

  /**
   * Handles heartbeats sent from the server by resetting the heartbeat timeout.
   * @private
   */
  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._resetHeartbeatTimeout()
    this.ws.send('h')
  }

  /**
   * Event handler for WebSocket's 'message' event.
   *
   * Handles messages sent from the server; ignores all messages if socket is
   * is in a "CLOSING" or "CLOSED" state.
   * @private
   * @param  data  WebSocket data.
   * @param  flags WebSocket data flags.
   */
  _handleMessage (data, flags) {
    this._d('handling message')
    if (!this.isOpen()) {
      this._d('ignoring message, as socket is not open')
      return
    }

    if (data === 'h') {
      this._d('message is heartbeat')
      this._handleHeartbeat()
      return
    }

    if (typeof data === 'string' && data.indexOf('hi') === 0) {
      this._d('message is heartbeat interval')
      this._d(`data: ${data}`)
      let reg = /^hi(.*)$/.exec(String(data))
      let interval = +reg[1]
      if (Number.isNaN(interval) || !interval) {
        // This means that the heartbeat interval data is invalid.
        // Terminate the connection, since we don't want to listen
        //  to anything more that they have to say.
        this._emit('error', new Error('invalid heartbeat interval from server'))
        this.kill()
        return
      }
      this.heartbeatInterval = interval
      this._d(`heartbeat interval set to ${this.heartbeatInterval}`)
      this._resetHeartbeatTimeout()
      return
    }

    super._handleMessage(data, flags)
  }

  /**
   * Resets the heartbeat timeout by stopping any existing timeout,
   * and starting a new one. If the timeout function runs, the 'timeout' event
   * is emitted from the client.
   * @private
   */
  _resetHeartbeatTimeout () {
    let timeoutPeriod = this.heartbeatInterval + this.heartbeatTimeout
    this._d(`resetting heartbeat timeout: ${timeoutPeriod}`)

    this._stopHeartbeatTimeout()

    this._heartbeatTimer = setTimeout(() => {
      this._d('heartbeat timeout called')
      // This means that the server took too long to send a timeout.
      this._emit('timeout')
      // Terminate the connection because it timed out: there's no
      //  point to handshaking a close, since that is also likely to
      //  time out.
      this.kill()
    }, timeoutPeriod)
  }

  /**
   * Stops the existing heartbeat timeout, if any.
   * @private
   */
  _stopHeartbeatTimeout () {
    this._d('trying to stop heartbeat timeout')
    if (this._heartbeatTimer) {
      this._d('stopping heartbeat timeout')
      clearTimeout(this._heartbeatTimer)
    }
  }

  /**
   * Handles the WebSocket 'open' event.
   *
   * This is where the client emits the '_open' and 'open' events.
   * This is also where the client's 'ready' parameter is set to true.
   * @todo protocol: timeout for before the 'hi' message
   * @todo protocol: don't 'ready' until the 'hi' message is received
   * @todo protocol: if not 'ready', then ignore all server messages
   *       (except for the heartbeat interval)
   * @private
   */
  _handleOpen () {
    this._d('handling open')
    this.ready = true
    this._emit('_open', this.isReconnection)
    this._emit('open', this.isReconnection)
  }

  /**
   * Handles the WebSocket 'close' event.
   *
   * This is where the client's 'ready' property is set to false,
   * and 'closed' property set to true.
   * @private
   * @param  code    Close code.
   * @param  message Close message.
   * @param  error   Error, if closed due to a socket error.
   */
  _handleClose (code, message, error) {
    this._d('handling close')
    this.ready = false
    this.closed = true
    this._stopHeartbeatTimeout()
    super._handleClose(code, message, error)
  }

  /**
   * Emits an event or an action, depending on the
   * existence of the callback argument.
   * @param  {String}   name      Action/event name.
   * @param             data      Action/event data.
   * @param  {Function} callback  Action callback for responses.
   * @throws Will throw an error if the client is not ready.
   */
  emit (name, data, callback) {
    this._d(`emitting ${name}`)
    if (!this.ready) throw new Error('client is not ready')
    super.emit(name, data, callback)
  }

  /**
   * Reconnects to the server.
   * Waits 'reconnectWait' ms before re-establishing connection,
   * unless 'immediate' is true.
   * Will not do anything if a reconnection is already scheduled.
   * @param  {Boolean} immediate  Whether to not wait before
   *                              re-establishing connection.
   * @throws Will throw an error if the connection hasn't closed yet.
   */
  reconnect (immediate) {
    this._d('trying reconnect')
    if (!this.closed) {
      this._d('not closed, not going to reconnect')
      throw new Error('client has not disconnected to reconnect yet')
    }
    if (this.willReconnect) return
    this.willReconnect = true
    let timeout = (immediate ? 0 : this.reconnectWait)
    this._d(`will reconnect in ${timeout} ms`)
    setTimeout(() => {
      this._d('reconnecting')
      this.willReconnect = false
      this.closed = false
      this.isReconnection = true
      let o = this._constructOpts
      this.ws = new WebSocket(o.address, o.protocols, o.options)
      this._attachEvents()
    }, timeout)
  }
}
