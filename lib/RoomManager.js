'use strict'

const Room = require('./Room')

class RoomManager {
  constructor () {
    this.rooms = new Map()
    this.rooms.set('all', new Room('all'))
  }

  create (name) {
    if (name === 'all') throw new Error('cannot create room "all": reserved room name')
    if (this.rooms.get(name)) return false
    this.rooms.set(name, new Room(name))
    return true
  }

  get (name, create) {
    create = (create !== false)
    if (create && name !== 'all') this.create(name)
    return this.rooms.get(name)
  }

  join (name, client, create) {
    create = (create !== false)
    if (name === 'all') throw new Error('cannot add client to room "all": reserved room')
    if (create) this.create(name)
    const room = this.get(name, false)
    if (!room) throw new Error('room not found')
    return room.add(client)
  }

  _joinAll (client) {
    this.rooms.get('all').add(client)
  }

  leave (name, client) {
    if (name === 'all') throw new Error('client cannot leave room "all" until it is disconnected')
    if (!this.get(name)) return false
    return this.get(name, false).remove(client)
  }

  _leaveAll (client) {
    this.rooms.get('all').remove(client)
  }

  clear () {
    for (let room of this.rooms.values()) {
      if (room.name === 'all') continue
      room.clear()
      this.rooms.delete(room.name)
    }
  }

  _clearAll () {
    this.rooms.get('all').clear()
  }

  removeFromAll (client) {
    for (let room of this.rooms.values()) {
      if (room.name === 'all') continue
      room.remove(client)
    }
  }
}

module.exports = RoomManager
