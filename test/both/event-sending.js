import test from 'ava'
import {Server, Client} from '../../'

test(`server and client should correctly send and receive events`, (t) => {
  t.plan(4)
  return new Promise((resolve, reject) => {
    const server = new Server()
    const client = new Client('ws://127.0.0.1:42424/')
    server.on('error', reject)
    client.on('error', reject)
    server.listen(42424).then(() => {
      server.on('connection', (sclient) => {
        sclient.on('error', reject)
        sclient.emit('hello', 'yes')
        sclient.event('bye', (data) => {
          t.is(data, 'no')
          resolve()
        })
      })

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
