'use strict'

const debug = require('debug')
const maybestack = require('maybestack')
const Promise = require('bluebird')
const ClientAbstract = require('./ClientAbstract')
const ClientPreparer = require('./ClientPreparer')

class Client extends ClientAbstract {
  constructor (address, options) {
    super()

    const _d = this._d = debug('socketeer:Client')

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

    if (this._failless) {
      _d('[failless] adding client error handler')
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`)
      })
    }

    this._prepareConnection()
  }

  _prepareConnection () {
    this._d('preparing new connection')
    const wsArgs = this._wsConstructArgs
    const handshakeTimeout = this._handshakeTimeout
    const token = (this._resumePromiseResolve) ? this._resumeToken : null

    const preparer = new ClientPreparer(wsArgs, handshakeTimeout, token)
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
      if (!token) {
        this._resolveSessionResume(false)
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
    const _d = this._d
    // TODO: Issue #37
    if (!this.isOpen()) {
      _d('message handler ignored due to closed socket')
      return
    }

    _d('handling message')
    if (data === 'h') {
      _d('message is heartbeat')
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
      if (!this._isReady) return
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
    this._willReconnect = false
    this._isReconnection = true
    this._prepareConnection()
  }
}

module.exports = Client
