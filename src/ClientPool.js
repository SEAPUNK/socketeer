'use strict'

const uuid = require('uuid').v4
const debug = require('debug')
const randomBytes = require('crypto').randomBytes
const forever = require('async').forever

class ClientPool {
  constructor () {
    this._d = debug('socketeer:ClientPool')
    this.pool = new Map()
    this._reservedIds = new Set()
    this._sessionPool = new Map()
    this._deletedSessions = new Map()
  }

  add (client, id) {
    this._d(`adding client to pool: ${id}`)
    if (this.pool.get(id)) throw new Error(`id ${id} is already in the pool`)
    this.unreserveId(id)
    this.pool.add(id, client)
    return id
  }

  get (id) {
    this._d(`getting client with id: ${id}`)
    return this.pool.get(id)
  }

  generateId () {
    this._d('generating and reserving a new client id')
    let id
    while (true) {
      id = uuid()
      if (!this.pool.get(id) && !this._reservedIds.has(id)) break
    }
    this._reservedIds.add(id)
    this._d(`generated a client id: ${id}`)
    return id
  }

  forEach (fn) {
    this._d('running a foreach function on pool')
    for (let client of this.pool.values()) {
      fn(client)
    }
  }

  remove (id) {
    this._d(`removing client from pool: ${id}`)
    this.pool.delete(id)
  }

  clear () {
    this._d('clearing pool')
    this.pool = new Map()
  }

  unreserveId (id) {
    this._d(`unreserving id: ${id}`)
    this._reservedIds.delete(id)
  }

  attemptResume (token, ip) {
    this._d('attempting session resume')
    const session = this._sessionPool.get(token)
    if (!session) return false
    if (session.active) return false
    // TODO: Issue #22
    if (ip !== session.ip) return false
    // Otherwise, we can re-mark as active, and set it to a new token.
    this._d('session resume OK')
    // This to ensure the timeout does not run.
    // That, and so the same session does not get resumed.
    session.active = true
    clearTimeout(session.timeout)
    this.deleteToken(token)
    const newToken = this.generateToken()
    session.client._resumeToken = newToken
    this._sessionPool.set(newToken, {
      client: session.client,
      ip: session.ip,
      active: true,
      timeout: null
    })
    return newToken
  }

  generateToken () {
    // TODO: Non-cryptographically secure token configuration
    // TODO: Stronger generation (hex is only half-effective string length-wise)
    return new Promise((resolve, reject) => {
      forever((next) => {
        randomBytes(75, (err, buf) => {
          if (err) return next(err)
          const token = buf.toString('hex')
          
        })
      }, (err) => {
        if (
          typeof err === 'string' &&
          err.indexOf('ok') === 0
        ) return resolve(err.replace(/^ok/, ''))
        reject(err)
      })      
    })
  }

  deleteToken (token) {
    this._d('deleting session resume token')
    const session = this._sessionPool.get(token)
    // TODO: Should this throw an error instead?
    if (!session) return false
    this._sessionPool.delete(token)
    // The session should have already called (or cleared) the timeout
    // and whatnot, so we're not doing any of that.
    const timeout = setTimeout(() => {
      this._deletedSessions.delete(token)
    }, (1000 * 60 * 60 * 6)) // TODO: 6 hours ATM, but make configurable.
    this._deletedSessions.set(token, {
      timeout: timeout
    })
  }
}

module.exports = ClientPool
