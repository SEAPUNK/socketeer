'use strict'

var debug = require('debug')
var inspect = require('util').inspect
var maybestack = require('maybestack')
var EventEmitter = require('events').EventEmitter
var queue = require('async').queue
var WebSocket = require('ws')
var Promise = require('bluebird')
var exists = require('deep-exists')
var enums = require('./enums')
var ActionResponse = enums.ActionResponse

function Client (address, options) {
  if (this instanceof Client === false) {
    return new Client(address, options)
  }
  var self = this
  if (!options) options = {}

  self._d = debug('socketeer:Client')
  self._wsConstructArgs = [address, options.protocols, options.ws]
  self._d('constructing websocket with options: ' + inspect(self._wsConstructArgs))

  self._heartbeatTimeout = options.heartbeatTimeout || 15000
  self._handshakeTimeout = options.handshakeTimeout || 10000
  self._reconnectWait = options.reconnectWait || 5000
  self._failless = (options.failless !== false)
  self._d('heartbeat timeout set to ' + self._heartbeatTimeout)
  self._d('handshake timeout set to ' + self._handshakeTimeout)
  self._d('reconnect wait set to ' + self._reconnectWait)
  self._d('failless set to ' + self._failless)

  // Whether the client has closed at least once.
  self._hasClosed = false
  // Whether the client finished the handshake, and is ready.
  self._ready = false

  if (self._failless) {
    self._d('[failless] adding client error handler')
    self.on('error', function _faillessErrorHandler_ (err) {
      self._d('[failless] handling client error: ' + maybestack(err.stack))
    })
  }

  self._createWebsocket()
  self._attachEvents()

  // ////////
  // [common]
  // ////////
  EventEmitter.call(this)
  this._emit = this.emit // EventEmitter's emit
  this.emit = this._doEmit // Socketeer's emit
  this.PROTOCOL_VERSION = 1
  this._events = {}
  this._actions = {}
  this._actionCallbacks = {}
  this._currentActionId = 0
  this._messageQueue = queue(this._processQueue.bind(this), 1)

  // Reserved variable for anyone to use.
  // Helps with not polluting the Socketeer instance namespace.
  this.data = {}
}

Client.prototype._createWebsocket = function _createWebsocket () {
  this._d('creating websocket')
  this.ws = WebSocket.apply(this._wsConstructArgs)
}

Client.prototype._attachEvents = function _attachEvents () {
  this._d('attaching events')
  this.ws.onopen = this._handleOpen.bind(this)

  // ////////
  // [common]
  // ////////
  this.ws.onmessage = this._handleMessage.bind(this)
  this.ws.onerror = this._handleError.bind(this)
  this.ws.onclose = this._handleClose.bind(this)
}

// Renamed to Client.prototype.emit on construct
Client.prototype._doEmit = function _doEmit (name, data) {
  // ////////
  // [common]
  // ////////
  this._d('emitting event: ' + name)
  this.send({
    e: name,
    d: data
  })
}

Client.prototype.request = function request (name, data) {
  // ////////
  // [common]
  // ////////
  var self = this
  return new Promise(function _requestPromise_ (resolve, reject) {
    var id = self.generateActionId()
    self._actionCallbacks[id] = {
      resolve: resolve,
      reject: reject
    }
    self.send({
      i: id,
      a: name,
      d: data
    })
  })
}

Client.prototype._generateActionId = function _generateActionId () {
  // ////////
  // [common]
  // ////////
  this._d('generated action id: ' + this._currentActionId)
  return this._currentActionId++
}

Client.prototype._handleOpen = function _handleOpen () {
  this._d('handling open')
  // Right now, we can't tell whether we can resume this session or not.
  this._emit('_open', this._isReconnection)
  this._startHandshakeTimeout()
  this._beginHandshake()
}

Client.prototype._startHandshakeTimeout = function _startHandshakeTimeout () {
  this._d('starting handshake timeout')
  this._handshakeTimer = setTimeout(this._failHandshake.bind(this), this._handshakeTimeout)
}

Client.prototype._failHandshake = function _failHandshake () {
  if (this._ready) return
  this._d('failing handshake')
  this.close()
}

Client.prototype._stopHandshakeTimeout = function _stopHandshakeTimeout () {
  if (this._handshakeTimer) clearTimeout(this._handshakeTimer)
  delete this._handshakeTimer
}

Client.prototype._beginHandshake = function _beginhandshake () {
  this.ws.send('v' + this.PROTOCOL_VERSION)
  this._handshakeStage = 1
}

Client.prototype._processQueue = function _processQueue (msg, done) {
  // ////////
  // [common]
  // ////////
  if (!this.isOpen()) {
    this._d('socket is not open, pausing message queue')
    this._messageQueue.pause()
    this._messageQueue.unshift(msg)
  } else {
    this._d('sending next message in queue')
    this.ws.send(msg)
  }
  return done()
}

Client.prototype._resumeMessageQueue = function _resumeMessageQueue () {
  // ////////
  // [common]
  // ////////
  this._messageQueue.resume()
}

Client.prototype._clearMessageQueue = function _clearMessageQueue () {
  // ////////
  // [common]
  // ////////
  this._messageQueue.kill()
}

Client.prototype.send = function send (obj) {
  // ////////
  // [common]
  // ////////
  try {
    var data = JSON.stringify(obj)
  } catch (err) {
    this._d('could not stringify message for sending: ' + err)
    return this._handleError(err)
  }
  this._d('adding data to send queue')
  this._messageQueue.push(data)
}

Client.prototype._handleError = function _handleError (err) {
  // ////////
  // [common]
  // ////////
  this._d('handling error: ' + maybestack(err))
  this._emit('error', err)
  this.close()
  this._handleClose(null, null, err)
}

Client.prototype._handleClose = function _handleClose (code, message, error) {
  this._d('handling close')
  if (!this._ready) {
    this._d('connection closed before handshake finished')
    if (!error) { // There could already be an error.
      this._emit('error', new Error('connection closed before handshake could complete'))
    }
  }
  this._ready = false
  this._hasClosed = true
  this._stopHandshakeTimeout()
  this._stopHeartbeatTimeout()

  // ////////
  // [common]
  // ////////
  if (!error) error = null
  this._d('close code: ' + code)
  this._d('close message: ' + message)
  this._d('close error: ' + maybestack(error))
  this.ws.onmessage = null
  this.ws.onclose = null
  // We want to handle any errors the websocket
  // might emit to prevent unneeded unhandled exceptions.
  this.ws.onerror = this._dummyErrorHandler.bind(this)
  if (this._resumeToken) {
    // This means we attempted a session resume.
    this._resolveSessionResume(false)
  } else {
    this._emit('close', code, message, error)
  }
}

Client.prototype._dummyErrorHandler = function _dummyErrorHandler (err) {
  // ////////
  // [common]
  // ////////
  this._d('handling error of closed connection: ' + maybestack(err))
}

Client.prototype._handleMessage = function _handleMessage (data, flags) {
  if (!this.isOpen()) {
    this._d('message handler ignored due to closed socket')
    return
  }

  this._d('handling message')

  if (!this.ready) {
    switch (this._handshakeStage) {
      case 1: return this._handleHeartbeatIntervalSet(data)
      case 2: return this._handleSessionResume(data)
      default:
        return this._handleError(new Error('unknown handshake stage: ' + this._handshakeStage))
    }
  } else {
    if (data === 'h') {
      this._d('message is heartbeat')
      this._handleHeartbeat()
      return
    } else {
      // ////////
      // [common]
      // ////////
      if (typeof data !== 'string') {
        this._d('ignoring non-string messages')
        // @TODO: binary data support
        return
      }
      var parsed
      try {
        this._d('parsing message JSON')
        parsed = JSON.parse(data)
      } catch (err) {
        this._d('JSON parse failed, ignoring: ' + maybestack(err))
        return
      }

      if (exists(parsed, 'a')) {
        this._d('data is action')
        this._handleAction(parsed)
      } else if (exists(parsed, 's')) {
        this._d('data is action response')
        this._handleActionResponse(parsed)
      } else if (exists(parsed, 'e')) {
        this._d('data is event')
        this._handleEvent(parsed)
      } else {
        this._d('data is of unknown type, ignoring')
      }

      return
    }
  }
}

Client.prototype._handleAction = function _handleAction (data) {
  var self = this
  // ////////
  // [common]
  // ////////
  self._d('handling action: ' + data.a)
  var handler = self._actions[data.a]
  if (!handler) {
    self._d('action handler does not exist')
    return self.send({
      i: data.i,
      s: ActionResponse.NONEXISTENT,
      d: ActionResponse.NONEXISTENT
    })
  }

  var handlerPromise
  self._d('calling action handler')
  try {
    handlerPromise = handler(data.d)
  } catch (err) {
    self._d('action handler errored (call fail), responding: ' + maybestack(err))
  }

  // Make sure handlerPromise is actually a promise.
  if (typeof handlerPromise.then !== 'function' || typeof handlerPromise.catch !== 'function') {
    self._d('action handler for action ' + data.a + ' does not return a promise')
    self.send({
      i: data.i,
      s: ActionResponse.ERROR,
      d: ActionResponse.ERROR
    })
    // Non-connection closing error.
    return self._emit('error', new Error('action handler for ' + data.a + ' does not return a promise'))
  }

  handlerPromise.then(function (response) {
    self._d('action handler for ' + data.a + ' thenned, responding')
    self.send({
      i: data.i,
      s: ActionResponse.OK,
      d: response
    })
  }).catch(function (err) {
    self._d('action handler errored (promise catch), responding: ' + maybestack(err))
    self.send({
      i: data.i,
      s: ActionResponse.ERROR,
      d: ActionResponse.ERROR
    })
    // Non-connection closing error
    self._emit('error', err)
  })
}

Client.prototype._handleActionResponse = function _handleActionResponse (data) {
  // ////////
  // [common]
  // ////////
  this._d('handling action response: ' + data.i)
  var handler = this._actionCallbacks[data.i]
  if (!handler) return
  this._d('action response handler exists, continuing')
  this._d('determining error from status: ' + data.s)
  var err
  switch (data.s) {
    case ActionResponse.OK: break
    case ActionResponse.ERROR:
      err = new Error('an error occured processing action')
      break
    case ActionResponse.NONEXISTENT:
      err = new Error('action does not exist')
      break
    default:
      err = new Error('an unknown non-OK response was received: ' + data.s)
  }
  this._d('calling action response handler')
  try {
    handler(err, data.d)
  } catch (err) {
    this._d('an error occured calling the response handler')
    // Non-connection closing error
    this._emit('error', err)
  }
}

Client.prototype._handleEvent = function _handleEvent (data) {
  // ////////
  // [common]
  // ////////
  this._d('handling event: ' + data.e)
  if (!this._events[data.e]) return
  var handlers = this._events[data.e]
  if (!handlers.length) return
  this._d('handlers exist for event ' + data.e + ': there are ' + handlers.length + ' handlers')
  for (var i = 0; i < handlers.length; i++) {
    try {
      handlers[i](data.d)
    } catch (err) {
      this._d('an error occured calling the event handler')
      // Non-connection closing error
      this._emit('error', err)
      continue // Go ahead and take care of the other event handlers.
    }
  }
}

Client.prototype.event = function event (name, handler) {
  // ////////
  // [common]
  // ////////
  if (typeof handler !== 'function') {
    throw new Error('event handler is not a function')
  }
  this._d('defining event handler for ' + name)
  if (!this._events[name]) this._events[name] = []
  this._events[name].push(handler)
}

Client.prototype.action = function action (name, handler, force) {
  // ////////
  // [common]
  // ////////
  if (typeof handler !== 'function') {
    throw new Error('action handler is not a function')
  }
  this._d('defining action handler for ' + name)
  if (this._actions[name] && !force) {
    this._d('action handler is already defined')
    throw new Error('action handler is already set')
  }
  this._actions[name] = handler
}

Client.prototype.close = function close (code, message) {
  // ////////
  // [common]
  // ////////
  this._d('closing connection')
  this.ws.close(code, message)
}

Client.prototype.terminate = function terminate () {
  // ////////
  // [common]
  // ////////
  this._d('terminating connection')
  this.ws.terminate()
}

Client.prototype.isOpen = function isOpen () {
  // ////////
  // [common]
  // ////////
  return this.ws.readyState === this.ws.OPEN
}

Client.prototype.isClosed = function isClosed () {
  // ////////
  // [common]
  // ////////
  return this.ws.readyState === this.ws.CLOSED
}

Client.prototype.isClosing = function isClosing () {
  // ////////
  // [common]
  // ////////
  return this.ws.readyState === this.ws.CLOSING
}

Client.prototype.isOpening = function isOpening () {
  return this.ws.readyState === this.ws.CONNECTING
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

Client.prototype._resetHeartbeatTimeout = function _resetHeartbeatTimeout () {
  var self = this
  var timeoutPeriod = self._heartbeatInterval + self._heartbeatTimeout
  self._d('resetting heartbeat timeout: ' + timeoutPeriod)

  self._stopHeartbeatTimeout()

  self._heartbeatTimer = setTimeout(function () {
    self._d('heartbeat timeout called')
    self._handleError('connection timeout')
  }, timeoutPeriod)
}

Client.prototype._stopHeartbeatTimeout = function _stopHeartbeatTimeout () {
  this._d('stopping heartbeat timeout')
  if (this._heartbeatTimer) clearTimeout(this._heartbeatTimer)
}

Client.prototype._handleHeartbeat = function _handleHeartbeat () {
  this._d('handling heartbeat')
  this._resetHeartbeatTimeout()
  this.ws.send('h')
  this._emit('ping')
}

Client.prototype.resume = function resume () {
  var self = this
  return new Promise(function (resolve, reject) {
    if (!self._hasClosed) {
      self._d('has not closed, nothing to resume')
      return reject(new Error('client has not disconnected to resume session yet'))
    }
    if (!self._resumeToken) {
      self._d('no resume token, nothing to resume')
      return resolve(false)
    }
    self._d('attempting session resume')
    self._doReconnect()
  })
}

Client.prototype.recnnect = function reconnect (immediate) {
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
