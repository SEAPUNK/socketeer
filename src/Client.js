'use strict'

const debug = require('debug')
const inspect = require('util').inspect
const maybestack = require('maybestack')
const WebSocket = require('ws')
const Promise = require('bluebird')
const ClientAbstract = require('./ClientAbstract')

/*
  EventEmitter reserved fields:
  domain
  _events
  _eventsCount
  _maxListeners
  setMaxListeners
  getMaxListneers
  emit
  addListener
  on
  once
  removeListener
  removeAllListeners
  listeners
  listenerCount
 */
class Client extends ClientAbstract {
  constructor (address, options) {
    super()

    if (!options) options = {}
    const _d = this._d = debug('socketeer:Client')

    this._wsConstructArgs = [address, options.protocols, options.ws]
    _d(`constructing websocket with options: ${inspect(this._wsConstructArgs)}`)
    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    _d(`heartbeat timeout set to ${this._heartbeatTimeout}`)
    this._handshakeTimeout = options.handshakeTimeout || 10000
    _d(`handshake timeout set to ${this._handshakeTimeout}`)
    this._reconnectWait = options.reconnectWait || 5000
    _d(`reconnect wait set to ${this._reconnectWait}`)
    this._failless = (options.failless !== false)
    _d(`failless set to ${this._failless}`)

    // Whether the client has closed at least once.
    this._hasClosedBefore = false
    // Whether the client finished the handshake, and is ready.
    this._isReady = false
    // Whether the connection is a result of 'reconnect()' being called.
    this._isReconnection = false

    if (this._failless) {
      _d('[failless] adding client error handler')
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`)
      })
    }

    this._createWebsocket()
    this._attachEvents()
  }

  _createWebsocket () {
    this._d('creating websocket')
    this.ws = WebSocket.apply(null, this._wsConstructArgs)
  }

  _attachEvents () {
    this._d('attaching events')
    this.ws.onopen = this._handleOpen.bind(this)

    super._attachEvents()
  }

  _handleOpen () {
    this._d('handling open')
    // Right now, we can't tell whether we can resume this session or not,
    //  but we can tell them whether it can be a session resume.
    this._emit('_open', this._isReconnection)
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
    this.close()
  }

  _handleMessage (data, flags) {
    const _d = this._d
    if (!this.isOpen()) {
      _d('message handler ignored due to closed socket')
      return
    }

    _d('handling message')
    if (!this._isReady) {
      _d('client not ready, handling handshake messages')
      if (!this._awaitingHandshakeResponse) {
        this._awaitingHandshakeResponse = true
        return this._handleServerHandshake(data)
      } else {
        this._awaitingHandshakeResponse = false
        return this._handleHandshakeResponse(data)
      }
    } else {
      if (data === 'h') {
        _d('message is heartbeat')
        this._handleHeartbeat()
        return
      } else {
        super._handleMessage(data, flags)
      }
    }
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

  _handleServerHandshake (data) {
    const _d = this._d
    _d('handling server handshake (first server message)')
    if (typeof data !== 'string') {
      this._handleError(new Error('server handshake data is not a string'))
      return
    }

    ////////////////////////
    ///
    ///
    ///
    ///
    ///
    ///
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

  _resolveSessionResume (isOkay) {
    const resolve = this._resumePromiseResolve
    delete this._resumePromiseResolve
    resolve(isOkay)
  }
}

// /////
// /////
// /////
// /////
// /////
// /////

Client.prototype._stopHandshakeTimeout = function _stopHandshakeTimeout () {
  if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
  delete this._handshakeTimer
}

Client.prototype._beginHandshake = function _beginhandshake () {
  this.ws.send('v' + this.PROTOCOL_VERSION)
  this._handshakeStage = 1
}

Client.prototype._handleHeartbeatIntervalSet = function _handleHeartbeatIntervalSet (data) {
  this._d('handling heartbeat interval set message')
  if (typeof data !== 'string' || data.indexOf('i') !== 0) {
    this._d('message is not heartbeat interval set message')
    return this._handleError(new Error('handshake: expected heartbeat interval set message, but did not get it'))
  }
  var parsed = data.replace('i', '')
  var interval = Math.floor(+parsed)
  if (Number.isNaN(interval) || interval < 1 || interval > 2147483647) {
    return this._handleError('invalid heartbeat interval from server')
  }
  this._heartbeatInterval = interval
  this._d('heartbeat interval set to ' + this._heartbeatInterval)
  this._handshakeSessionResume()
}

Client.prototype._handshakeSessionResume = function _handshakeSessionResume () {
  if (this._resumeToken) {
    this._d('sending session resume token: ' + this._resumeToken)
    this.ws.send('r@' + this._resumeToken)
  } else {
    this._d('querying for session resume token')
    this.ws.send('r?')
  }
  this._handshakeStage = 2
}

Client.prototype._handleSessionResume = function _handleSessionResume (data) {
  this._d('handling session resume response')
  if (this._resumeToken) {
    this._handlePotentialSessionResume(data)
  } else {
    this._handleSetSessionResume(data)
  }
}

Client.prototype._handlePotentialSessionResume = function _handlePotentialSessionResume (data) {
  this._d('handling potential session resume')
  if (typeof data === 'string' && data.indexOf('r+') === 0) {
    var token = data.replace('r+', '')
    if (token.length < 5 || token.length > 200) {
      this._d('session resume token length invalid')
      this._handleError('session resume token length invalid')
      return
    }
    this._d('session resume ok with new token: ' + token)
    this._resumeToken = token
    this._ready = true
    this._resumeMessageQueue()
    this._resolveSessionResume(true)
  } else if (data === 'r-') {
    this._d('session resume failed')
    this._ready = true // so _handleClose doesn't emit an error
    this.close()
  } else {
    this._d('invalid potential session resume data')
    this._handleError(new Error('got invalid potential session resume data'))
  }
}

Client.prototype._handleSetSessionResume = function _handleSessionResume (data) {
  this._d('handling session resume token set')
  if (data === 'r') {
    this._d('server does not support session resuming')
    this._resumeToken = null
    this.ready = true
    this._clearMessageQueue()
    this._resumeMessageQueue()
    this._emit('open', this._isReconnection)
    return
  } else if (typeof data === 'string' && data.indexOf('r:') === 0) {
    var token = data.replace('r:', '')
    if (token.length < 5 || token.length > 200) {
      this._d('session resume token length invalid')
      this._handleError(new Error('received invalid session resume token'))
      return
    }
    this._d('new resume token: ' + token)
    this._resumeToken = token
    this.ready = true
    this._clearMessageQueue()
    this._resumeMessageQueue()
    this._emit('open', this._isReconnection)
    return
  } else {
    this._d('invalid session resume token data')
    this._handleError(new Error('got invalid session resume token data'))
    return
  }
}

Client.prototype.reconnect = function reconnect (immediate) {
  if (!this._hasClosed) {
    this._d('has not closed, not going to reconnect')
    throw new Error('client has not disconnected to reconnect yet')
  }
  if (this._willReconnect) return
  this._d('attempting reconnect')
  this._willReconnect = true
  // Clear out the resume token because
  // we are not going to resume the session.
  delete this._resumeToken
  var timeout = (immediate) ? 0 : this._reconnectWait
  this._d('will reconnect in ' + timeout + 'ms')
  setTimeout(this._doReconnect.bind(this), timeout)
}

Client.prototype._doReconnect = function _doReconnect () {
  this._d('reconnecting')
  this._willReconnect = false
  this._hasClosed = false
  this._isReconnection = true
  this._createWebsocket()
  this._attachEvents()
}

module.exports = Client
