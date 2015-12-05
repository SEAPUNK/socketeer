import debug from 'debug'
import Room from './room'

export default class RoomManager {
  constructor () {
    this._d = debug('socketeer:RoomManager')
    this._d('constructing new instance')
    this._rooms = {}
    this._rooms['all'] = new Room('all')
  }
}
