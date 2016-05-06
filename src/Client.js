'use strict'

import debugClass from 'debug' // [DEBUG]
import maybestack from 'maybestack' // [DEBUG]

import ClientAbstract from './ClientAbstract'
import ClientPreparer from './ClientPreparer'

/**
 * Utility function that returns true or false,
 * depending on the below statement. 
 */
export function isUnconfigured (val) {
  return (val === undefined || val === null)
}

/**
 * Generate a configuration object for the client based off the
 * given config values.
 *
 * Throws an error if a value is not undefined or null and an invalid value.
 */
export function clientApplyOptions (options) {
  const retval = {}

  if (isUnconfigured(options.heartbeatTimeout)) {
    
  }
}

export default class Client extends ClientAbstract {
  constructor (address, _options, WebSocket, isBrowser) {
    super()

    const options = _options || {
      heartbeatTimeout: 15000,
      handshakeTimeout: 10000,
      reconnectWait: 5000,
      failless: true
    }

    // Private socketeer client namespace _sc
    this._sc = {
      debug: debugClass('socketeer:Client'), // [DEBUG]

      WebSocket: WebSocket,
      isBrowser: isBrowser,

      socketArgs: [address, options.protocols, options.ws],

      isReady: false,
      isReconnection: false,

      resumePromiseResolve: null,
      resumeToken: null,
      heartbeatTimer: null,
      willReconnect: false,

      heartbeatTimeout: options.heartbeatTimeout,
      handshakeTimeout: options.handshakeTimeout,
      reconnectWait: options.reconnectWait,
      failless: options.failless
    }
  }
}



class Client extends ClientAbstract {
  constructor (address, options, WebSocket, isBrowser) {

    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    this._handshakeTimeout = options.handshakeTimeout || 10000
    this._reconnectWait = options.reconnectWait || 5000
    this._failless = (options.failless !== false)



    this.ws = {
      readyState: WebSocket.CLOSED,
      CLOSED: WebSocket.CLOSED
    }

    if (this._failless) {
      _d('[failless] adding client error handler') // [DEBUG]
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`) // [DEBUG]
      })
    }

    this._prepareConnection()
  }

  _prepareConnection () {
    this._d('preparing new connection') // [DEBUG]
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

    this._d('handling message') // [DEBUG]
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
    this._d('handling heartbeat') // [DEBUG]
    this._resetHeartbeatTimeout()
    this.ws.send('h')
    this._emit('ping')
  }

  _resetHeartbeatTimeout () {
    const timeoutPeriod = this._heartbeatInterval + this._heartbeatTimeout
    this._d(`resetting heartbeat timeout: ${timeoutPeriod}`) // [DEBUG]

    this._stopHeartbeatTimeout()

    this._heartbeatTimer = setTimeout(() => {
      if (!this._isReady) return
      this._d('heartbeat timeout called') // [DEBUG]
      this._emit('timeout')
      // TODO: use code 1013
      this.close(3000, 'heartbeat timeout')
    }, timeoutPeriod)
  }

  _stopHeartbeatTimeout () {
    this._d('stopping heartbeat timeout') // [DEBUG]
    if (this._heartbeatTimer) clearTimeout(this._heartbeatTimer)
  }

  resume () {
    return new Promise((resolve, reject) => {
      this._d('attempting session resume') // [DEBUG]
      if (!this.isClosing() && !this.isClosed()) {
        this._d('has not closed, nothing to resume') // [DEBUG]
        return reject(new Error('client has not disconnected to resume session yet'))
      }

      if (!this._resumeToken) {
        this._d('no resume token, nothing to resume') // [DEBUG]
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
    this._d(`will reconnect in ${timeout} ms`) // [DEBUG]
    setTimeout(() => {
      this._doReconnect()
    }, timeout)
  }

  _doReconnect () {
    this._d('reconnecting') // [DEBUG]
    this._willReconnect = false
    this._isReconnection = true
    this._prepareConnection()
  }
}

module.exports = Client
