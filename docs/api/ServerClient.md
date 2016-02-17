API: ServerClient
===

*extends ClientAbstract (which extends EventEmitter)*

**Public API**

* All of EventEmitter public API, except the overriden parts
* All of ClientAbstract's public API, except the overriden parts
* `constructor: constructor(ws, server)`: Constructs a new instance. The server should be responsible for construction of the ServerClient.
    - `ws`: WebSocket client connection
    - `server`: Server responsible for constructing this server client
* `method: join(name)`: Adds the client to a server room. Alias to `server.room.join(name, this)`
* `method: leave(name)`: Removes the client from a server room. Alias to `server.room.leave(name, this)`
* `event: pause()`: The client has been disconnected from the server, and the session has been paused.
    - If the server does not support session resuming, this event is never called.
* `event: close()`: Client has been disconnected from the server, and can no longer resume the session. Overrides ClientAbstract's `close` event.
    - This event is also emitted if the server does not support session resuming.
* `event: resume(newIP, oldIP)`: Client has resumed its session.
* `prop: ws`: `ws.WebSocket` instance
* `prop: ip`: WebSocket IP
* `prop: id`: UUID used to identify the client.
    - Note: No *active* client has the same UUID as another active client. As soon as a client deactivates (via the `close` event), then that client's UUID can be used for another client.


**Private API (development reference)**

* `prop: _d`: `debug` module instance
* `prop: _isReady`: Whether the ServerClient is ready
    - This is `true` **only** when the handshake has completed, and a new session has been set up for it.
        + If the connection is a session resume attempt, then `_isReady` will never be `true`.
    - This is `false` as soon as the `close` event is triggered.
* `prop: _handshakeOver`: Whether the server client should refuse any further handshake messages.
    - It turns true when the client handshake message is received.
* `prop: _handshakePromise`: A promise that indicates if the server client has finished processing the handshake and is ready for the server to complete its setup.
    - Resolves with an object:
        + `isResume`: Whether the connection is a session resume attempt
        + `newResumeToken`: The new resume token that was generated for the client (if applicable)
    - The promise rejects if:
        + The client prepmaturely disconnects
        + An error occures
    - Before the promise is rejected, the client's connection *must* be closed and cleaned up.
* `prop: _handshakeResolve`: A function that resolves the `_handshakePromise`
* `prop: _handshakeReject`: A function that rejects the `_handshakePromise`
* `prop: _handshakeFinished`: Whether the handshake is ready to be processed by the server.
    - Used for handling of the `_handshakePromise` on close and error events.
    - Turns `true` as soon as the second handshake message has been processed, and a new session resume token has been optionally generated and reserved.
* `method: _beginHandshake()`: Initializes the handshake by sending the first server handshake message.
* `method: _handleMessage(messageEvent)`: Handles handshake messages, as well as heartbeat messages. Everything else is passed down to the super method.
    - Ignores message if the connection is closed ([#37](https://github.com/seapunk/socketeer/issues/37))
    - If `_isReady` is `false`, it assumes that the message is a handshake message.
    - If the client handshake message has been received from the server, the connection is errored out.
    - Otherwise, if the message is `h`, the message is treated as a heartbeat.
    - Everything else is passed down to the super method.
* `method: _handleHandshakeMessage`: Handles the client handshake message.