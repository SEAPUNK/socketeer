'use strict'

const WebSocket = require('ws')
const ClientAbstract = require('./ClientAbstract')
const debug = require('debug')
const {inspect} = require('util')
const maybestack = require('maybestack')

class Client extends ClientAbstract {
  constructor (address, options = {}) {
    super()
    this._d = debug('socketeer:Client')
    this._constructOpts = [address, options.protocols, options.ws]
    this._d(`constructing websocket with options: ${inspect(this._constructOpts)}`)

    this.heartbeatTimeout = options.heartbeatTimeout || 15000
    this.reconnectWait = options.reconnectWait || 5000
    this.failless = (options.failless !== false)
    this._d(`heartbeat timeout set to ${this.heartbeatTimeout}`)
    this._d(`reconnect wait set to ${this.reconnectWait}`)
    this._d(`failless set to ${this.failless}`)

    this.closed = false
    this.ready = false
    this.isResume = false

    if (this.failless) {
      this._d('[failless] adding client error handler')
      this.on('error', (err) => {
        this._d(`[failless] handling client error: ${maybestack(err)}`)
      })
    }

    this._createWebsocket()
    this._attachEvents()
  }

  _createWebsocket () {
    let o = this._constructOpts
    this.ws = new WebSocket(o[0], o[1], o[2])
  }

  _attachEvents () {
    this._d('attaching events')
    this.ws.once('open', this._handleOpen.bind(this))
    super._attachEvents()
  }

  _handleOpen () {
    this._d('handling open')
    this._emit('_open', this.isReconnection)
    this._handshakeStage = 1
    this._beginHandshake()
  }

  _beginHandshake () {
    this.ws.send('v' + this._PROTOCOL_VERSION)
  }

  _handleMessage (data, flags) {
    this._d('handling message')
    if (!this.isOpen()) {
      this._d('ignoring message, as socket is not open')
      return
    }

    switch (this._handshakeStage) {
      case 1:
        return this._handleStage1(data, flags)
      case 2:
        return this._handleStage2(data, flags)
      default:
        break
    }

    if (data === 'h') {
      this._d('message is heartbeat')
      this._handleHeartbeat()
      return
    }

    super._handleMessage(data, flags)
  }

  _handleStage1 (data, flags) {
    this._d('handling handshake stage 1')
    if (typeof data !== 'string' || data.indexOf('hi') !== 0) {
      this._d('stage 0 unexpected data, killing connection')
      return this.kill()
    }
    this._d('message is heartbeat interval')
    let reg = /^hi(.*)$/.exec(String(data))
    let interval = Math.floor(+reg[1])
    if (Number.isNaN(interval) || interval < 1 || interval > 2147483647) {
      this._emit('error', new Error('invalid heartbeat interval from server'))
      this.kill()
      return
    }
    this.heartbeatInterval = interval
    this._d(`heartbeat interval set to ${this.heartbeatInterval}`)
    this._resetHeartbeatTimeout()
    this._handshakeSessionResume()
  }

  _handshakeSessionResume () {
    this._handshakeStage = 2
    if (this._isResuming) {
      this._d('sending session resume token: ' + this._resumeToken)
      this.ws.send('r@' + this._resumeToken)
    } else {
      this._d('querying for session resume token')
      this.ws.send('r?')
    }
  }

  _handleStage2 (data, flags) {
    this._d('handling handshake stage 2')
    if (this.isResume) {
      if (typeof data === 'string' && data.indexOf('r+') === 0) {
        let reg = /^r\+(.*)$/.exec(String(data))
        let token = String(reg[1])
        if (token.length < 5 || token.length > 200) {
          this._d('resume token length invalid, killing connection')
          return this.kill()
        } else {
          this._d('session resume ok with new token: ' + token)
          this._resumeToken = token
          this.isResume = true
        }
      } else if (data === 'r-') {
        this._d('session resume failed')
        this.isResume = false
        this._resumeToken = null
      } else {
        this._d('got unexpected data, killing connection')
        return this.kill()
      }
    } else {
      if (data === 'r') {
        this._d('server does not support session resuming')
      } else if (typeof data === 'string' && data.indexOf('r:') === 0) {
        let reg = /^r\:(.*)$/.exec(String(data))
        let token = String(reg[1])
        if (token.length < 5 || token.length > 200) {
          this._d('resume token length invalid, killing connection')
          return this.kill()
        } else {
          this._d('set resume token: ' + token)
          this._resumeToken = token
          this.isResume = false
        }
      }
    }
    this._markReady()
  }

  _markReady () {
    this._handshakeStage = null
    this.ready = true
    this._emit('open', this.isReconnection)
  }













  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._resetHeartbeatTimeout()
    this.ws.send('h')
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
      this._createWebsocket()
      this._attachEvents()
    }, timeout)
  }
}

module.exports = Client
