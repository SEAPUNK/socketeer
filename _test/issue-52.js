'use strict'

const socketeer = require('..')
const Server = socketeer.Server
const Client = socketeer.Client

const server = new Server({
  heartbeatTimeout: 1000,
  heartbeatInterval: 1000
})

server.on('connection', function (client) {
  console.log('SERVERCLIENT CONNECTED')

  client._handleHeartbeat = () => {}

  client.on('timeout', () => {
    console.log('SERVERCLIENT TIMEOUT')
  })

  client.on('close', function () {
    console.log('SERVERCLIENT CLOSED')
  })
})

server.listen(4000).catch((err) => {
  console.log(err.stack)
})

const client = new Client('ws://localhost:4000/')
client.on('open', () => {
  console.log('CLIENT OPEN')
})

client.on('timeout', () => {
  console.log('CLIENT TIMEOUT')
})

client.on('close', () => {
  console.log('CLIENT CLOSE')
})
