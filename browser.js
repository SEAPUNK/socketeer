'use strict'

const path = require('path')

const libraryTargets = [
  'amd',
  'var',
  'commonjs2'
]

const suffixes = [
  'debug',
  'min',
  'plain'
]

const paths = {}

for (let target of libraryTargets) {
  paths[target] = {}
  for (let suffix of suffixes) {
    let filename = [
      'socketeer-browser',
      target
    ]
    if (suffix !== 'plain') {
      filename.push(suffix)
    }
    filename.push('js')

    paths[target][suffix] = path.join(__dirname, `browser-builds/${filename.join('.')}`)
  }
}

module.exports = paths
