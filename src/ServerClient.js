'use strict'

const debug = require('debug')
const ClientAbstract = require('./ClientAbstract')

class ServerClient extends ClientAbstract {
  constructor (ws, resumeToken, id, ip, heartbeatInterval, server) {
    super()
    this._d = debug('socketeer:ServerClient')

    this.server = server
    this.id = id
    this._heartbeatInterval = heartbeatInterval
    this.ws = ws
    this.ip = ip
    this._sessionToken = resumeToken

    // ClientAbstract will not emit the 'close' event with this set to true,
    // but instead, emit the 'pause' event.
    // This is because we want to decide when the 'close' event is emitted:
    // The 'pause' event will be emitted to indicate the session is no longer
    // connected, but the session reconnect timeout will
    // emit the real 'close' event.
    this._closeIsPause = server.supportsResuming

    // Whether to not pause the session on client close.
    this._disableResuming = false

    this._isReady = false

    this._d(`new ServerClient from IP address: ${this.ip}`)
    this._attachEvents()
  }

  join (name) {
    return this.server.room.join(name, this)
  }

  leave (name) {
    return this.server.room.leave(name, this)
  }

  _handleMessage (messageEvent) {
    if (!this._isReady) return this._handleError(new Error('Client sent extraneous message during handshake.'))

    let data = messageEvent.data
    const _d = this._d

    _d('handling message')
    if (data === 'h') {
      if (!this.isOpen()) return
      this._handleHeartbeat()
    } else {
      super._handleMessage(messageEvent)
    }
  }

  _handleClose (closeEvent) {
    if (!this._isReady) return this.server.pool.unreserveId(this.id)

    this._stopHeartbeat()
    if (this.server.supportsResuming) {
      this.server.sessionManager.deactivateSession(this._sessionToken, this._disableResuming)
    } else {
      this.server.room.removeFromAll(this)
      this.server.room._leaveAll(this)
      this.server.pool.remove(this.id)
    }

    if (this._disableResuming) {
      // Don't emit 'pause', but 'close'.
      this._closeIsPause = false
    }
    super._handleClose(closeEvent)
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
    }, this._heartbeatInterval)
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

  _destroySession (isManual) {
    // This function is only called from the session manager.
    this.server.room.removeFromAll(this)
    this.server.room._leaveAll(this)
    this.server.pool.remove(this.id)
    // isManual is true if the server client was closed with close() or terminate()
    // on the server side.
    if (!isManual) {
      this._emit('close')
    }
  }

  _register () {
    // Registers the client to the server.
    // This is not called during a session resume attempt.
    // This function is called ONLY from the server.
    this._isReady = true
    this._startHeartbeat()
    if (this._sessionToken) {
      this.server.sessionManager.createSession(this._sessionToken, this, this.ip)
    }
    this.server.pool.add(this, this.id)
    this.server.room._joinAll(this)
    this.ws.send(`ok:${(this._sessionToken) ? 'y' : 'n'}:${this._sessionToken || ''}`)
    this._resumeMessageQueue()
    this.server.emit('connection', this)
  }

  _replaceSocket (ws, newToken, ip, heartbeatInterval) {
    this._d(`hot-swapping websockets for ServerClient id ${this.id} @ ip ${this.ip}`)
    this._socketeerClosing = false
    this.ws = ws
    const oldIp = this.ip
    this.ip = ip
    this.server.sessionManager.unreserveToken(newToken)
    this._sessionToken = newToken
    this._heartbeatInterval = heartbeatInterval
    this._d(`hot-swapped websocket's IP address: ${this.ip}`)
    this._attachEvents()
    this.ws.send(`ok:+:${newToken}`)
    this._startHeartbeat()
    this._resumeMessageQueue()
    this._emit('resume', this.ip, oldIp)
  }

  close (code, message) {
    this._d('closing connection')
    this._disableResuming = true
    super.close(code, message)
  }

  terminate () {
    this._d('terminating connection')
    this._disableResuming = true
    super.terminate()
  }
}

module.exports = ServerClient
