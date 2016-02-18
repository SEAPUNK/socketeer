'use strict'

const debug = require('debug')
const Room = require('./Room')

class RoomManager {
  constructor (server) {
    this._d = debug('socketeer:RoomManager')
    this.server = server
    this.rooms = new Map()
    this.rooms.set('all', new Room('all'))
  }

  create (name) {
    this._d(`creating a room with name ${name}`)
    if (name === 'all') throw new Error('cannot create room "all": reserved room name')
    if (this.rooms.get(name)) return false
    this._d(`room ${name} does not exist, creating`)
    this.rooms.set(name, new Room(name))
    return true
  }

  get (name, create) {
    create = (create !== false)
    this._d(`getting room ${name}, create: ${create}`)
    if (create && name !== 'all') this.create(name)
    return this.rooms.get(name)
  }

  join (name, client, create) {
    create = (create !== false)
    this._d(`adding client (${client.id}) to room: ${name}`)
    if (name === 'all') throw new Error('cannot add client to room "all": reserved room')
    if (create) this.create(name)
    const room = this.get(name, false)
    if (!room) throw new Error('room not found')
    return room.add(client)
  }

  _joinAll (client) {
    this._d(`adding client to "all" room: ${client.id}`)
    this.rooms.get('all').add(client)
  }

  leave (name, client) {
    this._d(`removing client (${client.id}) from room: ${name}`)
    if (name === 'all') throw new Error('client cannot leave room "all" until it is disconnected')
    if (!this.get(name)) return false
    return this.get(name, false).remove(client)
  }

  _leaveAll (client) {
    this._d(`removing client from "all" room: ${client.id}`)
    this.rooms.get('all').remove(client)
  }

  clear () {
    this._d('clearing all rooms')
    for (let room of this.rooms.values()) {
      if (room.name === 'all') continue
      room.clear()
      this.rooms.delete(room.name)
    }
  }

  _clearAll () {
    this._d('clearing the "all" room')
    this.rooms.get('all').clear()
  }

  removeFromAll (client) {
    this._d(`removing client (${client.id}) from all rooms (except "all")`)
    for (let room of this.rooms.values()) {
      if (room.name === 'all') continue
      room.remove(client)
    }
  }
}

module.exports = RoomManager