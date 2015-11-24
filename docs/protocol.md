protocol
===

This is documentation for the Socketeer protocol and how it should work, for if you want to create your own Socketeer-compatible library, or want to know how it works.

- [websocket](#websocket)
- [handshake](#handshake)
- [heartbeats](#heartbeats)
- [event messages](#event-messages)
- [action message](#action-messages)
- [action response messages](#action-response-messages)

websocket
---

Socketeer is built on top of the [ws](https://github.com/websockets/ws/) library, which is a [RFC6455](https://tools.ietf.org/html/rfc6455)-compliant websocket implementation.

ws supports the Hixie and HyBi protocols, but Socketeer only supports the HyBi protocol (`disableHixie` is force set to `true`) for security, convenience, and modernization reasons.


handshake
---

When you first connect to the Socketeer server, before you can do anything you **MUST** wait for the heartbeat interval set message.

Heartbeat interval set message's structure is the following:

| structure | example |
|-----------|---------|
| `hi{INT}` | `hi10000` |

Where `{INT}` is a positive integer that indicates how long in milliseconds the interval between each heartbeat will be.


heartbeats
---

Socketeer does its own form of heartbeats, because the Web API's websockets' ping/pongs do not have an API, and are implemented differently across platforms. <sup>[[1](http://stackoverflow.com/a/10586583)]</sup>

The Socketeer server is the "master" for heartbeats. It sets the interval, is the only one that sends the "ping"s. The Socketeer client, upon receiving the server's heartbeat message must immediately respond with the "pong"s.

The heartbeat mesage is a single `h`, regardless of it being "ping" or "pong".

The heartbeat flow is as such:

1. Server is started, and configured with a `server heartbeatTimeout` and `heartbeatInterval`.
    - `server heartbeatTimeout` is the span of time in milliseconds to wait for the client's "pong" message before closing (or "timing out") the connection to the client.
    - `heartbeatInterval` is the span of time in milliseconds to wait before sending another "ping" message.
2. Client is configured with a `client heartbeatTimeout`, and begins the connection to the server.
    - `client heartbeatTimeout` is the span of time in milliseconds to wait for the server's "ping" message before closing (or "timing out") the connection to the server.
3. Once the client is connected, the client awaits the heartbeat interval set message. Client ignores all messages except for heartbeat interval set messages.
    - If the server does not send a heartbeat message within the `client heartbeatTimeout` time, then time out the connection.
4. Server sends the heartbeat interval set message.
    - Client begins the heartbeat timeout, with the time of `heartbeatInterval + client heartbeatTimeout`. If a "ping" is not sent from the server within that time, then the client closes the connection.
    - Client is now "ready", and will now accept Socketeer messages.
5. Server sends a "ping" heartbeat message `heartbeatInterval` milliseconds after sending the heartbeat interval set message.
    - Client stops the existing heartbeat timeout, and starts a new one, with the time of (`heartbeatInterval + client heartbeatTimeout`)
    - Client immediately responds with a "pong" heartbeat message.
        + If the server does not receive a "pong" message within the `server heartbeatTimeout` time, then close the connection.
6. Server continuously sends a "ping" heartbeat message `heartbeatInterval` milliseconds after sending the last heartbeat message.
    - Client handles the heartbeats exactly how it handles heartbeats in step 5.

event messages
---

Event messages are like socket.io messages, and have the following structure:

```json
{
    "e": "event-name",
    "d": {
        "some": "data"
    }
}
```

- `e` is the event name.
- `d` is the event data.

action messages
---

Action messages are like events, but you can respond directly to them.

```json
{
    "i": 123,
    "a": "action-name",
    "d": {
        "some": "data"
    }
}
```

- `i` is the action ID. The receiver of the action responds to the action by echoing the ID value, so it can be properly handled.
- `a` is the action name.
- `d` is the action data.

action response messages
---

```json
{
    "i": 123,
    "s": 0,
    "d": {
        "some": "data"
    }
}
```

- `i` is the action ID. See how action IDs are used in the action message documentation.
- `s` is the action response status. This is a number, which can be one of the following:
    + `0` - "OK": Action went fine.
    + `1` - "NONEXISTENT": Action does not exist (client did not set up a handler for it)
    + `2` - "ERROR": An error occured while calling the action handler.
- `d` is the action data. If `s` is not `0`, then `d` may be an error message to complement the error.