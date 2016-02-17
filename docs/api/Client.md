API: Client
===

*extends ClientAbstract (which extends EventEmitter)*

**Public API**

* All of EventEmitter public API, except the overriden parts
* All of ClientAbstract's public API, except the overriden parts
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
* `event: ping`: Called when the server sends a heartbeat message. Client automatically responds with `pong`s.
* `method: resume()`: Attempt to reconnect to the server, and resume the session.
    - Returns a Promise.
    - The Promise is rejected only if you call the function while the client is still connected to the server.
    - The Promise resolves with a `true` or `false`, depending on if the session was resumed successfully.
    - If the promise resolves to `true`, then the client has already reconnected to the server, and is ready to process messages.
    - If the promise resolves to `false`, then the client could not resume the session. The client is disconnected, and ready to have `reconnect()` called. It could be any of the following reasons:
        + The server does not support session resuming.
        + The client does not have a session resume token to use.
        + An error occured while attempting to resume the session.
        + The server rejected the session resume token.
* `method: reconnect(immediate)`: Attempts to reconnect the server with a new session.
    - This clears the message queue, discarding any pending messages.
    - Does not return anything. Any events are managed through EventEmitter.
    - Throws an error if the client connection has not yet closed.
    - Reconnects only one per client disconnection.
    - Waits a period of time before *actually* reconnecting (see `options.reconnectWait`), unless `immediate` is set to `true`.
    - Deletes any existing session resume token, if any.


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
    - Ignores message if the connection is closed ([#37](https://github.com/seapunk/socketeer/issues/37))
    - If `_isReady` is `false`, it assumes that the message is a handshake message.
    - If both handshake messages have been received from the server, the connection is errored out.
    - Otherwise, if the message is `h`, the message is treated as a heartbeat.
    - Everything else is passed down to the super method.
* `prop: _handshakeOver`: Whether the client should refuse any further handshake messages.
    - It turns true when the second handshake message is received.
    - This variable is reset to `false` on each reconnection attempt.
* `prop: _awaitingHandshakeResponse`: Whether we should consider the handshake message to be the first or second handshake message.
* `method: _handleServerHandshake(data)`: Validates, parses, and processes the first server handshake message.
    - Makes sure the server is a Socketeer server
    - Makes sure the protocol versions are compatible
    - Makes sure the heartbeat interval is a valid value
    - Sets the client's heartbeat interval
* `prop: _heartbeatInterval`: The time to wait (with `_heartbeatTimeout`) between server heartbeats before timing out the connection.
* `prop: _resumePromiseResolve`: The `resume()` promises' `resolve()` function.
    - Set when `resume()` is called
    - Reset to `null` as soon as it's used
* `prop: _resumeToken`: Session resume token to use for session resumes.
    - Reset to `null` as soon as the token has been used for session resumal.
    - Reset to `null` as soon as `reconnect()` is called.
    - Set to the token value during the handshake, if the server either:
        + Sends a token as a result of a session query
        + Sends a token as a result of a session resumal.
* `method: _handleHandshakeResponse(data)`: Validates, parses, and processes the second server handshake message.
    - This is where the handshake timeout is stopped.
    - Calls `_handlePotentialSessionResume()` or `_handleSetSessionResume()`, depending on if the `_resumePromiseResolve` prop is truthy.
* `method: _handlePotentialSessionResume(parts)`: Processes the second server handshake message, expecting a session resume status message.
    - Called from `_handleHandshakeResponse()` if `_resumePromiseResolve` is truthy.
    - Closes the connection if the session resume has failed.
* `method: _handleSetSessionResume(parts)`: Processes the second server handshake message, expecting a session resume token query response.
    - Called from `_handleHandshakeResponse()` if `_resumePromiseResolve` is *falsy*.
    - Sets a new resume token if the server supports session resuming.
* `method: _finalizeHandshake(isSessionResume)`: Finalizes the handshake, marking the client as ready, and unpausing the message queue.
* `method: _resolveSessionResume(isOkay)`: Calls `_resumePromiseResolve`, resolving the promise created by the call to `resume()`.
* `method: _handleHeartbeat()`: Handles the heartbeat by resetting the heartbeat timeout, and sending a `pong` message.
* `method: _resetHeartbeatTimeout()`: Stops the existing heartbeat timeout, then starts a new heartbeat timeout.
    - The timeout period is 
* `prop: _heartbeatTimer`: Timer created at `_resetHeartbeatTimeout()`, from `setTimeout()`.
* `method: _stopHeartbeatTimeout`: Clears the heartbeat timeout timer, if any.
* `method: _doReconnect()`: Re-establishes the connection to the server, by resetting some variables, and connecting to the server again.
* `method: _detachEvents()`: Detaches from the existing websocket's `onopen` event. Wraps ClientAbstract's method.