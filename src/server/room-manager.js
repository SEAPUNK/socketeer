import debug from 'debug'
import Room from './room'

export default class RoomManager {
  /**
   * Creates the room manager.
   * @return {RoomManager} Room manager.
   */
  constructor () {
    this._d = debug('socketeer:RoomManager')
    this._d('constructing new instance')
    this._rooms = {
      all: new Room('all')
    }
  }

  /**
   * Creates a room.
   *
   * @param  {String} name Room name
   * @return {Boolean} True if room didn't exist before, false if otherwise
   * @throws If room name is 'all'
   */
  create (name) {
    this._d(`creating room with name ${name}`)
    if (name === 'all') throw new Error('cannot create room "all": reserved room name')
    if (this._rooms[name]) return false
    this._d('room does not exist, creating')
    this._rooms[name] = new Room(name)
    return true
  }

  /**
   * Gets a room with specified name.
   * @param  {String}  name   Room name
   * @param  {Boolean} create Whether to create room if it doesn't exist
   * @return {Room} Room
   */
  get (name, create = true) {
    this._d(`getting room ${name}, create ${create}`)
    if (create) this.create(name)
    return this._rooms[name]
  }

  /**
   * Adds a client to a room.
   *
   * @see  Room.add
   * @param  {String} name Room name
   * @param  {SocketeerServerClient} client Server client
   * @return Whatever Room.add returns
   * @throws If room is 'all'
   */
  join (name, client) {
    this._d(`adding client to room ${name}: ${client.id}`)
    if (name === 'all') throw new Error('cannot add client to room "all": reserved room')
    this.create(name)
    return this._rooms[name].add(client)
  }

  /**
   * Adds a client to the 'all' room
   * @param  {SocketeerServerClient} client Server client
   * @private
   */
  _joinAll (client) {
    this._d(`adding client to "all" room: ${client.id}`)
    this._rooms['all'].add(client)
  }

  /**
   * Removes a client from the room.
   * @see  Room.remove
   * @param  {String} name   Room name
   * @param  {SocketeerServerClient} client Server client
   * @return Whatever Room.remove returns
   * @throws If room name is 'all'
   */
  leave (name, client) {
    this._d(`removing client from ${name} room: ${client.id}`)
    if (name === 'all') throw new Error('client cannot leave room "all" until it is disconnected')
    if (!this._rooms['all']) return false
    return this._rooms[name].remove(client)
  }

  /**
   * Removes client from the 'all' room
   * @param  {SocketeerServerClient} client Server client
   * @private
   */
  _leaveAll (client) {
    this._d(`removing client from "all" room: ${client.id}`)
    this._rooms['all'].remove(client)
  }

  /**
   * Goes through each room (except 'all'), clearing them of clients and then
   * removing the room from the manager
   */
  clear () {
    this._d('clearing rooms')
    for (let name in this._rooms) {
      let room = this._rooms[name]
      if (name === 'all') continue
      room.clear()
      delete this._rooms[name]
    }
  }

  /**
   * Removes all clients from the 'all' room
   * @private
   */
  _clearAll () {
    this._d('clearing the "all" room')
    this.get('all').clear()
  }

  /**
   * Removes client from all rooms (except 'all')
   * @param  {SocketeerServerClient} client Server client
   */
  removeAll (client) {
    this._d('removing client from all rooms (except "all")')
    for (let name in this._rooms) {
      let room = this._rooms[name]
      if (name === 'all') continue
      room.remove(client)
    }
  }
}
