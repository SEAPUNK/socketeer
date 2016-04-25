'use strict'

const ClientAbstract = require('./ClientAbstract')
const ClientPreparer = require('./ClientPreparer')

class Client extends ClientAbstract {
  constructor (address, options, WebSocket, isBrowser) {
    super()


    this._WebSocket = WebSocket
    this._isBrowserClient = isBrowser

    if (!options) options = {}
    this._wsConstructArgs = [address, options.protocols, options.ws]
    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    this._handshakeTimeout = options.handshakeTimeout || 10000
    this._reconnectWait = options.reconnectWait || 5000
    this._failless = (options.failless !== false)

    this._isReady = false
    this._isReconnection = false

    this._resumePromiseResolve = null
    this._resumeToken = null
    this._heartbeatTimer = null
    this._willReconnect = false

    this.ws = {
      readyState: WebSocket.CLOSED,
      CLOSED: WebSocket.CLOSED
    }

    if (this._failless) {
      this.on('error', (err) => {
      })
    }

    this._prepareConnection()
  }

  _prepareConnection () {
    const wsArgs = this._wsConstructArgs
    const handshakeTimeout = this._handshakeTimeout
    const token = (this._resumePromiseResolve) ? this._resumeToken : null

    const preparer = new ClientPreparer(wsArgs, handshakeTimeout, token, this._WebSocket, this._isBrowserClient)
    preparer.openHandler = () => {
      this._emit('unreadyOpen', this._isReconnection)
    }
    preparer.promise.then((retval) => {
      const ws = retval.ws
      const heartbeatInterval = retval.heartbeatInterval
      const isResume = retval.isResume
      const resumeOk = retval.resumeOk
      const resumeToken = retval.resumeToken

      // The resume token is reusable on preparation errors.
      // Only when the token could be successfully consumed do we
      // prevent reusage of it.
      this._resumeToken = resumeToken

      this._heartbeatInterval = heartbeatInterval

      if (isResume && !resumeOk) {
        return this._resolveSessionResume(false)
      }

      this.ws = ws

      // See docs/development/extending-client-abstract.md
      this._socketeerClosing = false

      this._attachEvents()
      this._finalizePreparation(isResume)
    }).catch((err) => {
      // Do NOT emit the 'error' event if it's a session resume attempt.
      if (token) {
        return this._resolveSessionResume(false)
      }
      // Else, we can emit the 'error' and 'close' events.
      this._emit('error', err, true)
      this._emit('close', null, null, err)
    })
  }

  _finalizePreparation (isSessionResume) {
    if (!isSessionResume) this._clearMessageQueue()
    this._isReady = true
    this._resetHeartbeatTimeout()
    this._resumeMessageQueue()
    if (!isSessionResume) this._emit('open', this._isReconnection)
    if (isSessionResume) this._resolveSessionResume(true)
  }

  _handleClose (closeEvent) {
    this._isReady = false
    this._stopHeartbeatTimeout()
    super._handleClose(closeEvent)
  }

  _handleMessage (messageEvent) {
    let data = messageEvent.data

    if (data === 'h') {
      if (!this.isOpen()) return
      this._handleHeartbeat()
      return
    } else {
      super._handleMessage(messageEvent)
    }
  }

  _resolveSessionResume (isOkay) {
    const resolve = this._resumePromiseResolve
    this._resumePromiseResolve = null
    resolve(isOkay)
  }

  _handleHeartbeat () {
    this._resetHeartbeatTimeout()
    this.ws.send('h')
    this._emit('ping')
  }

  _resetHeartbeatTimeout () {
    const timeoutPeriod = this._heartbeatInterval + this._heartbeatTimeout

    this._stopHeartbeatTimeout()

    this._heartbeatTimer = setTimeout(() => {
      if (!this._isReady) return
      this._emit('timeout')
      // TODO: use code 1013
      this.close(3000, 'heartbeat timeout')
    }, timeoutPeriod)
  }

  _stopHeartbeatTimeout () {
    if (this._heartbeatTimer) clearTimeout(this._heartbeatTimer)
  }

  resume () {
    return new Promise((resolve, reject) => {
      if (!this.isClosing() && !this.isClosed()) {
        return reject(new Error('client has not disconnected to resume session yet'))
      }

      if (!this._resumeToken) {
        return resolve(false)
      }

      this._resumePromiseResolve = resolve
      this._doReconnect()
    })
  }

  reconnect (immediate) {
    if (!this.isClosing() && !this.isClosed()) {
      throw new Error('client has not disconnected to reconnect yet')
    }
    // Prevent duplicate reconnection attempts.
    if (this._willReconnect) return
    this._willReconnect = true
    // Clear out the resume token because
    // we are not going to resume the session.
    this._resumeToken = null
    const timeout = (immediate) ? 0 : this._reconnectWait
    setTimeout(() => {
      this._doReconnect()
    }, timeout)
  }

  _doReconnect () {
    this._willReconnect = false
    this._isReconnection = true
    this._prepareConnection()
  }
}

module.exports = Client
