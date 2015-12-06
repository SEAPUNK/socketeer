import debug from 'debug'
import Room from './room'

export default class RoomManager {
  constructor () {
    this._d = debug('socketeer:RoomManager')
    this._d('constructing new instance')
    this._rooms = {
      all: new Room('all')
    }
  }

  create (name) {
    this._d(`creating room with name ${name}`)
    if (name === 'all') throw new Error('cannot create room "all": reserved room name')
    if (this._rooms[name]) return false
    this._d('room does not exist, creating')
    this._rooms[name] = new Room(name)
    return true
  }

  get (name, create = true) {
    this._d(`getting room ${name}, create ${create}`)
    if (create) this.create(name)
    return this._rooms[name]
  }

  join (name, client) {
    this._d(`adding client to room ${name}: ${client.id}`)
    if (name === 'all') throw new Error('cannot add client to room "all": reserved room')
    this.create(name)
    this._rooms[name].add(client)
  }

  _joinAll (client) {
    this._d(`adding client to "all" room: ${client.id}`)
    this._rooms['all'].add(client)
  }

  leave (name, client) {
    this._d(`removing client from ${name} room: ${client.id}`)
    if (name === 'all') throw new Error('client cannot leave room "all" until it is disconnected')
    if (!this._rooms['all']) return false
    return this._rooms[name].remove(client)
  }

  _leaveAll (client) {
    this._d(`removing client from "all" room: ${client.id}`)
    this._rooms['all'].remove(client)
  }

  clear () {
    this._d('clearing rooms')
    for (let name in this._rooms) {
      let room = this._rooms[name]
      if (name === 'all') continue
      room.clear()
      delete this._rooms[name]
    }
    this.get('all').clear()
  }

  removeAll (client) {
    this._d('removing client from all rooms (except "all")')
    for (let name in this._rooms) {
      let room = this._rooms[name]
      if (name === 'all') continue
      room.remove(client)
    }
  }
}
