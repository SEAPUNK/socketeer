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
