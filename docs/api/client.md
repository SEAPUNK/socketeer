Socketeer Client
===

*extends ClientAbstract (which extends EventEmitter)*

**Public API**

* All EventEmitter public functions (except `emit`, which is `_emit` per ClientAbstract)
* All of ClientAbstract's public API
* `constructor: constructor(address, options)`: Constructs a new instance. As soon as instance is constructed, it starts the connection.
    - `address`: valid WebSocket address to connect to
    - `options`: client options
        + `protocols`: Protocols argument passed to the `ws` module
        + `ws`: Options argument passed to the `ws` module
        + `heartbeatTimeout`: How long in ms to wait past the server's heartbeat interval for another `ping` message before timing out the connection
            * default: `15000`
        + `handshakeTimeout`: How long in ms to wait before timing out the handshake between the client and the server
            * default: `10000`
        + `reconnectWait`: How long in ms to wait before reconnecting to the server after a call to `.reconnect()` is made
            * default: `5000`
        + `failless`: Whether Socketeer should handle all unhandled `error` events
            * default: `true`
* `event: unreadyOpen(isReconnection)`: Called when the WebSocket connection is opened, but Socketeer has not had a chance to complete the handshake yet.
* `event: open(isReconnection)`: Called when the handshake has been completed, and the connection is ready.
    - Does **not** get emitted if the connection is a successful or failed session resume.


**Private API (development reference)**

* `prop: _d`: `debug` module instance.
* `prop: _wsConstructArgs`: Array of arguments that will be used to create the `ws` websocket with
* `prop: _heartbeatTimeout`: Configured heartbeat timeout
* `prop: _handshakeTimeout`: Configured handshake timeout
* `prop: _reconnectWait`: Configured reconnect wait
* `prop: _failless`: Configured failless
* `prop: _isReady`: Whether the Client is ready
    - This is `true` **only** when it is connected to the server, and the handshake has been completed. In any other instance, it is `false`.
    - Turns `false` as soon as `_handleClose()` has been called.
* `prop: _isReconnection`: Whether the connection is a result of a reconnection.
    - Turns and stays `true` when `_doReconnect()` has been called.
* `method: _createWebsocket()`: Creates a new websocket for usage.
    - Called when connecting for the first time (constructor), or when it's reconnecting (`_doReconnect()`)
    - Uses `_wsConstructArgs` to create it
* `method: _attachEvents()`: Attaches to the `onopen` event of the WebSocket. Wraps ClientAbstract's .
    - Called every time `_createWebsocket()` is called.
* `method: _handleClose()`: Marks `_isReady` as `false`. Overrides, and calls the super method.
* `method: _handleOpen()`: Handles the WebSocket open event, by emitting `_open` and starting the handshake timeout.
    - Trusting that the `ws` module only sends one `open` event.
* `method: _startHandshakeTimeout()`: Starts the handshake timeout.
* `method: _failHandshake()`: Called when the timer started by `_startHandshakeTimeout()` is done.
    - Race condition failsafe: Does not fail the connection if the connection is already ready. There are possibilities that the final handshake is completed while the `_failHandshake()` call is in the event loop queue.
* `method: _stopHandshakeTimeout()`: Clears the handshake timeout timer.
* `prop: _handshakeTimer`: Timer created at `_startHandshakeTimeout()` from `setTimeout()`.
* `method: _handleMessage(messageEvent)`: Handles handshake messages, as well as heartbeat messages. Everything else is passed down to the super method.
    - Ignores message if the connection is closed (#37)
    - If `_isReady` is `false`, it assumes that the message is a handshake message.
    - If both handshake messages have been received from the server, the connection is errored out.
    - Otherwise, if the message is `h`, the message is treated as a heartbeat.
    - Everything else is passed down to the super method.
* `prop: _handshakeOver`: Whether the client should refuse any further handshake messages.
    - It turns true when the second handshake message is received.
    - This variable is reset to `false` on each reconnection attempt.
* `prop: _awaitingHandshakeResponse`: Whether we should consider the handshake message to be the first or second handshake message.
