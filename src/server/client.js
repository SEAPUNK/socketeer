import debug from 'debug'
import ClientAbstract from '../common/client-abstract'

export default class ServerClient extends ClientAbstract {
  constructor (ws) {
    super()
    this.ws = ws
    this._d = debug('socketeer:SocketeerServerClient')
    this.ip = ws._socket.remoteAddress
    this._attachEvents()
  }

  _setId (id) {
    this._d(`setting client ID to ${id}`)
    if (this.id) {
      this._d('could not set ID (already set)')
      throw new Error('socket already has an ID')
    }
    this.id = id
  }

  _register (pool) {
    /**
     * @todo prevent certain functions from being called
     *       until the socket is registered
     */
    this._pool = pool
    this._registered = true
    let interval = pool._manager.heartbeatInterval
    this.ws.send(`hi${interval}`)
    this._startHeartbeat()
  }

  join (name) {
    return this._pool._roomManager.join(name, this)
  }

  leave (name) {
    return this._pool._roomManager.leave(name, this)
  }

  _startHeartbeat () {
    this._d('starting heartbeat loop')
    this._heartbeatLoop = setTimeout(() => {
      this.ws.send('h')
      this._heartbeatTimeout = setTimeout(() => {
        this._emit('timeout')
        this.kill()
      }, this._pool._manager.heartbeatTimeout)
    }, this._pool._manager.heartbeatInterval)
  }

  _stopHeartbeat () {
    this._d('stopping heartbeat loop')
    clearTimeout(this._heartbeatLoop)
    clearTimeout(this._heartbeatTimeout)
  }

  _handleHeartbeat () {
    this._d('handling heartbeat')
    this._stopHeartbeat()
    this._startHeartbeat()
  }

  _handleMessage (data, flags) {
    this._d('handling message')
    if (!this.isOpen()) {
      this._d('ignoring message, as socket is not open')
      return
    }
    if (data === 'h') {
      this._handleHeartbeat()
      return
    }
    super._handleMessage(data, flags)
  }

  _handleClose (code, message, error) {
    this._d('handling close')

    if (this._registered) {
      this._pool._roomManager.removeAll(this)
      this._pool._roomManager._leaveAll(this)
      this._stopHeartbeat()
      this._pool.remove(this.id)
    }

    super._handleClose(code, message, error)
  }
}
