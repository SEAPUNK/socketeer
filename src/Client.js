'use strict'

const debug = require('debug')
const maybestack = require('maybestack')
const WebSocket = require('ws')
const Promise = require('bluebird')
const ClientAbstract = require('./ClientAbstract')

class Client extends ClientAbstract {
  constructor (address, options) {
    super()

    if (!options) options = {}
    const _d = this._d = debug('socketeer:Client')

    this._wsConstructArgs = [address, options.protocols, options.ws]

    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    _d(`heartbeat timeout set to ${this._heartbeatTimeout}`)

    this._handshakeTimeout = options.handshakeTimeout || 10000
    _d(`handshake timeout set to ${this._handshakeTimeout}`)

    this._reconnectWait = options.reconnectWait || 5000
    _d(`reconnect wait set to ${this._reconnectWait}`)

    this._failless = (options.failless !== false)
    _d(`failless set to ${this._failless}`)

    this._isReady = false
    this._isReconnection = false
    this._handshakeStep = 0
    this._resumePromiseResolve = null
    this._resumeToken = null
    this._handshakeTimer = null

    if (this._failless) {
      _d('[failless] adding client error handler')
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`)
      })
    }

    this._createWebsocket()
  }

  _createWebsocket () {
    this._d('creating websocket')
    this.ws = WebSocket.apply(null, this._wsConstructArgs)
    this._attachEvents()
  }

  _attachEvents () {
    this._d('attaching events')
    this.ws.onopen = () => this._handleOpen()

    super._attachEvents()
  }

  _detachEvents () {
    this._d('detaching events')
    this.ws.onopen = () => {
      this._d('warning: a detached websocket emitted the "open" event')
    }

    super._detachEvents()
  }

  _handleClose (closeEvent) {
    this._isReady = false
    super._handleClose(closeEvent)
  }

  _handleOpen () {
    this._d('handling open')
    // Right now, we can't tell whether we can resume this session or not,
    //  but we can tell them whether it can be a session resume.
    this._emit('unreadyOpen', this._isReconnection)
    this._startHandshakeTimeout()
  }

  _startHandshakeTimeout () {
    this._d('starting handshake timeout')
    this._handshakeTimer = setTimeout(() => {
      this._failHandshake()
    }, this._handshakeTimeout)
  }

  _failHandshake () {
    // Don't fail the handshake if the connection is already ready.
    if (this.isReady) return
    this._d('failing handshake')
    this._handleError('handshake timed out')
  }

  _stopHandshakeTimeout () {
    if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
    delete this._handshakeTimer
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data
    const _d = this._d
    // TODO: Issue #37
    if (!this.isOpen()) {
      _d('message handler ignored due to closed socket')
      return
    }

    _d('handling message')
    if (!this._isReady) {
      _d('client not ready, handling handshake messages')
      switch (this._handshakeStep) {
        case 0:
          this._handshakeStep = 1
          return this._handleServerHandshake(data)
        case 1:
          this._handshakeStep = 2
          return this._handleHandshakeResponse(data)
        case 2:
          return this._handleError('server sent unexpected handshake message, although we are done listening')
        default:
          return this._handleError(`[internal] unknown handshake step: ${this._handshakeStep}`)
      }
    } else {
      if (data === 'h') {
        _d('message is heartbeat')
        this._handleHeartbeat()
        return
      } else {
        super._handleMessage(messageEvent)
      }
    }
  }

  _handleServerHandshake (data) {
    const _d = this._d
    _d('handling server handshake (first server message)')
    if (typeof data !== 'string') {
      return this._handleError(new Error('server handshake data is not a string'))
    }

    const parts = data.split(':')
    /*
      The first part of the message should be the string: 'socketeer'.
      This indicates that the server is in fact a socketeer server.
     */
    if (parts[0] !== 'socketeer') {
      return this._handleError(new Error('handshake: server is not a socketeer server'))
    }

    /*
      The second part of the message should be the server protocol version.
      This is to ensure compatibility.

      See the protocol docs for validation requirements.
     */
    if (
      typeof parts[1] !== 'string' ||
      parts[1].indexOf('v') !== 0
    ) {
      return this._handleError(new Error('handshake: version string is invalid'))
    }
    const serverVersion = Math.floor(+parts[1].replace(/^v/, ''))
    if (
      Number.isNaN(parts[1]) ||
      parts[1] <= 0
    ) {
      return this._handleError(new Error('handshake: version number is invalid'))
    }

    if (serverVersion !== this.PROTOCOL_VERSION) {
      return this.ws.send(`v${this.PROTOCOL_VERSION}`, (err) => {
        if (err) {
          return this._handleError(new Error('handshake: failed sending protocol version to server (either way, the server protocol is incompatible with the client)'))
        } else {
          return this._handleError(new Error(`handshake: server protocol version is incompatible with ours. server: ${serverVersion} - client: ${this.PROTOCOL_VERSION}`))
        }
      })
    }

    /*
      The third part of the message should be the heartbeat interval set message.
      This is to make heartbeats work.

      See the protocol docs for validation requirements.
     */
    if (
      typeof parts[2] !== 'string' ||
      parts[2].indexOf('i') !== 0
    ) {
      return this._handleError(new Error('handshake: heartbeat interval set message is invalid'))
    }
    const serverHeartbeatInterval = Math.floor(+parts[2].replace(/^i/, ''))
    if (
      Number.isNaN(parts[2]) ||
      parts[2] < 0 ||
      parts[2] > 2147483647
    ) {
      return this._handleError(new Error('handshake: heartbeat interval is an invalida number'))
    }

    this._heartbeatInterval = serverHeartbeatInterval
    this._d(`heartbeat interval set to ${this._heartbeatInterval}`)

    /*
      Now we send our handshake message.
     */
    if (this._resumePromiseResolve) {
      this._d(`sending session resume token: ${this._resumeToken}`)
      const token = this._resumeToken
      this._resumeToken = null
      this.ws.send(`r@${token}`)
    } else {
      this._d('querying for session resume token')
      this.ws.send('r?')
    }
  }

  _handleHandshakeResponse (data) {
    const _d = this._d
    _d('handling server handshake (second server message)')
    // Stop the handshake timeout.
    this._stopHandshakeTimeout()
    if (typeof data !== 'string') {
      this._handleError(new Error('server handshake data is not a string'))
      return
    }

    const parts = data.split(':')
    /*
      The first part should be either 'err' or 'ok'.
      If err, then handle the error.
     */
    if (
      parts[0] === 'ok'
    ) {
      // Do nothing.
    } else if (
      parts[0] === 'err'
    ) {
      return this._handleError(new Error(`handshake finalization: server encountered an error (${data})`))
    } else {
      return this._handleError(new Error('handshake finalization: unexpected data received'))
    }

    /*
      The second part should be the session resume status.
      Either way, the other functions take care of this.
     */
    if (this._resumePromiseResolve) {
      this._handlePotentialSessionResume(parts)
    } else {
      this._handleSetSessionResume(parts)
    }
  }

  _handlePotentialSessionResume (parts) {
    /*
      Check the session resume status. It must be either - or +
     */
    if (
      parts[1] === '-'
    ) {
      this._d('session resume failed')
      this._ready = true // so _handleClose does not emit an error
      this.close()
    } else if (
      parts[1] === '+'
    ) {
      // This means we have also have a new session resume token.
      const newToken = parts[2]
      if (!this._validateSessionResumeToken(newToken)) {
        return this._handleError(new Error('handshake finalization: session resumed, but invalid new session resume token'))
      } else {
        this._d(`session resumed OK with new token: ${newToken}`)
        this._resumeToken = newToken
        this._finalizeHandshake(true)
      }
    } else {
      return this._handleError(new Error('handshake finalization: invalid session resume status'))
    }
  }

  _handleSetSessionResume (parts) {
    /*
      Check the session resume status. It must be either y or n
     */
    if (
      parts[1] === 'y'
    ) {
      // This means we also have a session resume token.
      const newToken = parts[2]
      if (!this._validateSessionResumeToken(newToken)) {
        return this._handleError(new Error('handshake finalization: invalid new session resume token'))
      } else {
        this._d(`new resume token: ${newToken}`)
        this._resumeToken = newToken
        this._finalizeHandshake(false)
      }
    } else if (
      parts[1] === 'n'
    ) {
      this._d('server does not support session resuming')
      this._finalizeHandshake(false)
    } else {
      return this._handleError(new Error('handshake finalization: invalid session resume status'))
    }
  }

  _finalizeHandshake (isSessionResume) {
    if (!isSessionResume) this._clearMessageQueue()
    this._isReady = true
    this._resumeMessageQueue()
    if (!isSessionResume) this._emit('open', this._isReconnection)
    if (isSessionResume) this._resolveSessionResume(true)
  }

  _resolveSessionResume (isOkay) {
    const resolve = this._resumePromiseResolve
    this._resumePromiseResolve = null
    resolve(isOkay)
  }

  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._resetHeartbeatTimeout()
    this.ws.send('h')
    this._emit('ping')
  }

  _resetHeartbeatTimeout () {
    const timeoutPeriod = this._heartbeatInterval + this._heartbeatTimeout
    this._d(`resetting heartbeat timeout: ${timeoutPeriod}`)

    this._stopHeartbeatTimeout()

    this._heartbeatTimer = setTimeout(() => {
      this._d('heartbeat timeout called')
      this._handleError(new Error('heartbeat timeout'))
    }, timeoutPeriod)
  }

  _stopHeartbeatTimeout () {
    this._d('stopping heartbeat timeout')
    if (this._heartbeatTimer) clearTimeout(this._heartbeatTimer)
  }

  resume () {
    return new Promise((resolve, reject) => {
      this._d('attempting session resume')
      if (!this.isClosed()) {
        this._d('has not closed, nothing to resume')
        return reject(new Error('client has not disconnected to resume session yet'))
      }

      if (!this._resumeToken) {
        this._d('no resume token, nothing to resume')
        return resolve(false)
      }

      this._resumePromiseResolve = resolve
      this._doReconnect()
    })
  }

  reconnect (immediate) {
    if (!this.isClosed()) {
      throw new Error('client has not disconnected to reconnect yet')
    }
    // Prevent duplicate reconnection attempts.
    if (!this._willReconnect) return
    this._willReconnect = true
    // Clear out the resume token because
    // we are not going to resume the session.
    this._resumeToken = null
    const timeout = (immediate) ? 0 : this._reconnectWait
    this._d(`will reconnect in ${timeout} ms`)
    setTimeout(() => {
      this._doReconnect()
    }, timeout)
  }

  _doReconnect () {
    this._d('reconnecting')
    this._socketeerClosing = false
    this._handshakeStep = 0
    this._willReconnect = false
    this._isReconnection = true
    this._createWebsocket()
  }
}

module.exports = Client
