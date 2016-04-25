'use strict'

const path = require('path')

const Promise = require('bluebird')
const webpack = require('webpack')
const maybestack = require('maybestack')

const basedir = path.join(__dirname, '../')
const destdir = path.join(basedir, './browser-builds')

const isDebug = process.argv[2] === 'debug'

function runWebpackBuild (config, ignoreWarnings) {
  return new Promise((resolve, reject) => {
    function rejectBuild (stats, error) {
      console.log(stats.toString({
        colors: true
      }))
      reject(error)
    }

    function resolveBuild (stats) {
      if (isDebug) {
        console.log(stats.toString({
          colors: true
        }))
      }
      resolve()
    }

    webpack(config, (err, stats) => {
      if (err) return reject(err)
      if (stats.hasErrors()) return rejectBuild(stats, new Error('Build had errors'))
      if (!ignoreWarnings && stats.hasWarnings()) return rejectBuild(stats, new Error('Build had warnings'))
      resolveBuild(stats)
    })
  })
}

function * configGenerator () {
  const config = {
    context: basedir,
    entry: './src/BrowserClient.js',
    output: {
      library: 'SocketeerBrowserClient',
      libraryTarget: 'var',
      path: destdir,
      filename: 'socketeer-browser.var.debug.js'
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel',
          exclude: /node_modules/,
          query: {
            presets: ['es2015-webpack']
          }
        }
      ]
    }
  }

  // ////////////
  // debug builds
  // ////////////

  // var export
  yield {webpack: config, name: 'debug build, var export'}

  // commonjs2 export
  config.output.libraryTarget = 'commonjs2'
  config.output.filename = 'socketeer-browser.commonjs2.debug.js'
  yield {webpack: config, name: 'debug build, commonjs2 export'}

  // amd export
  config.output.libraryTarget = 'amd'
  config.output.filename = 'socketeer-browser.amd.debug.js'
  yield {webpack: config, name: 'debug build, amd export'}

  // /////////////////
  // unminified builds
  // /////////////////

  config.entry = './lib/BrowserClient.js'

  // var export
  config.output.libraryTarget = 'var'
  config.output.filename = 'socketeer-browser.var.js'
  yield {webpack: config, name: 'unminified build, var export'}

  // commonjs2 export
  config.output.libraryTarget = 'commonjs2'
  config.output.filename = 'socketeer-browser.commonjs2.js'
  yield {webpack: config, name: 'unminified build, commonjs2 export'}

  // amd export
  config.output.libraryTarget = 'amd'
  config.output.filename = 'socketeer-browser.amd.js'
  yield {webpack: config, name: 'unminified build, amd export'}

  // ///////////////
  // minified builds
  // ///////////////

  config.plugins = [
    new webpack.optimize.UglifyJsPlugin()
  ]

  // var export
  config.output.libraryTarget = 'var'
  config.output.filename = 'socketeer-browser.var.min.js'
  yield {webpack: config, name: 'minified build, var export', ignoreWarnings: true}

  // commonjs2 export
  config.output.libraryTarget = 'commonjs2'
  config.output.filename = 'socketeer-browser.commonjs2.min.js'
  yield {webpack: config, name: 'minified build, commonjs2 export', ignoreWarnings: true}

  // amd export
  config.output.libraryTarget = 'amd'
  config.output.filename = 'socketeer-browser.amd.min.js'
  yield {webpack: config, name: 'minified build, amd export', ignoreWarnings: true}
}

const config = configGenerator()

Promise.resolve().then(() => {
  return Promise.coroutine(function * () {
    while (true) {
      const yielded = config.next()
      if (yielded.done) break
      console.log(`Building: ${yielded.value.name}`)
      yield runWebpackBuild(yielded.value.webpack, yielded.value.ignoreWarnings)
    }
  })()
}).catch((err) => {
  console.log(maybestack(err))
  process.exit(1)
})
