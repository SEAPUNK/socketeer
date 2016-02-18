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

0.8.0
===

Initial version that provides changelog

Known caveats
---

* Session resuming is currently broken.
* Documentation is incomplete and partially out of date.