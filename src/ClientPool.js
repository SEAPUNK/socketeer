'use strict'

const uuid = require('uuid').v4
const debug = require('debug')
const randomBytes = require('crypto').randomBytes
const forever = require('async').forever

class ClientPool {
  constructor (server) {
    this._d = debug('socketeer:ClientPool')

    this.server = server
    this.pool = new Map()
    this._reservedIds = new Set()

    this.sessionPool = new Map()
    this._reservedTokens = new Set()
    this._deletedTokens = new Map()
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
    return new Promise((resolve, reject) => {
      this._d('attempting session resume')
      const session = this.sessionPool.get(token)
      if (!session) return resolve(null)
      if (session.active) return resolve(null)
      // TODO: Issue #22
      if (ip !== session.ip) return resolve(null)
      // Otherwise, we can re-mark as active, and set it to a new token.
      this._d('session resume seems OK, generating new token')
      // This to ensure the timeout does not run, and if it did,
      // that it does not clean up ServerClient.
      clearTimeout(session.timeout)
      session.isResuming = true
      this.reserveNewToken().then((token) => {
        // Throw an error if no new token was generated.
        // Not supposed to happen, basically.
        if (!token) throw new Error('no token was generated during session resume attempt')
        // Race condition: If there are multiple connections trying to resume the same
        // inactive session, the session that got a new token first wins the session.
        if (!session.active) return resolve(null)
        session.active = true

      }).catch((err) => {

      })
      

      if (session.active) return false

      this.deleteToken(token)
      const newToken = this.generateToken()
      session.client._resumeToken = newToken
      this.sessionPool.set(newToken, {
        client: session.client,
        ip: session.ip,
        // Whether the session is active _right now_.
        // Reject any session resume attempts on active sessions.
        active: true,
        // Whether the session is in the process of resuming (generating a new token)
        // If the timeout gets called, instead of cleaning the existing session,
        // it will mark timeoutCalled as true, so attemptResume will be sure to clean
        // the session if the token generation fails.
        isResuming: false,
        // If the timeout got called. If an error occurs during token generation,
        // then we can go ahead and clean up the session.
        timeoutCalled: false,
        // The session timeout.
        timeout: null
      })
      return newToken
    })
  }

  reserveNewToken () {
    return new Promise((resolve, reject) => {
      if (!this.server.supportsResuming) return resolve(null)
      forever((next) => {
        this.generateToken().then((token) => {
          if (this.tokenInUse(token)) return next()
          // TODO: Assert that the jump from loop to error handler in async.forever
          // is synchronous. If it is, then we can remove _reservedTokens altogether.
          this._reservedTokens.add(token)
          next({
            isOkay: true,
            token: token
          })
        }).catch((err) => {
          next(err)
        })
      }, (err) => {
        if (err && err.isOkay) {
          this._reservedTokens.delete(err.token)
          resolve(err.token)
        } else {
          reject(err)
        }
      })
    })
  }

  tokenInUse (token) {
    return !!(
      this.sessionPool.get(token) ||
      this._reservedTokens.has(token) ||
      this._deletedTokens.get(token)
    )
  }

  generateToken () {
    // TODO: Non-cryptographically secure token configuration
    // TODO: Stronger generation (hex is only half-effective string length-wise)
    return new Promise((resolve, reject) => {
      if (!this.server.supportsResuming) return resolve(null)
      randomBytes(75, (err, buf) => {
        if (err) return reject(err)
        const token = buf.toString('hex')
        return resolve(token)
      })
    })
  }

  deleteToken (token) {
    this._d('deleting session resume token')
    const session = this.sessionPool.get(token)
    // TODO: Should this throw an error instead?
    if (!session) return false
    this.sessionPool.delete(token)
    // The session should have already called (or cleared) the timeout
    // and whatnot, so we're not doing any of that.
    const timeout = setTimeout(() => {
      this._deletedTokens.delete(token)
    }, (1000 * 60 * 60 * 6)) // TODO: 6 hours ATM, but make configurable.
    this._deletedTokens.set(token, {
      timeout: timeout
    })
  }
}

module.exports = ClientPool
