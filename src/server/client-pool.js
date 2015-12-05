import uuid from 'uuid'
import debug from 'debug'

export default class ClientPool {
  constructor (manager) {
    this._d = debug('socketeer:ClientPool')
    this._d('constructing new instance')
    this._roomManager = manager.room
    this.pool = {}
    this._reserved = {}
  }

  add (client, id) {
    this._d(`adding client ${id} to pool`)
    if (this.pool[id]) throw new Error(`id ${id} is already in the pool (should never happen)`)
    delete this._reserved[id]
    client.register(this)
    this.pool[id] = client
    return id
  }

  get (id) {
    this._d(`getting client with id ${id}`)
    return this.pool[id]
  }

  _generateId () {
    this._d('generating and reserving a new id')
    let id
    while (true) {
      id = uuid.v4()
      if (!this.pool[id] && !this._reserved[id]) break
    }
    this._reserved[id] = true
    this._d(`generated client pool id: ${id}`)
    return id
  }

  forEach (fn) {
    this._d('running a foreach function on pool')
    for (let client in this.pool) fn(client)
  }

  remove (id) {
    this._d(`removing client ${id} from pool`)
    delete this.pool[id]
  }

  clear () {
    this._d('clearing pool')
    this.pool = {}
  }
}
