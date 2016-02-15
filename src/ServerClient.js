'use strict'

const ClientAbstract = require('./ClientAbstract')

class ServerClient extends ClientAbstract {
  _register () {
    this.pool.add(client, id)
    this.room._joinAll(client)
    this.emit('connection', client)
  }
}

module.exports = ServerClient
