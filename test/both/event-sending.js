import test from 'ava'
import {Server, Client} from '../../'

test(`server and client should correctly send and receive events`, async (t) => {
  t.plan(4)

  const server = new Server()
  server.on('connection', (client) => {
    client.emit('hello', 'yes')
    client.event('bye', (data) => {
      t.is(data, 'no')
    })
  })
  await server.listen(42424)

  const client = new Client('ws://127.0.0.1/')
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
