'use strict'

const validateSessionResumeToken = require('./util').validateSessionResumeToken
const PROTOCOL_VERSION = require('./enums').PROTOCOL_VERSION

class ClientPreparer {
  constructor (wsArgs, handshakeTimeout, token, WebSocket, isBrowser) {
    this.wsArgs = wsArgs
    this.handshakeTimeout = handshakeTimeout
    this.resumeToken = token
    this._WebSocket = WebSocket
    this.isBrowser = isBrowser
    this.prepared = false
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
    // Can be overriden immediately after construction.
    this.openHandler = noop
    this.handshakeStep = 0
    this.returnValue = {
      ws: null,
      heartbeatInterval: null,
      isResume: !!token,
      resumeOk: false,
      resumeToken: null
    }
    this.createSocket()
  }

  createSocket () {
    this.ws = this.returnValue.ws = createWebsocket(this._WebSocket, this.wsArgs, this.isBrowser)
    this.ws.onopen = () => this.handleOpen()
    this.ws.onmessage = (messageEvent) => this.handleMessage(messageEvent)
    this.ws.onerror = (err) => this.handleError(err)
    this.ws.onclose = (closeEvent) => this.handleClose(closeEvent)
  }

  handleOpen () {
    this.openHandler() // used to emit unreadyOpen
    this.startHandshakeTimeout()
  }

  handleError (err) {
    if (this.prepared) return
    this.prepared = true
    // TODO: Can this call handleClose before we can call our rejection?
    this.ws.close()
    this.reject(err)
  }

  handleClose () {
    if (this.prepared) return
    this.prepared = true
    this.ws.close()
    this.reject(new Error('Socket closed before handshake could complete.'))
  }

  handleMessage (messageEvent) {
    // TODO: Is there a chance this could be fired after we resolve the handshake?
    if (this.prepared) return
    const data = messageEvent.data
    switch (this.handshakeStep) {
      case 0:
        this.handshakeStep = 1
        return this.handleServerHandshake(data)
      case 1:
        this.handshakeStep = 2
        return this.handleHandshakeResponse(data)
      case 2:
        return this.handleError(new Error('Server sent an unexpected handshake message.'))
      default:
        return this.handleError(new Error(`[INTERNAL ERROR] Unknown handshake step: ${this.handshakeStep}`))
    }
  }

  handleServerHandshake (data) {
    if (typeof data !== 'string') {
      return this.handleError(new Error('Handshake data is not a string.'))
    }

    const parts = data.split(':')
    /*
      The first part of the message should be the string: 'socketeer'.
      This indicates that the server is in fact a socketeer server.
     */
    if (parts[0] !== 'socketeer') {
      return this.handleError(new Error('Server is not a Socketeer server.'))
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
      return this.handleError(new Error('Server protcol version is not specified.'))
    }
    const serverVersion = Math.floor(+parts[1].replace(/^v/, ''))
    if (
      Number.isNaN(parts[1]) ||
      parts[1] <= 0
    ) {
      return this.handleError(new Error('Server protocol version is invalid.'))
    }

    if (serverVersion !== PROTOCOL_VERSION) {
      return this.ws.send(`v${PROTOCOL_VERSION}`, (err) => {
        const errMessage = 'Server protcol is incompatible with the client.'
        if (err) {
          return this.handleError(new Error(`${errMessage} (failed telling the server our version)`))
        } else {
          return this.handleError(new Error(errMessage))
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
      return this.handleError(new Error('Heartbeat interval set message not provided.'))
    }
    const serverHeartbeatInterval = Math.floor(+parts[2].replace(/^i/, ''))
    if (
      Number.isNaN(parts[2]) ||
      parts[2] < 0 ||
      parts[2] > 2147483647
    ) {
      return this.handleError(new Error('Server\'s heartbeat interval is invalid.'))
    }

    this.returnValue.heartbeatInterval = serverHeartbeatInterval

    /*
      Now we send our handshake message.
     */
    if (this.resumeToken) {
      this.ws.send(`r@${this.resumeToken}`)
    } else {
      this.ws.send('r?')
    }
  }

  handleHandshakeResponse (data) {
    if (typeof data !== 'string') {
      return this.handleError(new Error('Handshake response is not a string.'))
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
      // TODO: Should the protocol have err?
      return this.handleError(new Error('Server encountered an error during handshake.'))
    } else {
      return this.handleError(new Error('Server sent an unexpected handshake response status.'))
    }

    /*
      The second part should be the session resume status.
      Either way, the other functions take care of this.
     */
    if (this.resumeToken) {
      this.handlePotentialSessionResume(parts)
    } else {
      this.handleSetSessionResume(parts)
    }
  }

  handlePotentialSessionResume (parts) {
    /*
      Check the session resume status. It must be either - or +
     */
    if (
      parts[1] === '-'
    ) {
      this.returnValue.resumeOk = false
      return this.finishPreparation()
    } else if (
      parts[1] === '+'
    ) {
      // This means we have also have a new session resume token.
      const newToken = parts[2]
      if (!validateSessionResumeToken(newToken)) {
        return this.handleError(new Error('Invalid new session resume token.'))
      } else {
        this.returnValue.resumeOk = true
        this.returnValue.resumeToken = newToken
        return this.finishPreparation()
      }
    } else {
      return this.handleError(new Error('Invalid session resume status.'))
    }
  }

  handleSetSessionResume (parts) {
    /*
      Check the session resume status. It must be either y or n
     */
    if (
      parts[1] === 'y'
    ) {
      // This means we also have a session resume token.
      const newToken = parts[2]
      if (!validateSessionResumeToken(newToken)) {
        return this.handleError(new Error('Invalid new session resume token.'))
      } else {
        this.returnValue.resumeToken = newToken
        return this.finishPreparation()
      }
    } else if (
      parts[1] === 'n'
    ) {
      return this.finishPreparation()
    } else {
      return this.handleError(new Error('Invalid session resume support status.'))
    }
  }

  finishPreparation () {
    this.prepared = true
    if (this.returnValue.isResume && !this.returnValue.resumeOk) this.ws.close()
    this.resolve(this.returnValue)
  }

  startHandshakeTimeout () {
    // We do not require a stop function because
    // the timeout is per-instance only. If ClientPreparer.prepared = true,
    // then it will stay prepared forever and ever.
    // On Client reconnection, we create a new instance of ClientPreparer.
    // TODO: Will having a stop function make garbage collection faster?
    setTimeout(() => {
      if (this.prepared) return
      this.prepared = true
      this.ws.close()
      this.reject(new Error('Handshake timed out.'))
    }, this.handshakeTimeout)
  }
}

function createWebsocket (WebSocket, args, isBrowser) {
  // Max of 3 construct args so far
  if (isBrowser) {
    return new WebSocket(args[0], args[1])
  } else {
    return new WebSocket(args[0], args[1], args[2])
  }
}

function noop () { }

module.exports = ClientPreparer
