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
* `event: error(err, connectionError)`: Whenever an error occurs.
    - If the error is an error related to the WebSocket connection, then `connectionError` will be true.
    - If `connectionError` is true, then the WebSocket will be closed, and the `close` event will be called immediately afterwards, unless `_doNotEmitClose` is set to `true`. (It is on ServerClient)
    - Connection errors are emits only once per connection.
    - Does **NOT** get emit if the error is a connection error, and the connection is a session resume attempt.
* `event: close(code, message, error)`: Whenever the connection closes.
    - `code` and `message` are the WebSocket `CloseEvent`'s close code and reason, respectively. Both null if `error` is not null.
    - `error` only exists if the connection is closing due to an error.
    - Emits only once per connection.
    - Does **NOT** get emit if the connection is a session resume attempt.
    - Does **NOT** get emit if `_doNotEmitClose` is set to `true`.

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
* `method: _handleMessage(messageEvent)`: Handles messages that are actions, action responses, or events.
    - Currently only supports JSON data, but binary support is planned. ([#26](https://github.com/seapunk/socketeer/issues/26))
* `method: _handleError(err)`: Handles WebSocket errors.
    - Does not get processed if `_socketeerClosing` is true.
    - Sets `_closeMustHaveError` to `true`.
* `prop: _closeMustHaveError`: Boolean variable that indicates whether `_handleClose` should wait for the function call that has an error, because the connection is closing because of that error.
    - This prevents a potential race condition of `ws` synchronously emitting the `close` event, and resultingly calling `_handleClose` before `_handleError` gets the chance to call `_handleClose`, and include the error.
* `prop: _socketeerClosing`: Boolean variable that indicates that Socketeer is closing the connection.
    - This is to ensure that `_handleClose` and `_handleError` only get processed once.
        + If just `_handleClose` is processed, it will also ensure `_handleError` is never processed until a new connection is initialized.
    - Must be manually reset by the inheriting class when appropriate.
* `method: _handleClose(closeEvent)`: Handles WebSocket closes.
    - If `error` is not provided, yet `_closeMustHaveError` is true, then it does not continue.
    - Otherwise, `_closeMustHaveError` is reset to false.
    - Does not get processed if `_socketeerClosing` is true.
    - Calls `_resolveSessionResume` with `false` if the connection was a session resume attempt.
    - Does not emit the `close` event if either `_resoleSessionResume` or `_doNotEmitClose` are truthy.
* `prop: _doNotEmitClose`: Whether `_handleError` should emit a `close` event.
    - Manually set by the inheriting class.
* `method: _processQueue(msg, done)`: Sends the next message in the message queue.
    - Does not send data, requeues the data (at the beginning) and pauses the message queue if the connection is not open.
* `method: _resumeMessageQueue()`: Resumes the message queue.
* `method: _clearMessageQueue()`: Clears the message queue.
* `method: _handleAction(data)`: Handles the action, calling the action handler if it exists.
    - The handler *must* be return a Promise.
    - Sends `ActionResponse.ERROR` if:
        + Handler does not return a Promise
        + Handler errored out (by either call fail or Promise rejection)
    - If `ActionResponse.ERROR` is sent, then the `error` event is also emitted.
    - Sends `ActionResponse.NONEXISTENT` if the action handler does not exist.
* `method: _handleActionResponse(data)`: Handles the action response, calling the action response handler, if it exists.
    - Cleans up after itself. If the handler has been used, then it will remove it from the `_actionPromises` map.
    - If there is no handler, then it will ignore it.
    - If the response handler errors out, the `error` event will be emitted.
* `method: _handleEvent(data)`: Handles events.
    - If there are no handlers, then it will ignore the event.
    - If an event handler errors out, the `error` event will be emitted, and the remaining handlers will be called.
* `method: _generateActionId()`: Returns, and increments the `_currentActionId` property.
* `method: _validateSessionResumeToken(token)`: Makes sure the data is a valid session resume token. Returns true if the token is valid.