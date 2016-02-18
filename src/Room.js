'use strict'

const debug = require('debug')

class Room {
  constructor (name) {
    if (!name) throw new Error('no name specified')
    this.name = name
    this._d = debug(`socketeer:Room[${name}]`)
    this._d('constructing new instance')
    this._clients = new Set()
  }

  add (client) {
    this._d(`adding client to room: ${client.id}`)
    if (!this.exists(client)) return false
    this._clients.add(client)
    return true
  }

  remove (client) {
    this._d(`removing client from room: ${client.id}`)
    if (!this.exists(client)) return false
    this._clients.delete(client)
    return true
  }

  exists (client) {
    this._d(`checking if client exists in room: ${client.id}`)
    return this._clients.has(client)
  }

  emit (name, data) {
    this._d(`emitting ${name} to all clients in room`)
    for (let client of this._clients) {
      client.emit(name, data)
    }
  }

  clear () {
    this._d('clearing room from clients')
    this._clients = new Set()
  }
}

module.exports = Room
