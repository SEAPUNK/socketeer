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
