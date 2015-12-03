server
---

Server class.

---

- [new SocketeerServer(options)](#SocketeerServer)
- [SocketeerServer.start(port, callback)](#SocketeerServer-start)
- [SocketeerServer: `connection` (client)](#SocketeerServer-event-connection)

---

<a name="SocketeerServer"></a>
`new socketeer.Server(options={}) -> SocketeerServer`

Creates an instance of `SocketeerServer`.

- `options`
    + `heartbeatTimeout` - *default `15000`* How long to wait in ms for the client pong event once the server sends the `ping` event.
    + `heartbeatInterval` - *default `10000`* How long to wait after sending a `ping` event to send another `ping` event.

---

<a name="SocketeerServer-start"></a>
`SocketeerServer.start(port, callback?)`

Start listening on the `port` port.

- `port` - Port to have the server listen on
- `callback` - *optional* Callback. Refer to the [`ws.Server`](https://github.com/websockets/ws/blob/master/doc/ws.md#new-wsserveroptions-callback) documentation for details.

---

<a name="SocketeerServer-broadcast"></a>
`SocketeerServer.broadcast(name, data)`

Alias to `SocketeerServer.room.get('all').emit(name, data)`

---

<a name="SocketeerServer-to"></a>
`SocketeerServer.to(name, create)`

Alias to `SocketeerServer.room.get(name, create)`

---

<a name="SocketeerServer-use"></a>
`SocketeerServer.use(middleware)`

Adds expressjs-like middleware to the server.

This middleware is called once a client connects, but before it gets registered, meaning that the Socketeer handshake has not run, and the client has not been added to the client pool and the 'all' room. `SocketeerServerClient.registered` is `false`, and you will be unable to send data back and forth (and register it to rooms and such) until it is. Callback *must* be called, or the connection will time out, and close before the handshake has completed.

- `middleware` - Function that accepts `client` and `callback` arguments.
    + `client` - `SocketeerServerClient` instance
    + `callback(rejectionMessage)` - 