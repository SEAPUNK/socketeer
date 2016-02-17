'use strict'

const debug = require('debug')
const ClientAbstract = require('./ClientAbstract')

class ServerClient extends ClientAbstract {
  constructor (ws, server) {
    super()
    this._d = debug('socketeer:ServerClient')

    this._isReady = false
    this._handshakeOver = false

    // ClientAbstract will not emit the 'close' event with this set to true.
    // This is because we want to decide when the 'close' event is emitted:
    // Our custom _handleClose handler is going to emit a 'pause' event,
    // to indicate the session no longer connected, but the session reconnect
    // timeout will emit the real 'close' event.
    this._doNotEmitClose = true

    this.server = server
    this.ws = ws
    this.ip = ws._socket.remoteAddress
    this._d(`new ServerClient from IP address: ${this.ip}`)
    this._handshakePromise = new Promise((resolve, reject) => {
      this._handshakeResolve = resolve
      this._handshakeReject = reject
    })
    this._handshakeFinished = false
    this.id = this.server.pool.generateId()
    this._attachEvents()
    this._beginHandshake()
  }

  join (name) {
    return this.server.room.join(name, this)
  }

  leave (name) {
    return this.server.room.leave(name, this)
  }

  _beginHandshake () {
    this.ws.send(`socketeer:v${this.PROTOCOL_VERSION}:i${this.server._heartbeatInterval}`)
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data
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
        super._handleMessage(messageEvent)
      }
    }
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
    this._d('running session resume token query')
    this.server.pool.reserveNewToken().then((token) => {
      if (!this.isOpen()) return
      this._handshakeFinished = true
      this._handshakeResolve({
        isResume: false,
        newResumeToken: token
      })
    }).catch((err) => {
      this._handleError(err)
    })
  }

  _attemptSessionResume (token) {
    this._d('attempting session resume')
    if (!this._validateSessionResumeToken(token)) {
      return this._handleError('client sent invalid session resume token')
    }
    this.server.pool.attemptResume(token, this.ip).then((newToken) => {
      if (!this.isOpen()) return
      this._handshakeFinished = true
      this._handshakeResolve({
        isResume: true,
        newResumeToken: newToken
      })
    }).catch((err) => {
      this._handleError(err)
    })
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
    // Registers the client to the server.
    // This is not called during a session resume attempt.
    // This function is called ONLY from the server.

    // TODO: generate session resume token and send to client
    // TODO: Remove handshake resolve and rejects
    // TODO: Mark as ready.
    // TODO: Heartbeat loop.
    this.server.pool.add(this, this.id)
    this.server.room._joinAll(this)
    this.server.emit('connection', this)
  }

  _awaitHandshake () {
    return this._handshakePromise
  }



  _startHeartbeat () {
    this._d('starting heartbeat loop')
    this._heartbeatLoop = setTimeout(() => {
      if (!this.isOpen()) return
      this.ws.send('h')
      this._heartbeatTimeout = setTimeout(() => {
        if (!this.isOpen()) return
        this._d('heartbeat timeout called')
        this._handleError(new Error('heartbeat timeout'))
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

  _handleClose (closeEvent) {
    if (!this._isReady) {
      this.server.pool.unreserveId(this.id)
    }
    // TODO: Mark as inactive.
    // TODO: Unregister function.
    super._handleClose(closeEvent)
  }





}

module.exports = ServerClient
