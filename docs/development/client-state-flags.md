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

`_handshakeOver`
---

**TODO**: Replace with `_handshakeStep`

* **Default**: `false`
* **What**: Indicates whether any further handshake messages should be rejected with an error
* **Used for**: Rejecting further handshake messages (flow control)
* **Conditions**:
    - `false` when:
        + Client is first created
        + Client reconnects to the server
    - `true` when:
        + The last handshake message from the server has been received

`_awaitingHandshakeResponse`
---

**TODO**: Replace with `_handshakeStep`

* **Default**: `false`
* **What**: Indicates whether the next handshake message should be the second server handshake message or not.
* **Used for**: Flow control.
* **Conditions**:
    - `false` when:
        + Client is first created
        + The second handshake message from the server has been received
    - `true` when:
        + The first handshake message from the server has been received

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
