socketeer
===

[![npm version](https://img.shields.io/npm/v/socketeer.svg?style=flat-square)](https://npmjs.com/package/socketeer)[![travis build](https://img.shields.io/travis/SEAPUNK/socketeer.svg?style=flat-square)](https://travis-ci.org/SEAPUNK/socketeer)[![javascript standard style](https://img.shields.io/badge/code%20style-standard-blue.svg?style=flat-square)](http://standardjs.com/)

---

a socket framework created as an alternative to socket.io

[documentation](https://seapunk.github.io/socketeer)

---

### server example

```javascript
var socketeer = require('socketeer')

var server = new socketeer.Server()
server.on('connection', function (client) {
  // listen for an event
  client.event('hello', function (data) {
    console.log('client said hello: ' + data)
  })
  // emit an action
  client.emit('whoareyou', null, function (name) {
    console.log('client says they are ' + name)
  })
  // handle socket events
  client.on('close', function () {
    // socket closed, clean up
  })
})

```

---

### client example

```javascript
var socketeer = require('socketeer')

var client = new socketeer.Client('ws://example.com')
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
