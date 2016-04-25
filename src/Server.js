'use strict'

const EventEmitter = require('events').EventEmitter
const debug = require('debug') // [DEBUG]
const maybestack = require('maybestack')
const WebSocket = require('ws')
const setImmediateShim = require('set-immediate-shim')
const inspect = require('util').inspect
const RoomManager = require('./RoomManager')
const ClientPool = require('./ClientPool')
const ServerClient = require('./ServerClient')
const ServerClientPreparer = require('./ServerClientPreparer')
const SessionManager = require('./SessionManager')

class Server extends EventEmitter {
  constructor (options) {
    super()

    if (!options) options = {}

    const _d = this._d = debug('socketeer:Server') // [DEBUG]

    this._heartbeatTimeout = options.heartbeatTimeout || 15000
    this._heartbeatInterval = options.heartbeatInterval || 10000
    this._handshakeTimeout = options.handshakeTimeout || 10000
    this._failless = (options.failless !== false)
    this.supportsResuming = !!options.supportsResuming
    this.resumeAllowsDifferentIPs = !!options.resumeAllowsDifferentIPs
    this._sessionTimeout = options.sessionTimeout || 10000

    this._middlewares = []

    if (this._failless) {
      _d('[failless] attaching server error handler') // [DEBUG]
      this.on('error', (err) => {
        _d(`[failless] handling client error: ${maybestack(err)}`) // [DEBUG]
      })
    }

    this.room = new RoomManager()
    this.pool = new ClientPool()
    this.sessionManager = new SessionManager(this)

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
      opts.perMessageDeflate = opts.perMessageDeflate || false
      this.wss = new WebSocket.Server(opts, (err) => {
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
    this._d(`got error: ${maybestack(err)}`) // [DEBUG]
    this.emit('error', err)
  }

  _handleHeaders (headers) {
    this._d(`got headers: ${inspect(headers)}`) // [DEBUG]
    this.emit('headers', headers)
  }

  broadcast (name, data) {
    this._d(`broadcasting event: ${name}`) // [DEBUG]
    this.room.get('all').emit(name, data)
  }

  to (name, create) {
    return this.room.get(name, create)
  }

  use (middleware) {
    this._d('attaching middleware') // [DEBUG]
    this._middlewares.push(middleware)
    this._d(`total middleware: ${this._middlewares.length}`) // [DEBUG]
  }

  stop () {
    this._d('stopping server') // [DEBUG]
    if (!this.wss) return
    this.pool.clear()
    this.room.clear()
    this.room._clearAll()
    this.wss.removeAllListeners('error')
    this.wss.on('error', (err) => {
      this._d(`handling error of stopped server: ${maybestack(err)}`) // [DEBUG]
    })
    this.wss.close()
    delete this.wss
  }

  _handleConnection (connection) {
    this._d('got connection, preparing connection') // [DEBUG]
    const preparer = new ServerClientPreparer(connection, this)
    let client  // So handleNewSession and setupConnection
                // know which client to use

    preparer.promise.then((retval) => {
      const id = retval.id
      const ip = retval.ip
      const ws = retval.ws
      const heartbeatInterval = retval.heartbeatInterval
      const isResume = retval.isResume
      const resumeToken = retval.resumeToken
      const existingClient = retval.existingClient
      if (isResume) {
        this.pool.unreserveId(id)
      }
      if (isResume && !resumeToken) return
      if (isResume) return existingClient._replaceSocket(ws, resumeToken, ip, heartbeatInterval)

      client = new ServerClient(ws, resumeToken, id, ip, heartbeatInterval, this)
      client.on('error', () => {})
      return handleNewSession()
    }).catch((err) => {
      this.pool.unreserveId(preparer.id)
      setupErrorHandler(err)
    })

    const handleNewSession = () => {
      this._d(`handling new session w/ token: ${client._sessionToken}`) // [DEBUG]

      ;(Promise.resolve().then(() => {
        if (this._middlewares.length) {
          this._d(`running ${this._middlewares.length} middleware on client`) // [DEBUG]
          return Promise.each(this._middlewares, (middleware, idx) => {
            this._d(`calling middleware #${idx + 1}`) // [DEBUG]
            return middleware(client).then((allow) => {
              if (!allow) return Promise.reject()
              return Promise.resolve()
            })
          })
        } else {
          // Assure that the promise resolves asynchronously.
          // This is to maintain consistency that handleNewSession
          // is an async function
          return (new Promise((resolve, reject) => setImmediateShim(resolve)))
        }
      }).then(() => {
        setupConnection()
      }).catch((err) => {
        if (!client.isOpen()) {
          this._d('server client closed before we could finish setup') // [DEBUG]
          return setupErrorHandler(new Error('Connection closed before setup finish.'))
        }

        // TODO: This can be problematic.
        if (!err) {
          this._d('a middleware rejected the connection') // [DEBUG]
          client.ws.send('err:A server middleware rejected your connection.')
        } else {
          this._d(`an error occured while processing middleware: ${maybestack(err)}`) // [DEBUG]
          setupErrorHandler(err)
        }
        client.close()
      }))
    }

    const setupConnection = () => {
      this._d('finishing setup on new connection') // [DEBUG]
      try {
        client.removeAllListeners('error')
        if (!client.isOpen()) {
          this._d('server client closed before we could finish setup') // [DEBUG]
          return setupErrorHandler(new Error('client closed before setup finish'))
        }

        if (this._failless) {
          this._d('[failless] adding server client error handler') // [DEBUG]
          client.on('error', (err) => {
            this._d(`[failless] handling server client error: ${maybestack(err)}`) // [DEBUG]
          })
        }

        client._register()
      } catch (err) {
        this._d(`connection creation errored: ${maybestack(err)}`) // [DEBUG]
        client.close()
        return setupErrorHandler(err)
      }
    }

    let calledSetupErrorHandler = false
    const setupErrorHandler = (err) => {
      if (calledSetupErrorHandler) return
      calledSetupErrorHandler = true
      this._d('called setup error handler') // [DEBUG]
      if (client) {
        this.pool.unreserveId(client.id)
        this.sessionManager.unreserveToken(client._sessionToken)
        client.removeAllListeners('error')
        client.on('error', (err) => {
          this._d(`error handler called on defunct connection: ${maybestack(err)}`) // [DEBUG]
        })
      }
      this.emit('connectionSetupError', err)
    }
  }
}

module.exports = Server
