Client state flags
===

Development reference: Used to explain which variable is which, and what it's used for.

`_isReady`
---

* **Default**: `false`
* **What**: Indicates when the client is connected to the server, with the handshake being completed successfully.
* **Used for**: Determining if the message being received is a handshake message or a regular message.
* **Conditions**:
    - `false` when:
        + Client is first created
        + Client disconnects from the server
    - `true` when:
        + Client has connected to the server, AND has completed the handshake in its entirety

`_isReconnection`
---

* **Default**: `false`
* **What**: Indicates whether the client performed a first-time connection.
* **Used for**: Public API.
* **Conditions**:
    - `false` when:
        + Client is first created
    - `true` when:
        + Client created a new connection to the server after the first connection close

`_resumePromiseResolve`
---

* **Default**: `null`
* **What**: Resolve function of the `resume()` Promise.
* **Used for**: Determining whether the connection is a session resume attempt or not.
* **Conditions**:
    - `null` when:
        + Client is first created
        + Just before `_resumePromiseResolve` function has been called (the function by then is stored to a different temporary variable)
    - Promise resolve function when:
        + Client begins a session resume attempt with the server

`_resumeToken`
---

* **Default**: `null`
* **What**: Session resume token given to us by the server
* **Used for**: Determining if we can attempt a session resume with the server
* **Conditions**:
    - `null` when:
        + Client is first created
        + Token is sent to the server for validation
        + We attempt to reconnect to the server with a new session
    - The session resume token when:
        + Server gives us a new session resume token to use via either successful session resumal or new session with the server supporting session resumals

`_handshakeStep`
---

* **Default**: `0`
* **What**: Indicates what step of the handshake we are currently at.
* **Used for**: Knowing which handshake message should be which, and whether we should accept any further handshake messages.
* **Note**: Further handshake messages will be rejected when the step is `2`.
* **Conditions**:
    - `0` when:
        + Client is first created
        + Client reconnects to the server
    - `1` when:
        + First handshake message from the server has been received
    - `2` when:
        + Second handshake message from the server has been received

`_handshakeTimer`
---

* **Default**: `null`
* **What**: Provides a way to stop the existing handshake timeout timer
* **Used for**: Clearing the existing handshake timeout timer
* **Conditions**:
    - `null` when:
        + Client is first created
        + Last handshake message has been received
    - Timer when:
        + The connection to the server has been opened