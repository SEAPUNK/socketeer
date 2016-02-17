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
    this.supportsResuming = !!options.supportsResuming
    _d(`session resume support set to ${this.supportsResuming}`)
    this._sessionTimeout = options.sessionTimeout || 10000
    _d(`session resume timeout set to ${this._sessionTimeout}`)
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
        reject(new Error('port and/or options must be specified'))
      } else if (
        typeof port !== 'string' &&
        typeof port !== 'number'
      ) {
        opts = port
        if (!opts.server) {
          reject(new Error('port and/or server must be specified'))
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
      this.wss = new ws.Server(opts, (err) => {
        if (err) return reject(err)
        resolve()
      })
      this.wss.on('error', (err) => this._handleError(err))
      this.wss.on('headers', (headers) => this._handleHeaders(headers))
      this.wss.on('connection', (connection) => this._handleConnection(connection))
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

  stop () {
    this._d('stopping server')
    if (!this.wss) return
    this.pool.clear()
    this.room.clear()
    this.room._clearAll()
    this.wss.removeAllListeners('error')
    this.wss.on('error', (err) => {
      this._d(`handling error of stopped server: ${maybestack(err)}`)
    })
    this.wss.close()
    delete this.wss
  }

  _handleConnection (connection) {
    this._d('got connection, creating client')
    const client = new ServerClient(connection, this)

    let calledSetupErrorHandler = false
    const setupErrorHandler = (err) => {
      if (calledSetupErrorHandler) {
        this._d(`warning: called setupErrorHandler more than twice: ${maybestack(err)}`)
        return
      }
      this._d('called setup error handler')
      calledSetupErrorHandler = true
      client.removeAllListeners('error')
      client.on('error', (err) => {
        this._d(`error handler called on defunct connection: ${maybestack(err)}`)
      })
      this.emit('connectionSetupError', err)
    }

    const handleSessionResume = (newResumeToken) => {
      this._d(`handling session resume w/ token: ${newResumeToken}`)
      if (!newResumeToken) {
        // Session resume failed.
        client.ws.send('ok:-:', () => {
          client.close()
        })
      } else {
        // Session resume succeeded.
        // TODO: Finish the setup
      }
    }

    const setupConnection = (newResumeToken) => {
      this._d(`setting up connection w/ token: ${newResumeToken}`)
      try {
        client.removeAllListeners('error')
        if (!client.isOpen()) {
          this._d('server client closed before we could finish setup')
          return setupErrorHandler(new Error('client closed before setup finish'))
        }
        if (this._failless) {
          this._d('[failless] adding server client error handler')
          client.on('error', (err) => {
            this._d(`[failless] handling server client error: ${maybestack(err)}`)
          })
        }
        client._register(newResumeToken)
      } catch (err) {
        this._d(`connection creation errored: ${maybestack(err)}`)
        client.close()
        return setupErrorHandler(err)
      }
    }

    const handleNewSession = (newResumeToken) => {
      this._d(`handling new session w/ token: ${newResumeToken}`)
      ;(Promise.resolve().then(() => {
        if (this._middlewares.length) {
          this._d(`running ${this._middlewares.length} middleware on client`)
          return Promise.each(this._middlewares, (middleware, idx) => {
            this._d(`calling middleware #${idx + 1}`)
            return middleware(client)
          })
        } else {
          return Promise.resolve()
        }
      }).then(() => {
        setupConnection(newResumeToken)
      }).catch((err) => {
        if (!client.isOpen()) {
          this._d('server client closed before we could finish setup')
          return setupErrorHandler(new Error('client closed before setup finish'))
        }
        if (!err) {
          this._d('a middleware rejected the connection')
          client.ws.send('err:A server middleware rejected your connection.')
        } else {
          this._d(`an error occured while processing middleware: ${maybestack(err)}`)
          setupErrorHandler(err)
        }
        client.close()
      }))
    }

    client._handshakePromise.then((obj) => {
      this._d('handshake resolved')
      const isResume = obj.isResume
      const newResumeToken = obj.newResumeToken
      if (isResume) {
        handleSessionResume(newResumeToken)
      } else {
        handleNewSession(newResumeToken)
      }
    }).catch((err) => {
      // Handshake failed, and the client has closed and cleaned up.
      setupErrorHandler(err)
    })
  }
}

module.exports = Server
