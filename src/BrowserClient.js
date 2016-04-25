'use strict'

import Client from './Client'

class BrowserClient extends Client {
  constructor (address, options) {
    super(address, options, window.WebSocket, true)
  }
}

module.exports = BrowserClient
