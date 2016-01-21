Socketeer Usage
===

### server

```javascript
const socketeer = require('socketeer')
const server = new socketeer.Server()

server.on('connection', (client) => {
  // listen for an event
  client.event('hello', (data) => {
    console.log('client said hello: ' + data)
  })

  // emit an action (returns a promise if no callback is specified)
  client.request('whoareyou', null, (name) => {
    console.log('client says they are ' + name)
  })

  // handle socket events
  client.on('close', function () {
    // socket closed, clean up
  })
})
```

---

### client

```javascript
const socketeer = require('socketeer')
const client = new socketeer.Client('ws://example.com')

// listen for socket open event
client.on('open', function () {
  // handle socket open
  client.emit('hello', null)
})

// listen for an action
client.action('whoareyou', function (data, callback) {
  callback('the client')
})

// listen for socket close event
client.on('close', function () {
  console.log('socket has closed')
})
```
