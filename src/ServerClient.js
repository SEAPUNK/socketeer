'use strict'

const debug = require('debug')
const ClientAbstract = require('./ClientAbstract')

class ServerClient extends ClientAbstract {
  constructor (ws, server) {
    super()
    this.ws = ws
    this._d = debug('socketeer:ServerClient')
    this.ip = ws._socket.remoteAddress
    this._d(`new ServerClient from IP address: ${this.ip}`)
    this.server = server
    // TODO: Begin the handshake.
  }

  _replaceSocket (ws) {
    this._d(`hot-swapping websockets for ServerClient id ${ws}`)
    // TODO: Detach current ws's events.
    this.ws = ws
    this.ip = ws._socket.remoteAddress
    this._d(`hot-swapped websocket's IP address: ${this.ip}`)
    // TODO: Attach this websocket's events.
    // TODO: Resume the message feed.
  }

  _register () {
    this.server.pool.add(this, this.id)
    this.server.room._joinAll(this)
    this.server.emit('connection', this)
  }

  _awaitHandshake () {
    return new Promise((resolve, reject) => {

    })
  }
}

module.exports = ServerClient
