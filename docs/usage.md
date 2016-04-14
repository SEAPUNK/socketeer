Socketeer Usage
===

These are examples of a server/client setup. Be sure to checkout the API docs to see what all you can do with Socketeer!

### server

```javascript
import {Server} from 'socketeer'

const server = new Server({
  // session resuming support is off by default
  supportsResuming: true
})

server.on('connection', async function (client) {
  // listen for an event
  // there can be many handlers for the same event
  client.event('hello', (data) => {
    console.log('client said hello: ' + data)
  })

  client.action('save', async function (stuff) {
    // data is a reserved variable for general variable storage
    // this is to help not directly pollute the class instance namespace
    client.data.stuff = stuff
  })

  // listen for an action (an event that requires a response)
  // action handlers must return promises
  client.action('give', async function () {
    return client.data.stuff
  })

  // emit an action (returns a promise)
  // see the client usage example below to see the handler
  // for the 'whoareyou' action
  const name = await client.request('whoareyou', 'my name is "%NAME%"')
  console.log(`client says: ${name}`) // my name is "client"

  // if the server support session resuming, when the client disconnects,
  // the server emits this event
  // the 'close' event is not emitted until the session times out
  client.on('pause', () => {
    console.log('socket paused')
  })

  // this event is called when the client successfully resumes the session
  // oldIp = client's IP before it disconnected
  // newIp = client's current IP
  client.on('resume', (newIp, oldIp) => {
    console.log('socket resumed: ' + newIp + ' old: ' + oldIp)
  })

  // the close event is called when:
  // * the client disconnects and the server does not session resuming
  // * the server supports session resuming, but the paused session times out (default is 10 seconds) 
  client.on('close', function () {
    // socket closed and cannot be resumed, clean up
  })
})

server.listen(4000).catch((err) => {
  console.log('uh oh: ' + err)
})
```

---

### client

```javascript
import {Client} from 'socketeer'
const client = new Client('ws://localhost:4000/')

// listen for socket open event
client.on('open', async function () {
  client.action('whoareyou', async function (template) {
    return template.replace('%NAME%', 'client')
  })

  client.on('close', async function () {
    // if the server supports it, you can attempt to "resume" the session
    // i.e. reconnect as the disconnected client
    if (await client.resume()) {
      // this means you can continue using the socket as it currently is
      // we saved the variable '12345' for our client in the server
      // and because we resumed the session, the server remembers us
      // as the previously closed connection
      await client.request('give') // 12345
      return
    }
    // if session resume failed, the function will resolve to 'false'
    console.log('socket has closed')
  })

  // emit an event, optionally with data
  client.emit('hello')
  await client.request('save', 12345)
  await client.request('give') // 12345
  // close the connection
  client.close()
})
```
