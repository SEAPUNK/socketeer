'use strict'

const socketeer = require('..')
const Server = socketeer.Server
const Client = socketeer.Client

const server = new Server({
  supportsResuming: true
})

server.on('connection', function (client) {
  console.log('Server client connected')

  client.on('pause', () => {
    console.log('Client paused')
  })

  client.on('resume', (newIp, oldIp) => {
    console.log(`Client resumed: ${newIp} (old: ${oldIp})`)
  })

  client.on('close', function () {
    console.log('Client closed')
  })

  client.close()
})

server.listen(4000).catch((err) => {
  console.log(err.stack)
})

const client = new Client('ws://localhost:4000/')
client.on('open', () => {
  console.log('OPEN')
})

client.on('close', () => {
  console.log('CLOSE')
  client.resume().then((resumed) => {
    console.log(`RESUME: ${resumed}`)
  })
})
