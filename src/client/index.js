import WebSocket from 'ws'
import ClientAbstract from '../common/client-abstract'
import debug from 'debug'
import {inspect} from 'util'

export default class SocketeerClient extends ClientAbstract {
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
    this._d(`heartbeat timeout set to ${this.heartbeatTimeout}`)
    this._d(`reconnect wait set to ${this.reconnectWait}`)
    this.closed = false
    this.ready = false
    this.ws = new WebSocket(address, protocols, options)
    this._attachEvents()
  }

  _attachEvents () {
    this._d('attaching events')
    this.ws.on('open', this._handleOpen.bind(this))
    super._attachEvents()
  }

  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._resetHeartbeatTimeout()
    this.ws.send('h')
  }

  _handleMessage (data, flags) {
    this._d('handling message')
    if (
      this.ws.readyState === this.ws.CLOSING ||
      this.ws.readyState === this.ws.CLOSED
    ) {
      this._d('ignoring message, as socket is closing')
      return
    }

    if (data === 'h') {
      this._d('message is heartbeat')
      this._handleHeartbeat()
      return
    }

    if (String(data).indexOf('hi') === 0) {
      this._d('message is heartbeat interval')
      this._d(`data: ${data}`)
      let reg = /^hi(.*)$/.exec(String(data))
      let interval = +reg[1]
      if (Number.isNaN(interval) || !interval) {
        // This means that the heartbeat interval data is invalid.
        // Termiante the connection, since we don't want to listen 
        //  to anything more that they have to say.
        this._emit('error', new Error('invalid heartbeat interval from server'))
        this.kill()
        return
      }
      this.heartbeatInterval = interval
      this._d `heartbeat interval set to ${this.heartbeatInterval}`
      this._resetHeartbeatTimeout()
      return
    }

    super._handleMessage(data, flags)
  }

  _resetHeartbeatTimeout () {
    let timeoutPeriod = this.heartbeatInterval + this.heartbeatTimeout
    this._d(`resetting heartbeat timeout: ${timeoutPeriod}`)

    if (this._heartbeatTimer) {
      this._d('clearing existing heartbeat timer')
      clearTimeout(this._heartbeatTimer)
    }

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

  _stopHeartbeatTimeout () {
    this._d('stopping heartbeat timeout')
    clearTimeout(this._heartbeatTimer)
  }

  _handleOpen () {
    this._d('handling open')
    /**
     * @todo  protocol: timeout for before the 'hi' message
     * @todo  protocol: don't 'ready' until 'hi' message is received
     * @todo  protocol: if not 'ready', then ignore all server messages
     *        (except for the heartbeat interval)
     */
    this.ready = true
    this._emit('_open', this.isReconnection)
    this._emit('open', this.isReconnection)
  }

  _handleClose (code, message, error) {
    this.d('handling close')
    this.ready = false
    this.closed = true
    this._stopHeartbeatTimeout()
    super._handleClose(code, message, error)
  }

  emit (name, data, callback) {
    this._d(`emitting ${name}`)
    if (!this.ready) throw new Error('client is not ready')
    super.emit(name, data, callback)
  }

  reconnect (immediate) {
    this._d('trying reconnect')
    if (!closed) {
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