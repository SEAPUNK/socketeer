'use strict'

const debug = require('debug')
const ClientAbstract = require('./ClientAbstract')

class ServerClient extends ClientAbstract {
  constructor (ws, server) {
    super()
    this._isReady = false
    this._handshakeOver = false
    this.ws = ws
    this._d = debug('socketeer:ServerClient')
    this.ip = ws._socket.remoteAddress
    this._d(`new ServerClient from IP address: ${this.ip}`)
    this.server = server
    this._handshakePromise = new Promise((resolve, reject) => {
      this._handshakeResolve = resolve
      this._handshakeReject = reject
    })
    this._beginHandshake()
  }

  _beginHandshake () {
    this.ws.send(`socketeer:v${this.PROTOCOL_VERSION}:i${this.server._heartbeatInterval}`)
  }

  _replaceSocket (ws) {
    this._d(`hot-swapping websockets for ServerClient id ${ws}`)
    // TODO: Detach current ws's events.
    this.ws = ws
    this.ip = ws._socket.remoteAddress
    this._d(`hot-swapped websocket's IP address: ${this.ip}`)
    // TODO: Attach this websocket's events.
    // TODO: Resume the message feed.
  }

  _register () {
    // TODO: Remove handshake resolve and rejects
    // TODO: Mark as ready.
    this.server.pool.add(this, this.id)
    this.server.room._joinAll(this)
    this.server.emit('connection', this)
  }

  _awaitHandshake () {
    return this._handshakePromise
  }

  join (name) {
    return this.server.room.join(name, this)
  }

  leave (name) {
    return this.server.room.leave(name, this)
  }

  _startHeartbeat () {
    this._d('starting heartbeat loop')
    this._heartbeatLoop = setTimeout(() => {
      if (!this.isOpen()) return
      this.ws.send('h')
      this._heartbeatTimeout = setTimeout(() => {
        if (!this.isOpen()) return
        this._emit('timeout')
        this.close()
      }, this.server._heartbeatTimeout)
    }, this.server._heartbeatInterval)
  }

  _stopHeartbeat () {
    this._d('stopping heartbeat loop')
    clearTimeout(this._heartbeatLoop)
    clearTimeout(this._heartbeatTimeout)
  }

  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._stopHeartbeat()
    this._startHeartbeat()
  }

  _handleClose (code, message, error) {
    // TODO: Mark as inactive.
    // TODO: Unregister function.
    super._handleClose(code, message, error)
  }

  _handleHandshakeMessage (data) {
    const _d = this._d
    _d('handling client handshake message')
    if (typeof data !== 'string') {
      return this._handleError(new Error('bad handshake message from client'))
    }
    const parts = data.split(':')
    // There is only one part to the client handshake message right now:
    //  The session resume attempt/token query.
    if (
      parts[0].indexOf('r') !== 0
    ) {
      return this._handleError(new Error('client sent unexpected handshake message'))
    }

    // Determine whether it's a query or a resume attempt.
    if (
      parts[0].indexOf('?') === 1
    ) {
      // It is a query.
      this._querySessionResume()
    } else if (
      parts[0].indexOf('@') === 1
    ) {
      // It is a session resume attempt.
      this._attemptSessionResume(parts[0].replace(/^r\@/, ''))
    } else {
      return this._handleError(new Error('client sent badly formatted session resume message'))
    }
  }

  _querySessionResume () {
    // TODO: ClientPool functions
  }

  _attemptSessionResume (token) {
    // TODO: ClientPool functions
    // TODO: If resuming, detach event listeners from this ServerClient instance
  }

  _handleMessage (data, flags) {
    const _d = this._d
    if (!this.isOpen()) {
      _d('message handler ignored due to closed socket')
      return
    }

    _d('handling message')
    if (!this._isReady) {
      if (this._handshakeOver) {
        return this._handleError('client sent an extraneous message during handshake')
      }
      this._handshakeOver = true
      this._handleHandshakeMessage(data)
    } else {
      if (data === 'h') {
        this._handleHeartbeat()
      } else {
        super._handleMessage(data, flags)
      }
    }
  }
}

module.exports = ServerClient
