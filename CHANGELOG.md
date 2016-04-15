0.8.3
===

* Added timeouts to actions (default `30000ms`)
```js
client.request('stuff', null, {
  timeout: 10000 // 10 second timeout
})

client.request('stuff', null, {
  timeout: 0 // or null for no timeout
})
```

0.8.2
===

* Fixed docs/usage.md
* Fixed ClientPool session cleanup function
* Fixed ServerClient client close cleanup
* Added option to Server: `resumeAllowsDifferentIPs`, which allows session resuming from a different IP.
* Allowed `perMessageDeflate` to be configured in `Server.listen` (defaults to `false`)
* New class: ClientPreparer
* New file: util.js, which contains the session resume token validation function
* Protocol version is now stored under enums.js
* Moved session management into its own class: SessionManager
* New class: ServerClientPreparer
* Added handshake timeout to server
* Fixed calls to `reconnect()` and `resume()` in the case the websocket isn't fully closed
* Temporarily falling back to Mocha for testing instead of Ava ([#6](https://github.com/seapunk/socketeer/issues/6))
* Bump dependencies and devDependencies:
```
 async                      ^1.5.2  →  ^2.0.0-rc.3
 babel-eslint               ^5.0.0  →  ^6.0.2
 bluebird                   ^3.3.3  →  ^3.3.4
 babel-cli                  ^6.5.1  →  ^6.7.5
 babel-preset-es2015-node4  ^2.0.3  →  ^2.1.0
 standard                   ^6.0.7  →  ^6.0.8
```
* Don't allow session resuming if `close()` or `terminate()` are called on the ServerClient end ([#45](https://github.com/seapunk/socketeer/issues/45))

0.8.1
===

* Cleaned up `.gitignore`
* Cleaned up `.npmignore` (the published package will be much smaller!)
* Exposed all Socketeer classes in the module exports
* Updated dependencies:
    - `maybestack` from `1.0.1` to `2.0.0`
    - `ava` from `0.11.0` to `0.12.0`
* Created documentation for client state
* Fixed prevention of false-positive handshake timeouts
* Fixed prevention of false-positive heartbeat timeouts, and fixed the cleanup of heartbeat timeouts
* Fixed the starting of the heartbeat timeout on client ready
* Created documentation for extending ClientAbstract
* Fixed session resuming
* Fixed handling of action handlers

0.8.0
===

Initial version that provides changelog

Known caveats
---

* Session resuming is currently broken.
* Documentation is incomplete and partially out of date.
