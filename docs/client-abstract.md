ClientAbstract
---

Class that is common between `SocketeerClient` and `SocketeerServerClient`. Extends [`EventEmitter`](https://nodejs.org/api/events.html#events_class_events_eventemitter), with `EventEmitter`'s `emit` function renamed to `_emit`.

---

- [ClientAbstract.event(name, handler)](#ClientAbstract-event)
- [ClientAbstract.action(name, handler, force)](#ClientAbstract-action)
- [ClientAbstract.close()](#ClientAbstract-close)
- [ClientAbstract.kill()](#ClientAbstract-kill)
- [ClientAbstract: `close` (code, message, errored)](#ClientAbstract-event-close)
- [ClientAbstract: `error` (err)](#ClientAbstract-event-error)
- [ClientAbstract: `timeout`](#ClientAbstract-event-timeout)
