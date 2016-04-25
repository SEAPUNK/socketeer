socketeer browser builds
---

This is where the browser client builds reside.

Exported as `SocketeerBrowserClient`.

**WARNING**: If your browser does not support es6 well, you will need to include [`babel-polyfill`][].

Library target:

* `amd` - AMD build
* `commonjs2` - commonjs2 build
* `var` - `var SocketeerBrowserClient = ...`

Suffixes:

* `min` - Minified, debugless builds.
* `debug` - Unminified builds that utilize the `debug` module.
* `[blank]` - Unminified, debugless builds.


[`babel-polyfill`]: https://babeljs.io/docs/usage/polyfill/#usage-in-browser
