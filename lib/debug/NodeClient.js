'use strict'

const Client = require('./Client')
const ws = require('ws')

class NodeClient extends Client {
  constructor (address, options) {
    super(address, options, ws, false)
  }
}

module.exports = NodeClient
