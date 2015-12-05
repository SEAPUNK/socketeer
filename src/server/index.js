import ws from 'ws'
import debug from 'debug'
import suspend from 'suspend'
import {EventEmitter} from 'events'
import {inspect} from 'util'
import ClientPool from './client-pool'
import Client from './client'
import RoomManager from './room-manager'
import maybeStack from 'maybestack'

export default class SocketeerServer extends EventEmitter {
  constructor (options = {}) {
    super()
    this.heartbeatTimeout = options.heartbeatTimeout || 15000
    this.heartbeatInterval = options.heartbeatInterval || 10000
    this._d = debug('socketeer:SocketeerServer')
    this._d('constructing new instance')
    this.room = new RoomManager()
    this.pool = new ClientPool(this)
    this._uses = []
    this.data = {}
  }

  _handleError (err) {
    this._d(`got 'error', ${maybeStack(err)}`)
    this.emit('error', err)
  }

  _handleHeaders (headers) {
    this._d(`got 'headers', ${inspect(headers)}`)
    this.emit('headers', headers)
  }

  start (port, callback) {
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
  }

  broadcast (name, data) {
    this._d(`broadcasting: ${name}, ${data}}`)
    this.room.get('all').emit(name, data)
  }

  to (name, create) {
    return this.room.get(name, create)
  }

  use (middleware) {
    this._uses.push(middleware)
  }

  stop () {
    this._d('stopping server')
    if (!this.ws) return
    this.pool.clear()
    this.room.clear()
    this.ws.close()
    this.ws = null
  }
}

SocketeerServer.prototype._handleConnection = suspend(function *(connection) {
  this._d('got connection, creating client')
  let client = new Client(connection)
  let id = this.pool.generateId()
  client.setId(id)
  this._d(`running ${this._uses.length} middleware(s) on client`)
  for (let use of this._uses) {
    try {
      let rejectionMessage = yield use(client, suspend.resume())
      if (rejectionMessage) {
        client.close(4002, rejectionMessage)
        return
      }
    } catch (err) {
      this._d(`failed running a middleware on client: ${maybeStack(err)}`)
      client.close(4001, 'failed executing middleware')
      return
    }
  }
  this.pool.add(client, id)
  this.room._joinAll(client)
  this.emit('connection', client)
})
