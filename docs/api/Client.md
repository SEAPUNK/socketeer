Client API
===

### `class Client (address, options)`

Socketeer client. On creation, the client automatically attempts
to connect to the provided address.

- `address: string`
    + Address to connect to. Must be a valid websocket URL.
- `options: (optional) object`
    + Options to configure the client with. See below for available options.

**Options**

- `heartbeatTimeout: number [default 15000]`
    + How long to wait in ms for the server's heartbeat message past its configured heartbeat interval before deeming the connection as "timed out", and closing it.
- `handshakeTimeout: number [default 10000]`
    + How long to wait in ms for the handshake with the server to complete before timing out (and closing) the connection.
- `reconnectWait: number [default 5000]`
    + How long to wait before reconnecting to server with the `reconnect()` function.
- `failless: boolean [default true]`
    + Whether the client should internally handle unhandled `error` events emitted with the EventEmitter. If `false`, you are responsible for handling `error` events, otherwise the EventEmitter will throw an unhandled exception. **Regardless of this setting, you should still listen for Socketeer's `error` events.** Even having this option available is generally bad practice, and will probably be removed in future releases.

