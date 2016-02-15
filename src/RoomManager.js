'use strict'

var debug = require('debug')
var Room = require('./Room')

function RoomManager () {
  if (this instanceof RoomManager === false) {
    return new RoomManager()
  }
  var self = this
  self._d = debug('socketeer:RoomManager')
  self._d('constructing new instance')
  self._rooms = {
    all: new Room('all')
  }
}

RoomManager.prototype.create = function create (name) {
  this._d('creating a room with name ' + name)
  if (name === 'all') throw new Error('cannot create room "all": reserved room name')
  if (this._rooms[name]) return false
  this._d('room "' + name + '" does not exist, creating')
  this._rooms[name] = new Room(name)
  return true
}

RoomManager.prototype.get = function get (name, create) {
  create = (create !== false)
  this._d('getting room "' + name + '", create: ' + create)
  if (create && name !== 'all') this.create(name)
  return this._rooms[name]
}

RoomManager.prototype.join = function join (name, client, create) {
  create = (create !== false)
  this._d('adding client (' + client.id + ') to room: ' + name)
  if (name === 'all') throw new Error('cannot add client to room "all": reserved room')
  if (create) this.create(name)
  var room = this._rooms[name]
  if (!room) throw new Error('room not found')
  return room.add(client)
}

RoomManager.prototype._joinAll = function _joinAll (client) {
  this._d('adding client to "all" room: ' + client.id)
  this._rooms['all'].add(client)
}

RoomManager.prototype.leave = function leave (name, client) {
  this._d('removing client (' + client.id + ') from room: ' + name)
  if (name === 'all') throw new Error('client cannot leave room "all" until it is disconnected')
  if (!this._rooms[name]) return false
  return this._rooms[name].remove(client)
}

RoomManager.prototype._leaveAll = function _leaveAll (client) {
  this._d('removing client from "all" room: ' + client.id)
  this._rooms['all'].remove(client)
}

RoomManager.prototype.clear = function clear () {
  this._d('clearing all rooms')
  for (var name in this._rooms) {
    if (name === 'all') continue
    var room = this._rooms[name]
    room.clear()
    delete this._rooms[name]
  }
}

RoomManager.prototype._clearAll = function _clearAll () {
  this._d('clearing the "all" room')
  this._rooms['all'].clear()
}

RoomManager.prototype.removeAll = function _removeAll (client) {
  this._d('removing client (' + client.id + ') from all rooms (except "all")')
  for (var name in this._rooms) {
    if (name === 'all') continue
    var room = this._rooms[name]
    room.remove(client)
  }
}

module.exports = RoomManager
