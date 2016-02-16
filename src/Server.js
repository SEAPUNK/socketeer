'use strict'

const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const Promise = require('bluebird')
const maybestack = require('maybestack')
const ws = require('ws')
const inspect = require('util').inspect
const RoomManager = require('./RoomManager')
const ClientPool = require('./ClientPool')
const ServerClient = require('./ServerClient')

class Server extends EventEmitter {
  constructor (options) {
    super()

    if (!options) options = {}

    const _d = this._d = debug('socketeer:Server')
    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    _d(`heartbeat timeout set to ${this._heartbeatTimeout}`)
    this._heartbeatInterval = options.heartbeatInterval || 10000
    _d(`heartbeat interval set to ${this._heartbeatInterval}`)
    this._failless = (options.failless !== false)
    _d(`failless set to ${this._failless}`)
    this.supportsResuming = (options.supportsResuming !== false)
    _d(`session resume support set to ${this.supportsResuming}`)
    this._middlewares = []

    if (this._failless) {
      _d('[failless] attaching server error handler')
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`)
      })
    }

    this.room = new RoomManager(this)
    this.pool = new ClientPool(this)

    // Reserved variable for anyone except the library to use.
    // Helps with not polluting the Socketeer instance namespace.
    this.data = {}
  }

  listen (port, opts) {
    return new Promise((resolve, reject) => {
      let hasPort = false
      if (port === null) {
        throw new Error('port and/or options must be specified')
      } else if (
        typeof port !== 'string' &&
        typeof port !== 'number'
      ) {
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
      // TODO: Should we allow perMessageDeflate to be configurable?
      opts.perMessageDeflate = false
      this.ws = new ws.Server(opts, (err) => {
        if (err) return reject(err)
        resolve()
      })
      this.ws.on('error', this._handleError.bind(this))
      this.ws.on('headers', this._handleHeaders.bind(this))
      this.ws.on('connection', this._handleConnection.bind(this))
      if (!hasPort) resolve()
    })
  }

  _handleError (err) {
    this._d(`got error: ${maybestack(err)}`)
    this.emit('error', err)
  }

  _handleHeaders (headers) {
    this._d(`got headers: ${inspect(headers)}`)
    this.emit('headers', headers)
  }

  broadcast (name, data) {
    this._d(`broadcasting event: ${name}`)
    this.room.get('all').emit(name, data)
  }

  to (name, create) {
    return this.room.get(name, create)
  }

  use (middleware) {
    this._d('attaching middleware')
    this._middlewares.push(middleware)
    this._d(`total middleware: ${this._middlewares.length}`)
  }

  _dummyErrorHandler (err) {
    this._d(`handling error of stopped server: ${maybestack(err)}`)
  }

  stop () {
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

  _handleConnection (connection) {
    this._d('got connection, creating client')
    const client = new ServerClient(connection, this)

    let calledSetupErrorHandler = false
    const _connectionSetupErrorHandler = (err) => {
      if (calledSetupErrorHandler) return
      this._d(`connection setup error handler: ${maybestack(err)}`)
      calledSetupErrorHandler = true
      this.emit('connection-setup-error', err)
    }

    client.on('error', (err) => {
      this._d(`client errored during setup: ${maybestack(err)}`)
      _connectionSetupErrorHandler(err)
    })

    this._d('awaiting handshake completion')
    client._awaitHandshake().then((obj) => {
      const isResume = obj.isResume
      const successfulResume = obj.successfulResume
      if (isResume) {
        if (successfulResume) {
          // TODO: ClientPool functions
          // TODO: If resuming, detach event listeners from this ServerClient instance
          // TODO: Move detach existing ws and move it to other ServerClient
          return Promise.resolve(true)
        } else {
          // Client should close after receiving this message either way.
          client.ws.send('ok:-:', () => {
            client.close()
          })
        }
        return Promise.resolve(true)
      } else {
        if (this._middlewares.length) {
          this._d(`running ${this._middlewares.length} middleware on client`)
          return Promise.each(this._middlewares, (middleware, idx) => {
            this._d(`calling middleware # ${idx + 1}`)
            return middleware(client)
          })
        } else {
          return Promise.resolve()
        }
      }
    }).catch((err) => {
      if (!client.isOpen()) {
        this._d('server client closed before we could finish setup')
        _connectionSetupErrorHandler(new Error('client closed before setup finish'))
        return
      }
      if (!err) {
        this._d('a middleware rejected the connection')
        client.ws.send('err:A server middleware rejected your connection.')
      } else {
        this._d(`an error occured while processing middleware: ${maybestack(err)}`)
        _connectionSetupErrorHandler(err)
      }
      client.close()
    }).then((isSessionResume) => {
      if (isSessionResume) {
        // Don't do anything.
        return
      }
      client.removeAllListeners('error')
      if (!client.isOpen()) {
        this._d('server client closed before we could finish setup')
        _connectionSetupErrorHandler(new Error('client closed before setup finish'))
        return
      }
      if (this._failless) {
        this._d('[failless] adding server client error handler')
        client.on('error', (err) => {
          this._d(`[failless] handling server client error: ${maybestack(err)}`)
        })
      }
      client._register()
    }).catch((err) => {
      this._d(`connection creation errored: ${maybestack(err)}`)
      _connectionSetupErrorHandler(err)
    })
  }
}

module.exports = Server
