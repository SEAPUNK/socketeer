'use strict'

const uuid = require('uuid').v4
const debug = require('debug')

class ClientPool {
  constructor () {
    this._d = debug('socketeer:ClientPool')
    this.pool = new Map()
    this._reservedIds = new Set()
    this._sessionPool = new Map()
  }

  add (client, id) {
    this._d(`adding client to pool: ${id}`)
    if (this.pool.get(id)) throw new Error(`id ${id} is already in the pool`)
    this._reservedIds.delete(id)
    this.pool.add(id, client)
    return id
  }

  get (id) {
    this._d(`getting client with id: ${id}`)
    return this.pool.get(id)
  }

  generateId () {
    this._d('generating and reserving a new client id')
    let id
    while (true) {
      id = uuid()
      if (!this.pool.get(id) && !this._reservedIds.has(id)) break
    }
    this._reservedIds.add(id)
    this._d(`generated a client id: ${id}`)
    return id
  }

  forEach (fn) {
    this._d('running a foreach function on pool')
    for (let client of this.pool.values()) {
      fn(client)
    }
  }

  remove (id) {
    this._d(`removing client from pool: ${id}`)
    this.pool.delete(id)
  }

  clear () {
    this._d('clearing pool')
    this.pool = new Map()
  }

  unreserveId (id) {
    this._d(`unreserving id: ${id}`)
    this._reservedIds.delete(id)
  }

  attemptResume () {
    // TODO: Something something check if supports session resuming
  }
}

module.exports = ClientPool
