'use strict'

const path = require('path')

module.exports = {
  context: __dirname,
  entry: './lib/BrowserClient.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'SocketeerBrowserClient'
  }
}
