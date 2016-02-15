'use strict'

var EventEmitter = require('events').EventEmitter
var debug = require('debug')
var inherits = require('util').inherits
var Promise = require('bluebird')
var maybestack = require('maybestack')
var ws = require('ws')
var inspect = require('util').inspect
var RoomManager = require('./RoomManager')
var ClientPool = require('./ClientPool')
var ServerClient = require('./ServerClient')

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
function Server (options) {
  if (this instanceof Server === false) {
    return new Server(options)
  }
  var self = this
  EventEmitter.call(this)
  if (!options) options = {}

  self._d = debug('socketeer:Server')
  self._d('constructing new instance')
  self._heartbeatTimeout = options.heartbeatTimeout || 15000
  self._d('heartbeat timeout set to ' + self._heartbeatTimeout)
  self._heartbeatInterval = options.heartbeatInterval || 10000
  self._d('heartbeat interval set to ' + self._heartbeatInterval)
  self._failless = (options.failless !== false)
  self._d('failless set to ' + self._failless)
  self._middlewares = []
  if (self._failless) {
    self._d('[failless] attaching server error handler')
    self.on('error', function _faillessErrorHandler_ (err) {
      self._d('[failless] handling client error: ' + maybestack(err))
    })
  }
  self.room = new RoomManager(this)
  self.pool = new ClientPool(this)
  self.data = {}
}

Server.prototype.listen = function listen (port, opts) {
  var self = this
  return new Promise(function (resolve, reject) {
    var hasPort = false
    if (port === null) {
      throw new Error('port and/or options must be specified')
    } else if (typeof port !== 'string' && typeof port !== 'number') {
      opts = port
      if (!opts.server) {
        throw new Error('port and/or server must be specified')
      }
    } else {
      hasPort = true
      port = +port
    }
    if (!opts) opts = {}
    if (hasPort) {
      opts.port = port
    }
    opts.disableHixie = true
    opts.perMessageDeflate = false
    self.ws = new ws.Server(opts, function _handleServerReady_ (err) {
      if (err) return reject(err)
      resolve()
    })
    self.ws.on('error', self._handleError.bind(self))
    self.ws.on('headers', self._handleHeaders.bind(self))
    self.ws.on('connection', self._handleConnection.bind(self))
    if (!hasPort) resolve()
  })
}

Server.prototype._handleError = function _handleError (err) {
  this._d('got error: ' + maybestack(err))
  this.emit('error', err)
}

Server.prototype._handleHeaders = function _handleHeaders (headers) {
  this._d('got headers, ' + inspect(headers))
  this.emit('headers', headers)
}

Server.prototype.broadcast = function broadcast (name, data) {
  this._d('broadcasting: ' + name)
  this.room.get('all').emit(name, data)
}

Server.prototype.to = function to (name, create) {
  return this.room.get(name, create)
}

Server.prototype.use = function use (middleware) {
  this._d('attaching middleware')
  this._middlewares.push(middleware)
  this._d('total middlewares: ' + this._middlewares.length)
}

Server.prototype._dummyErrorHandler = function _dummyErrorHandler (err) {
  this._d('handling error of stopped server: ' + maybestack(err))
}

Server.prototype.stop = function stop () {
  this._d('stopping server')
  if (!this.ws) return
  this.pool.clear()
  this.room.clear()
  this.room._clearAll()
  this.ws.removeAllListeners('error')
  this.ws.on('error', this._dummyErrorHandler.bind(this))
  this.ws.close()
  delete this.ws
}

Server.prototype._handleConnection = function _handleConnection (connection) {
  var self = this
  self._d('got connection, creating client')
  var client = new ServerClient(connection, self)
  var calledSetupErrorHandler = false
  function _connectionSetupErrorHandler (err) {
    if (calledSetupErrorHandler) return
    self._d('connection setup error handler: ' + maybestack(err))
    calledSetupErrorHandler = true
    self.emit('connection-setup-error', err)
  }
  client.on('error', function _prematureErrorHandler (err) {
    self._d('client errored out during setup: ' + maybestack(err))
    _connectionSetupErrorHandler(err)
  })
  self._d('awaiting handshake completion')
  client._awaitHandshake().then(function (isResume) {
    if (isResume) return
    if (self._middlewares.length) {
      self._d('running ' + self._middlewares.length + ' middlewares on client')
      return Promise.each(self._middlewares, function _runMiddleware (middleware, idx) {
        self._d('calling middleware #' + (idx + 1))
        return middleware(client)
      })
    } else {
      return Promise.resolve()
    }
  }).catch(function _handleMiddlewareError (err) {
    if (!client.isOpen()) {
      self._d('server client closed before we could finish setup')
      _connectionSetupErrorHandler(new Error('client closed before setup finish'))
      return
    }
    if (!err) {
      self._d('a middleware rejected the connection')
    } else {
      self._d('an error occured while processing middlewares: ' + err)
      _connectionSetupErrorHandler(err)
    }
    client.close()
  }).then(function _handleMiddlewareSuccess () {
    client.removeAllListeners('error')
    if (self._failless) {
      self._d('[failless] adding server client error handler')
      client.on('error', function _faillessHandleServerClientError (err) {
        self._d('[failless] handling server client error: ' + maybestack(err))
      })
    }
    client._register()
  }).catch(function _handleConnectionError (err) {
    self._d('connection creation errored: ' + err)
    _connectionSetupErrorHandler(err)
  })
}

inherits(Server, EventEmitter)

module.exports = Server
