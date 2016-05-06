'use strict'

import Client from './Client'
import ws from 'ws'

class NodeClient extends Client {
  constructor (address, options) {
    super(address, options, ws, false)
  }
}

export default NodeClient
