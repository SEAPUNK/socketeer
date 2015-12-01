client
---

Extends `ClientAbstract`.

---

- [new SocketeerClient(address, protocols, options)](#SocketeerClient)
- [SocketeerClient.emit(name, data, callback)](#SocketeerClient-emit)
- [SocketeerClient.reconnect(immediate)](#SocketeerClient-reconnect)
- [SocketeerClient: `open` (isReconnection)](#SocketeerClient-event-open)


---

<a name="SocketeerClient"></a>
`new socketeer.Client(address, protocols, options) -> SocketeerClient`

Creates an instance of `SocketeerClient`. All arguments are passed to [the `ws` library](https://github.com/websockets/ws/blob/master/doc/ws.md#new-wswebsocketaddress-protocols-options).

- `address` - address that the `ws` library accepts
- `protocols` - protocols that the `ws` library accepts
- `options` - options that the `ws` library accepts, with some additions:
    + `heartbeatTimeout` - *default `15000`* How long to wait in ms for the server ping event past the set heartbeat interval before timing out the connection.
    + `reconnectWait` - *default `5000`* How long to wait in ms before re-establishing the connection when `reconnect()` is called.

---

<a name="SocketeerClient-emit"></a>
`SocketeerClient.emit(name, data, callback?)` **overrides the ClientAbstract's emit function**

Emits an event on an action, depending on the existence of `callback`.
Throws an error if not ready.

- `name` - Event/action name to emit
- `data` - Data to include with the event/action
- `callback` - *optional* Function to use for the action response.
    + If callback is not a function, then the client will emit an event.

---

<a name="SocketeerClient-reconnect"></a>
`SocketeerClient.reconnect(immediate)`

Reconnects to the server when the connection has closed.
Throws an error if the connection is not closed. Waits for `reconnectWait` ms before re-establishing connection unless `immediate` is true.

- `immediate` - Whether to ignore the set `reconnectWait` option.

---

<a name="SocketeerClient-event-open"></a>
`SocketeerClient: 'open' event`
