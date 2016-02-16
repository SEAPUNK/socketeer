import test from 'ava'
import {Server, Client} from '../../'

test('server and client should correctly send and receive events', (t) => {
  t.plan(4)
  return new Promise((resolve, reject) => {
    const server = new Server()
    let client
    server.on('error', (err) => reject(new Error('Server errored out: ' + err)))
    server.listen(42424).then(() => {
      server.on('connection', (sclient) => {
        sclient.on('error', (err) => reject(new Error('Server client errored out: ' + err)))
        sclient.emit('hello', 'yes')
        sclient.event('bye', (data) => {
          t.is(data, 'no')
          resolve()
        })
      })
      client = new Client('ws://127.0.0.1:42424/')
      client.on('error', (err) => reject(new Error('Client errored out: ' + err)))
      client.on('close', () => reject(new Error('Connection was closed.')))
      let isOpen = false
      client.once('open', () => {
        t.pass()
        isOpen = true
      })
      client.event('hello', (data) => {
        t.is(isOpen, true)
        t.is(data, 'yes')
        client.emit('bye', 'no')
      })
    })
  })
})
