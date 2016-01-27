'use strict'

var debug = require('debug')

function Room (name) {
  if (this instanceof Room === false) {
    return new Room(name)
  }
  if (!name) throw new Error('no name specified')
  var self = this
  self.name = name
  self._d = debug('socketeer:Room[' + name + ']')
  self._d('constructing new instance')
  self._clients = []
}

Room.prototype.add = function add (client) {
  this._d('adding client to room: ' + client.id)
  if (!this.exists(client)) return false
  this._clients.push(client)
  return true
}

Room.prototype.remove = function remove (client) {
  this._d('removing client from room: ' + client.id)
  if (!this.exists(client)) return false
  var idx = this._clients.indexOf(client)
  this._clients.splice(idx, 1)
  return true
}

Room.prototype.exists = function exists (client) {
  this._d('checking if client exists in room: ' + client.id)
  return this._clients.indexOf(client) !== -1
}

Room.prototype.emit = function emit (name, data) {
  this._d('emitting ' + name + ' to all clients in room')
  this._clients.forEach(function _clientsForEach (client) {
    client.emit(name, data)
  })
}

Room.prototype.clear = function clear () {
  this._d('clearing room from clients')
  this._clients = []
}

module.exports = Room
