API: Server
===

*extends EventEmitter*

**Public API**

* All of EventEmitter's public API, except the overriden parts
* `constructor: constructor(options)`: Constructs a new instance.
    - `options`: server options (plain object):
        + `heartbeatTimeout`: How long to wait in ms to wait past the server client sending a 'ping' for the client 'pong' before timing out the connection.
            * default: `15000`
        + `heartbeatInterval`: How long to wait in ms before sending a `ping` after receiving the client `pong`
            * default: `10000`
        + `failless`: Whether Socketeer should handle unhandled `error` events
            * default: `true`
        + `supportsResuming`: Whether the server supports session resuming
            * default: `false`
        + `sessionTimeout`: How long to wait in ms before destroying a paused session
            * default: `10000`
* `prop: supportsResuming`: **Read-only** boolean indicating whether the server supports session resuming or not.
* `prop: room`: RoomManager instance.
* `prop: pool`: ClientPool instance.
* `prop: data`: Reserved variable for storing various variables in. Use this to store any non-class-relevant data, so you don't pollute the class namespace.
    - `data` is a plain, empty object.
* `method: listen(port, opts)`: Starts the server.
    - `port`: Port to listen to.
        + Must be a string or a number. If it's not, then it assumes that it is the options object.
        + Optional. Can be completely omitted.
    - `opts`: ws.Server options
        + the port argument `port` is `opts.port` (but you need to use the `port` argument, not `opts.port`)
        + `disableHixie` is force set to true
        + `perMessageDeflate` is force set to false ([#13](https://github.com/SEAPUNK/socketeer/issues/13))
    - Must have either a port or a server specified.
    - Returns a Promise:
        + Rejects if an error occurs
        + Resolves if server is specified
        + Resolves if port is specified, and ws.Server calls back successfully
        + Rejects if port is specified, but ws.Server calls back with an error
* `method: broadcast(name, data)`: Broadcasts an event to all clients. Alias to `room.get('all').emit(name, data)`
* `method: to(name, create)`: Alias to `room.get(name, create)`
* `method: use(middleware)`: Attaches a middleware to the server.
    - **TODO**: Write docs for this in a separate document. In the meantine, don't use this unless you know what you're doing.
* `method: stop()`: Stops the server.
    - Removes all rooms, clears all clients, and stops listening.
    - Server can be started back up with `listen()`.
* `event: error(err)`: Emits when a server error has occured.
* `event: headers(headers)`: ws.Server `headers` event.
* `event: connectionSetupError(err, client)`: Emits when a connection was created, but an error occured while setting it up.
    - `err` is an error, if applicable
    - `client` is the defunct ServerClient instance.
* `event: connection(client)`: Emits when a client is fully set up for use.

**Private API (development reference)**

* `prop: _d`: `debug` module instance.
* `prop: _heartbeatTimeout`: Configured heartbeat timeout
* `prop: _heartbeatInterval`: Configured heartbeat interval
* `prop: _sessionTimeout`: Configured session resume timeout
* `prop: _middlewares`: List of middleware to run on a client.
* `prop: _failless`: Whether the server should handle all unhandled Server and ServerClient errors
* `method: _handleError(err)`: Handles errors. Emits `error` event.
* `method: _handleHeaders(headers)`: Handles `headers` event. Emits `headers` event.
* `method: _handleConnection(connection)`: Handles and sets up a new connection. Emits a `connectionSetupError` if something goes wrong during setup.
    - Creates a ServerClient out of the connection
    - Awaits the ServerClient to finish the handshake to determine whether it's a new connection, a failed session resume attempt, or a successful resume attempt.
    - If not a resume attempt, runs the ServerClient through the middlewares.
    - Registers the client.
