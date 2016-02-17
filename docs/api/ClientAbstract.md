API: ClientAbstract
===

This is the class that is extended by both Client and ServerClient.

*extends EventEmitter*

**Public API**

* All of EventEmitter's public API, except the overriden parts
* `constructor: constructor()`: Constructs a new instance. It's recommended that you don't use this class unless you're extending it.
* `prop: data`: Reserved variable for storing various variables in. Use this to store any non-class-relevant data, so you don't pollute the class namespace.
    - `data` is a plain, empty object.
* `prop: PROTOCOL_VERSION`: Numerical version of the protocol that is being used.
* `method: send(obj)`: Send a raw message, stringified to JSON.
    - This function adds the message to the message *queue*.
    - The message queue gets paused when the socket is not open, and is resumed when the socket is reconnected.
    - It is preferred that `emit` or `request` are used instead.
* `method: emit(name, data)`: Emits an event.
    - Uses `send()` to send the message
    - Name should be a plain string
    - Data should be any variable that can be stringified to JSON.
* `method: request(name, data)`: Emits an action.
    - Uses `send()` to send the message
    - Name should be a plain string
    - Data should be any variable that can be stringified to JSON.
    - Returns a `Promise`:
        + It resolves if the server responds with a success message.
        + The promise resolves with an argument: `data`.
        + It rejects for any other reason, including:
            * Action timing out (**NOT YET IMPLEMENTED**, see [#7](https://github.com/seapunk/socketeer/issues/7))
            * Server not having a handler for the action
            * Server's action handler being faulty
            * Server's action handler erroring out
* `method: event(name, handler)`: Attaches a handler function to a specified event.
    - The handlers are called with one argument: `data`.
    - There can be as many handlers as you want for an event
    - The handlers are called in sequence, but do not prematurely end if one of the handlers errors out
    - If a handler errors out, an `error` event will be emitted
* `method: action(name, handler, force)`: Attaches a handler function to a specified action.
    - The handler is called with one argument: `data`.
    - There can only be one handler for an action
    - If you try to attach a handler to an action that already has a handler, this function will throw an error, unless `force` is `true`.
        + If `force` is `true`, the handler will be overriden.
    - If the handler errors out, the `error` event will be emitted
* `method: close(code, message)`: Closes the connection (passes the arguments to `ws.Client.close`)
* `method: terminate()`: Terminates the connection (passes the arguments to `ws.Client.terminate`)
    - It's preferred that `close()` is used instead.
* `method: isOpening()`: Whether the socket's readyState is `OPENING`.
* `method: isOpen()`: Whether the socket's readyState is `OPEN`
* `method: isClosing()`: Whether the socket's readyState is `CLOSING`
* `method: isClosed()`: Whether the socket's readyState is `CLOSED`

**Private API (development reference)**

* `prop: _d`: Noop function, but should be a `debug` module instance. Provide the variable when extending the class.
* `method: _da(msg)`: Wrapper for the `_d` function, that prepends the string '[abstract] ' to each message.
* `method: _emit(name, ...args)`: `EventEmitter`'s emit function.
* `prop: _events`: Event name to event handlers mapping.
* `prop: _actions`: Action name to action handler mapping.
* `prop: _actionPromises`: Action ID to action response handler mapping.
* `prop: _currentActionId`: Action ID that will be used for the next action request. Increments with each action sent.
* `prop: _messageQueue`: Message queue. Currently an instance of `async.queue`
* `method: _attachEvents()`: Listens to the `message`, `error`, and `close` messages of the websocket.
* `method: _detachEvents()`: Detaches from the `message`, `error`, and `close` events, setting them to use dummy handlers.
* `method: _handleMessage()`: Handles messages that are actions, action responses, or events.
    - Currently only supports JSON data, but binary support is planned. ([#26](https://github.com/seapunk/socketeer/issues/26))
