'use strict'

const Client = require('./Client')

class BrowserClient extends Client {
  constructor (address, options) {
    super(address, options, window.WebSocket)
    this._isBrowserClient = true
  }
}

module.exports = BrowserClient
