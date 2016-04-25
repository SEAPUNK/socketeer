'use strict'


class Room {
  constructor (name) {
    if (!name) throw new Error('no name specified')
    this.name = name
    this._clients = new Set()
  }

  add (client) {
    if (!this.exists(client)) return false
    this._clients.add(client)
    return true
  }

  remove (client) {
    if (!this.exists(client)) return false
    this._clients.delete(client)
    return true
  }

  exists (client) {
    return this._clients.has(client)
  }

  emit (name, data) {
    for (let client of this._clients) {
      client.emit(name, data)
    }
  }

  clear () {
    this._clients = new Set()
  }
}

module.exports = Room
