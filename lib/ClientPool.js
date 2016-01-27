'use strict'

var uuid = require('uuid').v4
var debug = require('debug')

function ClientPool () {
  if (this instanceof ClientPool === false) {
    return new ClientPool()
  }
  this._d = debug('socketeer:ClientPool')
  this.pool = {}
  this._reserved = {}
}

ClientPool.prototype.add = function add (client, id) {
  this._d('adding client to pool: ' + id)
  if (this.pool[id]) throw new Error('id ' + id + ' is already in the pool (should never happen)')
  delete this._reserved[id]
  this.pool[id] = client
  return id
}

ClientPool.prototype.get = function get (id) {
  this._d('getting client with id: ' + id)
  return this.pool[id]
}

ClientPool.prototype._generateId = function _generateId () {
  this._d('generating and reserving a new id')
  var id
  while (true) {
    id = uuid()
    if (!this.pool[id] && !this._reserved[id]) break
  }
  this._reserved[id] = true
  this._d('generated a client pool id: ' + id)
  return id
}

ClientPool.prototype.forEach = function forEach (fn) {
  this._d('running a foreach function on pool')
  for (var id in this.pool) fn(this.pool[id])
}

ClientPool.prototype.remove = function remove (id) {
  this._d('removing client from pool: ' + id)
  delete this.pool[id]
}

ClientPool.prototype.clear = function clear () {
  this._d('clearing pool')
  this.pool = {}
}

module.exports = ClientPool
