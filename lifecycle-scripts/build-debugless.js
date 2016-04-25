'use strict'

const fs = require('fs')
const path = require('path')

const maybestack = require('maybestack')
const Promise = require('bluebird')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const srcdir = path.join(__dirname, '../src')
const destdir = path.join(__dirname, '../lib/debugless')
const destdebugdir = path.join(__dirname, '../lib/debug')

const debuglines = /^.*?\[DEBUG\]$\n/gm

Promise.resolve().then(() => {
  console.log('Cleaning destdir')
  rimraf.sync(destdir)
  rimraf.sync(destdebugdir)

  console.log('Preparing destdir')
  mkdirp.sync(destdir)
  mkdirp.sync(destdebugdir)

  console.log('Fetching srcdir')
  const srcfiles = fs.readdirSync(srcdir)
  for (let srcfile of srcfiles) {
    console.log(`Processing: ${srcfile}`)
    const file = fs.readFileSync(path.join(srcdir, srcfile), 'utf-8')
    const stripped = file.replace(debuglines, '')
    fs.writeFileSync(path.join(destdir, srcfile), stripped)
    fs.writeFileSync(path.join(destdebugdir, srcfile), file)
  }
}).catch((err) => {
  console.log(maybestack(err))
  process.exit(1)
})
