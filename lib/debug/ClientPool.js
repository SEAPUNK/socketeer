'use strict'

const uuid = require('uuid').v4
const debug = require('debug') // [DEBUG]

class ClientPool {
  constructor () {
    this._d = debug('socketeer:ClientPool') // [DEBUG]

    this.pool = new Map()
    this.reserved = new Set()
  }

  add (client, id) {
    this._d(`adding client to pool: ${id}`) // [DEBUG]
    if (this.pool.get(id)) throw new Error(`id ${id} is already in the pool`)
    this.unreserveId(id)
    this.pool.set(id, client)
    return id
  }

  get (id) {
    this._d(`getting client with id: ${id}`) // [DEBUG]
    return this.pool.get(id)
  }

  generateId () {
    this._d('generating and reserving a new client id') // [DEBUG]
    let id
    while (true) {
      id = uuid()
      if (!this.pool.get(id) && !this.reserved.has(id)) break
    }
    this.reserved.add(id)
    this._d(`generated a client id: ${id}`) // [DEBUG]
    return id
  }

  forEach (fn) {
    this._d('running a foreach function on pool') // [DEBUG]
    for (let client of this.pool.values()) {
      fn(client)
    }
  }

  remove (id) {
    this._d(`removing client from pool: ${id}`) // [DEBUG]
    this.pool.delete(id)
  }

  clear () {
    this._d('clearing pool') // [DEBUG]
    this.pool = new Map()
  }

  unreserveId (id) {
    this._d(`unreserving id: ${id}`) // [DEBUG]
    this.reserved.delete(id)
  }
}

module.exports = ClientPool
