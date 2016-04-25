'use strict'

const debug = require('debug') // [DEBUG]
const validateSessionResumeToken = require('./util').validateSessionResumeToken
const PROTOCOL_VERSION = require('./enums').PROTOCOL_VERSION

class ServerClientPreparer {
  constructor (ws, server) {
    this._d = debug('socketeer:ServerClientPreparer') // [DEBUG]
    this.prepared = false
    this.server = server
    this.id = server.pool.generateId()
    this.ws = ws
    this.ip = ws._socket.remoteAddress
    this.handshakeTimeout = this.server._handshakeTimeout
    this.heartbeatInterval = this.server._heartbeatInterval

    this.handshakeOver = false

    this.promise = new Promise((resolve, reject) => {
      this.reject = reject
      this.resolve = resolve
    })

    this.returnValue = {
      id: this.id,
      ip: this.ip,
      ws: ws,
      heartbeatInterval: this.heartbeatInterval,
      isResume: false,
      resumeToken: null,
      existingClient: null
    }

    this.ws.onerror = (err) => this.handleError(err)
    this.ws.onmessage = (messageEvent) => this.handleMessage(messageEvent)
    this.ws.onclose = () => this.handleClose()

    const handshakeMessageParts = [
      'socketeer',
      `v${PROTOCOL_VERSION}`,
      `i${this.heartbeatInterval}`
    ]

    this.ws.send(handshakeMessageParts.join(':'))
    this.startHandshakeTimeout()
  }

  startHandshakeTimeout () {
    this._d('starting handshake timeout') // [DEBUG]
    // We do not require a stop function because
    // the timeout is per-instance only. If ServerClientPreparer.prepared = true,
    // then it will stay prepared forever and ever.
    // TODO: Will having a stop function make garbage collection faster?
    setTimeout(() => {
      if (this.prepared) return
      this.prepared = true
      this.ws.close()
      this.reject(new Error('Handshake timed out.'))
    }, this.handshakeTimeout)
  }

  handleError (err) {
    this._d('handling error (unfiltered)') // [DEBUG]
    if (this.prepared) return
    this._d('handling error') // [DEBUG]
    this.prepared = true
    // TODO: Can this call handleClose before we can call our rejection?
    this.ws.close()
    this.reject(err)
  }

  handleClose () {
    this._d('handling close (unfiltered)') // [DEBUG]
    if (this.prepared) return
    this._d('handling close') // [DEBUG]
    this.prepared = true
    this.ws.close()
    this.reject(new Error('Socket closed before handshake could complete.'))
  }

  handleMessage (messageEvent) {
    this._d('handling message (unfileted)') // [DEBUG]
    if (this.prepared) return
    this._d('handling message') // [DEBUG]
    const data = messageEvent.data
    if (this.handshakeOver) {
      return this.handleError(new Error('Client sent an extraneous handshake message.'))
    }
    this.handshakeOver = true
    this.handleHandshakeMessage(data)
  }

  handleHandshakeMessage (data) {
    this._d('handling handshake message') // [DEBUG]
    if (typeof data !== 'string') {
      return this.handleError(new Error('Bad handshake message from client.'))
    }

    const parts = data.split(':')
    // There is only one part to the client handshake message right now:
    //  The session resume attempt/token query.
    if (
      parts[0].indexOf('r') !== 0
    ) {
      return this.handleError(new Error('Client sent an unexpected handshake message.'))
    }

    // Determine whether it's a query or a resume attempt.
    if (
      parts[0].indexOf('?') === 1
    ) {
      // It is a query.
      this.querySessionResume()
    } else if (
      parts[0].indexOf('@') === 1
    ) {
      // It is a session resume attempt.
      this.attemptSessionResume(parts[0].replace(/^r\@/, ''))
    } else {
      return this.handleError(new Error('Client sent badly formatted session resume message.'))
    }
  }

  querySessionResume () {
    this._d('running session resume token query') // [DEBUG]
    this.server.sessionManager.reserveNewToken().then((token) => {
      this.returnValue.isResume = false
      this.returnValue.resumeToken = token
      this.finishPreparation()
    }).catch((err) => {
      this.handleError(err)
    })
  }

  attemptSessionResume (token) {
    this._d('attempting session resume') // [DEBUG]
    if (!validateSessionResumeToken(token)) {
      return this.handleError(new Error('Client sent an invalid session resume token.'))
    }
    this.server.sessionManager.attemptResume(token, this.ip).then((retval) => {
      this.returnValue.isResume = true
      this.returnValue.resumeToken = retval.newToken
      this.returnValue.existingClient = retval.existingClient
      this.finishPreparation()
    }).catch((err) => {
      this.handleError(err)
    })
  }

  finishPreparation () {
    this._d('finishing preparation') // [DEBUG]
    this.prepared = true
    if (this.returnValue.isResume && !this.returnValue.resumeToken) {
      this.ws.send('ok:-:', () => {
        this.ws.close()
      })
    }
    this.resolve(this.returnValue)
  }
}

module.exports = ServerClientPreparer
