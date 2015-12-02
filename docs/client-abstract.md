ClientAbstract
---

Class that is common between `SocketeerClient` and `SocketeerServerClient`. Extends [`EventEmitter`](https://nodejs.org/api/events.html#events_class_events_eventemitter), with `EventEmitter`'s `emit` function renamed to `_emit`.

---

- [ClientAbstract.event(name, handler)](#ClientAbstract-event)
- [ClientAbstract.action(name, handler, force)](#ClientAbstract-action)
- [ClientAbstract.emit(name, data, callback)](#ClientAbstract-emit)
- [ClientAbstract.close()](#ClientAbstract-close)
- [ClientAbstract.kill()](#ClientAbstract-kill)
- [ClientAbstract: `close` (code, message, error)](#ClientAbstract-event-close)
- [ClientAbstract: `error` (err)](#ClientAbstract-event-error)
- [ClientAbstract: `timeout`](#ClientAbstract-event-timeout)

---

<a name="ClientAbstract-event"></a>
`ClientAbstract.event(name, handler)`

Sets up a handler for an event.

- `name` - Event name to handle
- `handler` - Function to use for handling the event. When this function gets called, it calls with one argument: `data`
    + `data` is the event data received

---

<a name="ClientAbstract-action"></a>
`ClientAbstract.action(name, handler, force?)`

Sets up a handler for an event. Unlike events, you can only register one action handler per action name. If you try to register an action handler while an action handler is already registered with `force` being false, this function will throw an error.

- `name` - Action name to handle
- `handler` - Function to use for handling the action. This function gets called with two arguments: `data` and `callback`
        * `data` is the action data received
        * `callback` is the callback for the action response. This function must *always* be called.
- `force` - *optional* Whether to overwrite the existing action handler, if there is any.

---

<a name="ClientAbstract-emit"></a>
`ClientAbstract.emit(name, data, callback?)`

Emits an event on an action, depending on the existence of `callback`.

- `name` - Event/action name to emit
- `data` - Data to include with the event/action
- `callback` - *optional* Function to use for the action response.
    + If callback is not a function, then the client will emit an event.

---

<a name="ClientAbstract-close"></a>
`ClientAbstract.close(code?, data?)`

Tries to gracefully close the socket connection. Alias to [`ws.close()`](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketclosecode-data)

---

<a name="ClientAbstract-kill"></a>
`ClientAbstract.kill()`

Closes the connection in a less graceful way. Alias to [`ws.terminate()`](https://github.com/websockets/ws/blob/master/doc/ws.md#websocketterminate)

---

<a name="ClientAbstract-event-close"></a>
`ClientAbstract: 'close' event (code, message, error)`

Occurs when the Socketeer socket has closed.

- `code` - `code` passed [from the `ws` library](https://github.com/websockets/ws/blob/master/doc/ws.md#event-close). Can be `null` if closed because of `error`
- `message` - `message` passed [from the `ws` library](https://github.com/websockets/ws/blob/master/doc/ws.md#event-close). Can be `null` if closed because of `error`
- `error` - Error, if the socket closed due to an error.

---

<a name="ClientAbstract-event-error"></a>
`ClientAbstract: 'error' event (error)`

Occurs when the Socketeer socket has occured an error. The `close` event is immediately called after the `error` event. See [`ws: error`](https://github.com/websockets/ws/blob/master/doc/ws.md#event-error-1).

- `error` - Socket error

---

<a name="ClientAbstract-event-timeout"></a>
`ClientAbstract: 'timeout' event`

Occurs when a Socketeer heartbeat timeout occurs. This event is not called for internal socket timeouts. Socket is in the middle of closing when this event is called.