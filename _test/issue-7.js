'use strict'

const socketeer = require('..')
const Server = socketeer.Server
const Client = socketeer.Client

const server = new Server()

server.on('connection', function (client) {
  console.log('SERVERCLIENT CONNECTED')

  client.on('close', function () {
    console.log('SERVERCLIENT CLOSED')
  })

  client.action('never', () => {
    return new Promise((resolve, reject) => {
      // Noop
    })
  })

  client.action('10seconds', () => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 10 * 1000)
    })
  })

  client.action('instant', () => {
    return new Promise((resolve, reject) => {
      resolve()
    })
  })
})

server.listen(4000).catch((err) => {
  console.log(err.stack)
})

const client = new Client('ws://localhost:4000/')
client.on('open', () => {
  console.log('CLIENT OPEN')

  client.request('instant').then(() => {
    console.log('instant done (default timeout)')
  }).catch((err) => {
    console.log('instant error (default timeout)')
    console.log(err)
  })

  client.request('instant', null, {
    timeout: 0
  }).then(() => {
    console.log('instant done (0 timeout)')
  }).catch((err) => {
    console.log('instant error (0 timeout)')
    console.log(err)
  })

  client.request('10seconds').then(() => {
    console.log('10seconds done (default timeout)')
  }).catch((err) => {
    console.log('10seconds error (default timeout)')
    console.log(err)
  })

  client.request('10seconds', null, {
    timeout: 5000
  }).then(() => {
    console.log('10seconds done (5s timeout)')
  }).catch((err) => {
    console.log('10seconds error (5s timeout)')
    console.log(err)
  })

  client.request('never').then(() => {
    console.log('never done (default timeout)')
  }).catch((err) => {
    console.log('never error (default timeout)')
    console.log(err)
  })
})

client.on('close', () => {
  console.log('CLIENT CLOSE')
})
