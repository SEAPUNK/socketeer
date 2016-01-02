import debug from 'debug'

export default class Room {
  constructor (name) {
    this.name = name
    this._d = debug(`socketeer:Room[${this.name}]`)
    this._d('constructing new instance')
    this._clients = []
  }

  add (client) {
    this._d(`adding client to room: ${client.id}}`)
    if (this.exists(client)) return false
    this._clients.push(client)
    return true
  }

  remove (client) {
    this._d(`removing client from room: ${client.id}`)
    if (!this.exists(client)) return false
    let idx = this._clients.indexOf(client)
    this._clients.splice(idx, 1)
    return true
  }

  exists (client) {
    this._d(`checking if client exists in room: ${client.id}`)
    return this._clients.indexOf(client) > -1
  }

  emit (name, data) {
    this._d(`emitting ${name} to all clients in room`)
    this._clients.forEach((client) => client.emit(name, data))
  }

  clear () {
    this._d('claring room from clients')
    this._clients = []
  }
}
