'use strict'

const ws = require('ws')
const debug = require('debug')
const suspend = require('suspend')
const {EventEmitter} = require('events')
const {inspect} = require('util')
const ClientPool = require('./ClientPool')
const ServerClient = require('./ServerClient')
const RoomManager = require('./RoomManager')
const maybestack = require('maybestack')
const {promisify} = require('bluebird')

class Server extends EventEmitter {
  constructor (options = {}) {
    super()
    this.heartbeatTimeout = options.heartbeatTimeout || 15000
    this.heartbeatInterval = options.heartbeatInterval || 10000
    this.failless = (options.failless !== false)
    this._d = debug('socketeer:Server')
    this._d('constructing new instance')
    this.room = new RoomManager()
    this.pool = new ClientPool(this)
    this._uses = []
    this._startAsync = promisify(this._start.bind(this))
    this.data = {}
  }

  _handleError (err) {
    this._d(`got 'error', ${maybestack(err)}`)
    this.emit('error', err)
  }

  _handleHeaders (headers) {
    this._d(`got 'headers', ${inspect(headers)}`)
    this.emit('headers', headers)
  }

  start (port, callback) {
    if (typeof callback === 'function') {
      this._start(port, callback)
    } else {
      return this._startAsync(port)
    }
  }

  _start (port, callback) {
    if (this.ws) throw new Error('server has already started')
    this._d(`starting server on port ${port}`)
    let opts = {
      port: port,
      // we aren't going to use deprecated protocols
      disableHixie: true,
      /**
       * @todo determine if this is a security problem
       *       over HTTPS if we left this to true
       */
      perMessageDeflate: false
    }
    this.ws = new ws.Server(opts, callback)
    this.ws.on('error', this._handleError.bind(this))
    this.ws.on('headers', this._handleHeaders.bind(this))
    this.ws.on('connection', this._handleConnection.bind(this))

    if (this.failless) {
      this._d('[failless] adding server error handler')
      this.on('error', (err) => {
        this._d(`[failless] handling server error: ${maybestack(err)}`)
      })
    }
  }

  broadcast (name, data) {
    this._d(`broadcasting: ${name}, ${data}}`)
    this.room.get('all').emit(name, data)
  }

  /**
   * Gets a room.
   * Alias to `this.room.get`
   *
   * @see RoomManager#get
   */
  to (name, create) {
    return this.room.get(name, create)
  }

  /**
   * Attaches middleware to the server.
   *
   * @param  {Function} middleware Middleware function
   */
  use (middleware) {
    this._uses.push(middleware)
  }

  /**
   * Stops the server, closing all connections, and clearing the client pool.
   */
  stop () {
    this._d('stopping server')
    if (!this.ws) return
    this.pool.clear()
    this.room.clear()
    this.room._clearAll()
    this.ws.close()
    this.removeListener('error', this._faillessHandle)
    this.ws = null
  }
}

/**
 * Handles the WebSocket server 'connection' event.
 *
 * @param {Object} connection WebSocket connection
 * @method SocketeerServer._handleConnection
 * @instance
 * @private
 */
Server.prototype._handleConnection = suspend(function *(connection) {
  this._d('got connection, creating client')

  let client = new ServerClient(connection)

  let handlePrematureError = function (err) {
    this._d('connection got an error in the middle of handshake')
    this._d(maybestack(err))
    client._emit('premature-error', err)
  }.bind(this)

  client.on('error', handlePrematureError)
  let id = this.pool._generateId()
  client._setId(id)
  this._d(`running ${this._uses.length} middleware(s) on client`)
  for (let use of this._uses) {
    if (!client.isOpen()) {
      client._emit('premature-close')
      continue
    }
    try {
      let rejectionMessage = yield use(client, suspend.resume())
      if (!client.isOpen()) {
        client._emit('premature-close')
        return
      }
      if (rejectionMessage) {
        this._d('rejecting connection with message: ' + rejectionMessage)
        client.close(4002, rejectionMessage)
        return
      }
    } catch (err) {
      if (!client.isOpen()) {
        client._emit('premature-close')
        return
      }
      this._d(`failed running a middleware on client: ${maybestack(err)}`)
      client.close(4001, 'failed executing middleware')
      return
    }
  }
  client.removeListener('error', handlePrematureError)
  if (this.failless) {
    this._d('[failless] adding client error handler')
    client.on('error', (err) => {
      this._d(`[failless] handling client error: ${maybestack(err)}`)
    })
  }
  if (!client.isOpen()) {
    client._emit('premature-close')
    return
  }
  this.pool.add(client, id)
  this.room._joinAll(client)
  this.emit('connection', client)
})

module.exports = Server
