'use strict'

const uuid = require('uuid').v4

class ClientPool {
  constructor () {

    this.pool = new Map()
    this.reserved = new Set()
  }

  add (client, id) {
    if (this.pool.get(id)) throw new Error(`id ${id} is already in the pool`)
    this.unreserveId(id)
    this.pool.set(id, client)
    return id
  }

  get (id) {
    return this.pool.get(id)
  }

  generateId () {
    let id
    while (true) {
      id = uuid()
      if (!this.pool.get(id) && !this.reserved.has(id)) break
    }
    this.reserved.add(id)
    return id
  }

  forEach (fn) {
    for (let client of this.pool.values()) {
      fn(client)
    }
  }

  remove (id) {
    this.pool.delete(id)
  }

  clear () {
    this.pool = new Map()
  }

  unreserveId (id) {
    this.reserved.delete(id)
  }
}

module.exports = ClientPool
