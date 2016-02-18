Extending ClientAbstract
===

Development reference: Explains what state ClientAbstract introduces, what it handles automatically, and what should be handled manually.

ClientAbstract is a class that provides the handling of Socketeer messages, sans heartbeats and handshake messages. It's the "common" class for both Client and ServerClient.

It does:
    - Handle event/action/action response messages
    - Provide the common public API for Socketeer connections
    - Action/event emitting
    - Action/event/action response handler setup
    - Message queuing
    - Handle and clean up WebSocket `message`, `close`, and `error` events
    - Public API helper functions for determining websocket state and closing the websocket
    - Private API helper functions
        + Session resume token validation

It does **not**:
    - Create websockets
    - Handle and clean up WebSocket `open` events
    - Manage session resuming
    - Handle heartbeats
    - Handle handshake messages
    - Handle integrations with the server

Introduced state
===

In addition to the below specified state, ClientAbstract introduces the message queue, which is paused by default. It is the inheriting class's responsibility to unpause it and clear it at appropriate times by calling `_resumeMessageQueue()` and `_clearMessageQueue()`, respectively.

`_closeMustHaveError`
---

* **Default**: `false`
* **What**: Indicates whether `_handleClose()` should ignore the calls to its function unless the close event includes an error
* **Used for**: Preventing a potential race condition of the websocket emitting the `close` event before `_handleError()` gets the change to
* **Conditions**:
    - `false` when:
        + ClientAbstract is first created
        + A close event is successfully handled
    - `true` when:
        + `_handleError()` is called, and will call `_handleClose()`

`_socketeerClosing`
---

It is the inheriting class's responsibility to set this variable to `true` when appropriate.

* **Default**: `false`
* **What**: Indicates whether `_handleClose()` has been called, and the connection will close (or is already closed).
* **Used for**: Preventing multiple handling of `error` and/or `close` events per connection
* **Conditions**:
    - `false` when:
        + ClientAbstract is first created
        + `_handleClose()` has been called successfully
    - `true` when:
        + The inheriting class sets it to `true`.
            * In `Client`, when the client creates a new WebSocket instance (to reconnect to the server)
            * In `ServerClient`, when the websocket has been replaced due to successful session resume attempt