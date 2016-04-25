'use strict'

const randomBytes = require('crypto').randomBytes
const forever = require('async.forever')

class SessionManager {
  constructor (server) {
    this.server = server
    this.sessions = new Map()
    this.reserved = new Set()
    this.deleted = new Map()
  }

  reserveNewToken () {
    return new Promise((resolve, reject) => {
      if (!this.server.supportsResuming) {
        return resolve(null)
      }
      forever((next) => {
        this.generateToken().then((token) => {
          if (this.tokenInUse(token)) return next()
          this.reserved.add(token)
          next({
            isOkay: true,
            token: token
          })
        }).catch((err) => {
          next(err)
        })
      }, (err) => {
        if (err && err.isOkay) {
          resolve(err.token)
        } else {
          reject(err)
        }
      })
    })
  }

  unreserveToken (token) {
    this.reserved.delete(token)
  }

  attemptResume (token, ip) {
    return new Promise((resolve, reject) => {
      const session = this.sessions.get(token)
      if (!session) return resolve({newToken: null})
      if (session.active) return resolve({newToken: null})
      if (!this.server.resumeAllowsDifferentIPs && ip !== session.ip) return resolve({newToken: null})
      // Otherwise, we can re-mark as active, and set it to a new token.
      // This to ensure the timeout does not run, and if it did,
      // that it does not clean up ServerClient.
      clearTimeout(session.timeout)
      session.isResuming = true
      this.reserveNewToken().then((newToken) => {
        session.isResuming = false
        // Throw an error if no new token was generated.
        // Not supposed to happen, basically.
        if (!newToken) throw new Error('no token was generated during session resume attempt')
        // Race condition: If there are multiple connections trying to resume the same
        // inactive session, the session that got a new token first wins the session.
        if (session.active) return resolve({newToken: null})
        session.active = true // This is just to let other session resume attempts
                              // know that the session is no longer available.
        this.createSession(newToken, session.client, ip)
        this.deleteSession(token)
        resolve({
          newToken: newToken,
          existingClient: session.client
        })
      }).catch((err) => {
        if (session.timeoutCalled) {
          this.cleanSession(token, session)
        }
        reject(err)
      })
    })
  }

  deleteSession (token) {
    const session = this.sessions.get(token)
    // TODO: Should this throw an error instead?
    if (!session) return false
    this.sessions.delete(token)
    // The session should have already called (or cleared) the timeout
    // and whatnot, so we're not doing any of that.
    const timeout = setTimeout(() => {
      this.deleted.delete(token)
    }, (1000 * 60 * 60 * 6)) // TODO: 6 hours ATM, but make configurable.
    this.deleted.set(token, {
      timeout: timeout
    })
  }

  createSession (token, client, ip) {
    this.sessions.set(token, {
      client: client,
      ip: ip,
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
  }

  cleanSession (token, session, isManual) {
    this.deleteSession(token)
    session.client._destroySession(isManual)
  }

  deactivateSession (token, destroy) {
    const session = this.sessions.get(token)
    if (!session) return // TODO: Throw an error instead?
    if (!session.active) return // TODO: Throw an error instead?
    if (session.timeout) return // TODO: Throw an error instead?
    session.active = false
    const cleanFn = () => {
      if (session.active) return
      if (session.isResuming) {
        session.timeoutCalled = true
        return
      }
      this.cleanSession(token, session, destroy)
    }
    if (destroy) {
      cleanFn()
    } else {
      session.timeout = setTimeout(cleanFn, this.server._sessionTimeout)
    }
  }

  tokenInUse (token) {
    return !!(
      this.sessions.get(token) ||
      this.reserved.has(token) ||
      this.deleted.get(token)
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
}

module.exports = SessionManager
