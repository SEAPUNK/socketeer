import uuid from 'uuid'
import debug from 'debug'

export default class ClientPool {
  constructor (manager) {
    this._d = debug('socketeer:ClientPool')
    this._d('constructing new instance')
    this._roomManager = manager.room
    this.pool = {}
    this._reserved = {}
  }
}
