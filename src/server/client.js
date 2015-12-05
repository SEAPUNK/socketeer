import debug from 'debug'
import ClientAbstract from '../common/client-abstract'

export default class ServerClient extends ClientAbstract {
  constructor (ws) {
    super()
    this._d = debug('socketeer:SocketeerServerClient')
    this.ip = ws._socket.remoteAddress
    this._attachEvents()
  }
}
