var SocketeerBrowserClient =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(4).nextTick;
	var apply = Function.prototype.apply;
	var slice = Array.prototype.slice;
	var immediateIds = {};
	var nextImmediateId = 0;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) { timeout.close(); };

	function Timeout(id, clearFn) {
	  this._id = id;
	  this._clearFn = clearFn;
	}
	Timeout.prototype.unref = Timeout.prototype.ref = function() {};
	Timeout.prototype.close = function() {
	  this._clearFn.call(window, this._id);
	};

	// Does not start the time, just sets up the members needed.
	exports.enroll = function(item, msecs) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = msecs;
	};

	exports.unenroll = function(item) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = -1;
	};

	exports._unrefActive = exports.active = function(item) {
	  clearTimeout(item._idleTimeoutId);

	  var msecs = item._idleTimeout;
	  if (msecs >= 0) {
	    item._idleTimeoutId = setTimeout(function onTimeout() {
	      if (item._onTimeout)
	        item._onTimeout();
	    }, msecs);
	  }
	};

	// That's not how node.js implements it but the exposed api is the same.
	exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
	  var id = nextImmediateId++;
	  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

	  immediateIds[id] = true;

	  nextTick(function onNextTick() {
	    if (immediateIds[id]) {
	      // fn.call() is faster so we optimize for the common use-case
	      // @see http://jsperf.com/call-apply-segu
	      if (args) {
	        fn.apply(null, args);
	      } else {
	        fn.call(null);
	      }
	      // Prevent ids from leaking
	      exports.clearImmediate(id);
	    }
	  });

	  return id;
	};

	exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
	  delete immediateIds[id];
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).setImmediate, __webpack_require__(0).clearImmediate))

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

	exports.ActionResponse = {
	  OK: 0,
	  NONEXISTENT: 1,
	  ERROR: 2
	};

	exports.PROTOCOL_VERSION = 2;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(12);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome
	               && 'undefined' != typeof chrome.storage
	                  ? chrome.storage.local
	                  : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = [
	  'lightseagreen',
	  'forestgreen',
	  'goldenrod',
	  'dodgerblue',
	  'darkorchid',
	  'crimson'
	];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  return ('WebkitAppearance' in document.documentElement.style) ||
	    // is firebug? http://stackoverflow.com/a/398120/376773
	    (window.console && (console.firebug || (console.exception && console.table))) ||
	    // is firefox >= v31?
	    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function(v) {
	  return JSON.stringify(v);
	};


	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs() {
	  var args = arguments;
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '')
	    + this.namespace
	    + (useColors ? ' %c' : ' ')
	    + args[0]
	    + (useColors ? '%c ' : ' ')
	    + '+' + exports.humanize(this.diff);

	  if (!useColors) return args;

	  var c = 'color: ' + this.color;
	  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-z%]/g, function(match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	  return args;
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === typeof console
	    && console.log
	    && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch(e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch(e) {}
	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage(){
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = function (err) {
	  return (err && err.stack) ? err.stack : err
	}


/***/ },
/* 4 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const debug = __webpack_require__(2);
	const maybestack = __webpack_require__(3);
	const ClientAbstract = __webpack_require__(7);
	const ClientPreparer = __webpack_require__(8);

	class Client extends ClientAbstract {
	  constructor(address, options, WebSocket) {
	    super();

	    const _d = this._d = debug('socketeer:Client');

	    this._WebSocket = WebSocket;

	    if (!options) options = {};
	    this._wsConstructArgs = [address, options.protocols, options.ws];
	    this._heartbeatTimeout = options.heartbeatTimeout || 15000;
	    this._handshakeTimeout = options.handshakeTimeout || 10000;
	    this._reconnectWait = options.reconnectWait || 5000;
	    this._failless = options.failless !== false;

	    this._isReady = false;
	    this._isReconnection = false;

	    this._resumePromiseResolve = null;
	    this._resumeToken = null;
	    this._heartbeatTimer = null;
	    this._willReconnect = false;

	    this.ws = {
	      readyState: WebSocket.CLOSED,
	      CLOSED: WebSocket.CLOSED
	    };

	    if (this._failless) {
	      _d('[failless] adding client error handler');
	      this.on('error', err => {
	        _d(`[failless] handling client error: ${ maybestack(err) }`);
	      });
	    }

	    this._prepareConnection();
	  }

	  _prepareConnection() {
	    this._d('preparing new connection');
	    const wsArgs = this._wsConstructArgs;
	    const handshakeTimeout = this._handshakeTimeout;
	    const token = this._resumePromiseResolve ? this._resumeToken : null;

	    const preparer = new ClientPreparer(wsArgs, handshakeTimeout, token, this._WebSocket);
	    preparer.openHandler = () => {
	      this._emit('unreadyOpen', this._isReconnection);
	    };
	    preparer.promise.then(retval => {
	      const ws = retval.ws;
	      const heartbeatInterval = retval.heartbeatInterval;
	      const isResume = retval.isResume;
	      const resumeOk = retval.resumeOk;
	      const resumeToken = retval.resumeToken;

	      // The resume token is reusable on preparation errors.
	      // Only when the token could be successfully consumed do we
	      // prevent reusage of it.
	      this._resumeToken = resumeToken;

	      this._heartbeatInterval = heartbeatInterval;

	      if (isResume && !resumeOk) {
	        return this._resolveSessionResume(false);
	      }

	      this.ws = ws;

	      // See docs/development/extending-client-abstract.md
	      this._socketeerClosing = false;

	      this._attachEvents();
	      this._finalizePreparation(isResume);
	    }).catch(err => {
	      // Do NOT emit the 'error' event if it's a session resume attempt.
	      if (token) {
	        return this._resolveSessionResume(false);
	      }
	      // Else, we can emit the 'error' and 'close' events.
	      this._emit('error', err, true);
	      this._emit('close', null, null, err);
	    });
	  }

	  _finalizePreparation(isSessionResume) {
	    if (!isSessionResume) this._clearMessageQueue();
	    this._isReady = true;
	    this._resetHeartbeatTimeout();
	    this._resumeMessageQueue();
	    if (!isSessionResume) this._emit('open', this._isReconnection);
	    if (isSessionResume) this._resolveSessionResume(true);
	  }

	  _handleClose(closeEvent) {
	    this._isReady = false;
	    this._stopHeartbeatTimeout();
	    super._handleClose(closeEvent);
	  }

	  _handleMessage(messageEvent) {
	    let data = messageEvent.data;

	    this._d('handling message');
	    if (data === 'h') {
	      if (!this.isOpen()) return;
	      this._handleHeartbeat();
	      return;
	    } else {
	      super._handleMessage(messageEvent);
	    }
	  }

	  _resolveSessionResume(isOkay) {
	    const resolve = this._resumePromiseResolve;
	    this._resumePromiseResolve = null;
	    resolve(isOkay);
	  }

	  _handleHeartbeat() {
	    this._d('handling heartbeat');
	    this._resetHeartbeatTimeout();
	    this.ws.send('h');
	    this._emit('ping');
	  }

	  _resetHeartbeatTimeout() {
	    const timeoutPeriod = this._heartbeatInterval + this._heartbeatTimeout;
	    this._d(`resetting heartbeat timeout: ${ timeoutPeriod }`);

	    this._stopHeartbeatTimeout();

	    this._heartbeatTimer = setTimeout(() => {
	      if (!this._isReady) return;
	      this._d('heartbeat timeout called');
	      this._emit('timeout');
	      // TODO: use code 1013
	      this.close(3000, 'heartbeat timeout');
	    }, timeoutPeriod);
	  }

	  _stopHeartbeatTimeout() {
	    this._d('stopping heartbeat timeout');
	    if (this._heartbeatTimer) clearTimeout(this._heartbeatTimer);
	  }

	  resume() {
	    return new Promise((resolve, reject) => {
	      this._d('attempting session resume');
	      if (!this.isClosing() && !this.isClosed()) {
	        this._d('has not closed, nothing to resume');
	        return reject(new Error('client has not disconnected to resume session yet'));
	      }

	      if (!this._resumeToken) {
	        this._d('no resume token, nothing to resume');
	        return resolve(false);
	      }

	      this._resumePromiseResolve = resolve;
	      this._doReconnect();
	    });
	  }

	  reconnect(immediate) {
	    if (!this.isClosing() && !this.isClosed()) {
	      throw new Error('client has not disconnected to reconnect yet');
	    }
	    // Prevent duplicate reconnection attempts.
	    if (this._willReconnect) return;
	    this._willReconnect = true;
	    // Clear out the resume token because
	    // we are not going to resume the session.
	    this._resumeToken = null;
	    const timeout = immediate ? 0 : this._reconnectWait;
	    this._d(`will reconnect in ${ timeout } ms`);
	    setTimeout(() => {
	      this._doReconnect();
	    }, timeout);
	  }

	  _doReconnect() {
	    this._d('reconnecting');
	    this._willReconnect = false;
	    this._isReconnection = true;
	    this._prepareConnection();
	  }
	}

	module.exports = Client;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const Client = __webpack_require__(5);

	class BrowserClient extends Client {
	  constructor(address, options) {
	    super(address, options, window.WebSocket);
	    this._isBrowserClient = true;
	  }
	}

	module.exports = BrowserClient;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const EventEmitter = __webpack_require__(14).EventEmitter;
	const maybestack = __webpack_require__(3);
	const exists = __webpack_require__(13);
	const setImmediateShim = __webpack_require__(16);
	const MessageQueue = __webpack_require__(9);
	const enums = __webpack_require__(1);
	const ActionResponse = enums.ActionResponse;
	const PROTOCOL_VERSION = enums.PROTOCOL_VERSION;

	class ClientAbstract extends EventEmitter {
	  constructor() {
	    super();

	    this._emit = super.emit.bind(this); // EventEmitter's emit
	    this.PROTOCOL_VERSION = PROTOCOL_VERSION;
	    if (!this._d) this._d = () => {};
	    this._da = msg => this._d(`[abstract] ${ msg }`);

	    // We can't have _events, because it's an EventEmitter private property.
	    this._sEvents = new Map();
	    this._actions = new Map();
	    this._actionPromises = new Map();
	    this._currentActionId = 0;
	    this._messageQueue = new MessageQueue((msg, done) => this._processQueue(msg, done));
	    // The message queue is paused by default.
	    this._messageQueue.pause();

	    this._closeMustHaveError = false;
	    this._socketeerClosing = false;

	    // Reserved variable for anyone except the library to use.
	    // Helps with not polluting the Socketeer instance namespace.
	    this.data = {};
	  }

	  _attachEvents() {
	    this._da('attaching events');
	    this.ws.onmessage = messageEvent => this._handleMessage(messageEvent);
	    this.ws.onerror = err => this._handleError(err);
	    this.ws.onclose = closeEvent => this._handleClose(closeEvent);
	  }

	  _detachEvents() {
	    this._da('detaching events');
	    this.ws.onmessage = () => {
	      this._da('warning: a detached websocket emitted the "message" event');
	    };
	    this.ws.onclose = () => {
	      this._da('warning: a detached websocket emitted the "close" event');
	    };
	    // We want to handle any errors the websocket
	    // might emit to prevent unneeded unhandled exceptions.
	    this.ws.onerror = err => {
	      this._da(`handling error of closed connection: ${ maybestack(err) }`);
	    };
	  }

	  emit(name, data) {
	    this._da(`emitting event: ${ name }`);
	    this.send({
	      e: name,
	      d: data
	    });
	  }

	  _handleMessage(messageEvent) {
	    let data = messageEvent.data;
	    // TODO: isBinary: I don't think there is any time that data is a number.
	    let isBinary = messageEvent.binary || !(typeof data === 'string' || typeof data === 'number');
	    const _da = this._da;
	    _da('handling message');

	    if (isBinary) {
	      _da('message handler ignored due to unsupported binary data');
	      return;
	    }

	    if (typeof data !== 'string') {
	      _da('warning: isBinary is false, but data is not a string!');
	      return;
	    }

	    let parsed;
	    try {
	      _da('parsing message JSON');
	      parsed = JSON.parse(data);
	    } catch (err) {
	      _da('JSON parse failed, ignoring: ' + maybestack(err));
	      return;
	    }

	    if (exists(parsed, 'a')) {
	      _da('data is action');
	      this._handleAction(parsed);
	    } else if (exists(parsed, 's')) {
	      _da('data is action response');
	      this._handleActionResponse(parsed);
	    } else if (exists(parsed, 'e')) {
	      _da('data is event');
	      this._handleEvent(parsed);
	    } else {
	      _da('data is of unknown type, ignoring');
	    }

	    return;
	  }

	  close(code, message) {
	    this._da('closing connection');
	    this.ws.close(code, message);
	  }

	  terminate() {
	    this._da('terminating connection');
	    this.ws.terminate();
	  }

	  _handleError(err) {
	    this._da(`handling error: ${ maybestack(err) }`);
	    // Assure that _handleClose or _handleError emits an event only once.
	    if (this._socketeerClosing) {
	      this._da('socketeer is closing, ignoring _handleError');
	      return;
	    }
	    this._emit('error', err, true);
	    this._closeMustHaveError = true;
	    this.close();
	    this._da('error handling: handling close');
	    if (!err) err = new Error('unknown, unspecified error');
	    this._handleClose({
	      code: null,
	      reason: null,
	      error: err
	    });
	  }

	  _handleClose(closeEvent) {
	    this._da('handling close');
	    // Assure that _handleClose or _handleError emits an event only once.
	    if (this._socketeerClosing) {
	      this._da('socketeer is closing, ignoring _handleClose');
	      return;
	    }
	    if (!closeEvent) closeEvent = {};
	    let error = closeEvent.error;
	    let code = closeEvent.code;
	    let message = closeEvent.reason;
	    if (!error) error = null;
	    // This is in the case the websocket emits the 'close' event
	    //  before we get the chance to call the _handleClose
	    //  in the _handleError function.
	    // TODO: Is this really necessary?
	    if (!error && this._closeMustHaveError) {
	      this._da('ignoring close message because it does not have error, but it was specified that it should');
	      return;
	    }
	    this._socketeerClosing = true;
	    this._closeMustHaveError = false;
	    this._da('close code: ' + code);
	    this._da('close message: ' + message);
	    this._da('close error: ' + maybestack(error));
	    this._detachEvents();
	    const eventName = this._closeIsPause ? 'pause' : 'close';
	    this._emit(eventName, code, message, error);
	  }

	  _processQueue(msg, done) {
	    if (!this.isOpen()) {
	      this._da('socket is not open, pausing message queue');
	      this._messageQueue.pause();
	      this._messageQueue.unshift(msg);
	      return setImmediateShim(done);
	    } else {
	      this._da('sending next message in queue');
	      return this.ws.send(msg, done);
	    }
	  }

	  _resumeMessageQueue() {
	    this._da('resuming message queue');
	    this._messageQueue.resume();
	  }

	  _clearMessageQueue() {
	    this._da('clearing message queue');
	    this._messageQueue.kill();
	  }

	  send(obj) {
	    this._da('adding message to message queue');
	    let data;
	    try {
	      data = JSON.stringify(obj);
	    } catch (err) {
	      this._da(`could not stringify message for sending: ${ maybestack(err) }`);
	    }
	    this._messageQueue.push(data);
	  }

	  _handleAction(data) {
	    this._da(`handling action: ${ data.a }`);
	    const handler = this._actions.get(data.a);
	    if (!handler) {
	      this._da('action handler does not exist');
	      return this.send({
	        i: data.i,
	        s: ActionResponse.NONEXISTENT,
	        d: ActionResponse.NONEXISTENT
	      });
	    }

	    let handlerPromise;
	    this._da('calling action handler');
	    try {
	      handlerPromise = handler(data.d);
	    } catch (err) {
	      this._da(`action handler errored (call fail), responding: ${ maybestack(err) }`);
	      this.send({
	        i: data.i,
	        s: ActionResponse.ERROR,
	        d: ActionResponse.ERROR
	      });
	      // Non-connection closing error.
	      return this._emit('error', new Error(`action handler for ${ data.a } call errored: ${ maybestack(err) }`));
	    }

	    // Make sure handlerPromise is actually a promise.
	    if (!handlerPromise || typeof handlerPromise.then !== 'function' || typeof handlerPromise.catch !== 'function') {
	      this._da('action handler for action ' + data.a + ' does not return a promise');
	      this.send({
	        i: data.i,
	        s: ActionResponse.ERROR,
	        d: ActionResponse.ERROR
	      });
	      // Non-connection closing error.
	      return this._emit('error', new Error('action handler for ' + data.a + ' does not return a promise'));
	    }

	    handlerPromise.then(response => {
	      this._da(`action handler for ${ data.a } thenned, responding`);
	      this.send({
	        i: data.i,
	        s: ActionResponse.OK,
	        d: response
	      });
	    }).catch(err => {
	      this._da(`action handler errored (promise catch), responding: ${ maybestack(err) }`);
	      this.send({
	        i: data.i,
	        s: ActionResponse.ERROR,
	        d: ActionResponse.ERROR
	      });
	      // Non-connection closing error
	      this._emit('error', new Error(`action handler for ${ data.a } catch errored: ${ maybestack(err) }`));
	    });
	  }

	  _handleActionResponse(data) {
	    this._da(`handling action response: ${ data.i }`);
	    const handler = this._actionPromises.get(data.i);
	    // The timeout could have cleaned up the handler.
	    if (!handler) return;
	    // Indicate to the action timeout that it should not do anything
	    handler.finished = true;
	    if (handler.timeout) clearTimeout(handler.timeout);
	    this._da('action response handler exists, continuing');
	    this._da(`determining error from status: ${ data.s }`);
	    let err;
	    switch (data.s) {
	      case ActionResponse.OK:
	        break;
	      case ActionResponse.ERROR:
	        err = new Error('an error occured processing action');
	        break;
	      case ActionResponse.NONEXISTENT:
	        err = new Error('action does not exist');
	        break;
	      default:
	        err = new Error(`an unknown non-OK response was received: ${ data.s }`);
	    }
	    this._da('calling action response handler');
	    try {
	      if (!err) {
	        handler.resolve(data.d);
	      } else {
	        handler.reject(err);
	      }
	    } catch (err) {
	      this._emit('error', new Error('could not resolve or reject the action response handler: ' + err));
	    }
	    this._actionPromises.delete(data.i);
	  }

	  _handleEvent(data) {
	    this._da(`handling event: ${ data.e }`);
	    const handlers = this._sEvents.get(data.e);
	    if (!handlers || !handlers.length) return;
	    this._da(`handlers exist for event ${ data.e }: there are ${ handlers.length } handlers`);
	    for (let handler of handlers) {
	      try {
	        handler(data.d);
	      } catch (err) {
	        this._da('an error occured calling the event handler');
	        // Non-connection closing error
	        this._emit('error', err);
	        continue; // Go ahead and take care of the other event handlers.
	      }
	    }
	  }

	  event(name, handler) {
	    if (typeof handler !== 'function') {
	      throw new Error('event handler is not a function');
	    }
	    this._da(`defining event handler for ${ name }`);
	    if (!this._sEvents.get(name)) this._sEvents.set(name, []);
	    this._sEvents.get(name).push(handler);
	  }

	  action(name, handler, force) {
	    if (typeof handler !== 'function') {
	      throw new Error('action handler is not a function');
	    }
	    this._da(`defining action handler for ${ name }`);
	    if (this._actions.get(name) && !force) {
	      this._da('action handler is already defined');
	      throw new Error('action handler is already set (use the "force" flag to override)');
	    }
	    this._actions.set(name, handler);
	  }

	  request(name, data, opts) {
	    return new Promise((resolve, reject) => {
	      if (!opts) opts = {};
	      if (opts.timeout === undefined) opts.timeout = 30000; // default 30 second timeout
	      const id = this._generateActionId();
	      const action = {
	        resolve: resolve,
	        reject: reject,
	        finished: false
	      };
	      if (opts.timeout) {
	        action.timeout = setTimeout(() => {
	          if (action.finished) return;
	          this._d(`Action ID ${ id } timed out`);
	          this._actionPromises.delete(id);
	          action.reject(new Error('Action timed out'));
	        }, opts.timeout);
	      }
	      this._actionPromises.set(id, action);
	      this.send({
	        i: id,
	        a: name,
	        d: data
	      });
	    });
	  }

	  _generateActionId() {
	    this._da(`generated action id: ${ this._currentActionId }`);
	    return this._currentActionId++;
	  }

	  isOpening() {
	    return this.ws.readyState === this.ws.CONNECTING;
	  }

	  isOpen() {
	    return this.ws.readyState === this.ws.OPEN;
	  }

	  isClosing() {
	    return this.ws.readyState === this.ws.CLOSING;
	  }

	  isClosed() {
	    return this.ws.readyState === this.ws.CLOSED;
	  }
	}

	module.exports = ClientAbstract;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const debug = __webpack_require__(2);
	const validateSessionResumeToken = __webpack_require__(10).validateSessionResumeToken;
	const PROTOCOL_VERSION = __webpack_require__(1).PROTOCOL_VERSION;

	class ClientPreparer {
	  constructor(wsArgs, handshakeTimeout, token, WebSocket) {
	    this.wsArgs = wsArgs;
	    this.handshakeTimeout = handshakeTimeout;
	    this.resumeToken = token;
	    this._WebSocket = WebSocket;
	    this._d = debug('socketeer:ClientPreparer');
	    this.prepared = false;
	    this.promise = new Promise((resolve, reject) => {
	      this.resolve = resolve;
	      this.reject = reject;
	    });
	    // Can be overriden immediately after construction.
	    this.openHandler = noop;
	    this.handshakeStep = 0;
	    this.returnValue = {
	      ws: null,
	      heartbeatInterval: null,
	      isResume: !!token,
	      resumeOk: false,
	      resumeToken: null
	    };
	    this.createSocket();
	  }

	  createSocket() {
	    this._d('creating websocket');
	    this.ws = this.returnValue.ws = createWebsocket(this._WebSocket, this.wsArgs);
	    this.ws.onopen = () => this.handleOpen();
	    this.ws.onmessage = messageEvent => this.handleMessage(messageEvent);
	    this.ws.onerror = err => this.handleError(err);
	    this.ws.onclose = closeEvent => this.handleClose(closeEvent);
	  }

	  handleOpen() {
	    this._d('handling open');
	    this.openHandler(); // used to emit unreadyOpen
	    this.startHandshakeTimeout();
	  }

	  handleError(err) {
	    this._d('handling error (unfiltered)');
	    if (this.prepared) return;
	    this._d('handling error');
	    this.prepared = true;
	    // TODO: Can this call handleClose before we can call our rejection?
	    this.ws.close();
	    this.reject(err);
	  }

	  handleClose() {
	    this._d('handling close (unfiltered)');
	    if (this.prepared) return;
	    this._d('handling close');
	    this.prepared = true;
	    this.ws.close();
	    this.reject(new Error('Socket closed before handshake could complete.'));
	  }

	  handleMessage(messageEvent) {
	    // TODO: Is there a chance this could be fired after we resolve the handshake?
	    this._d('handling message (unfiltered)');
	    if (this.prepared) return;
	    this._d('handling message');
	    const data = messageEvent.data;
	    switch (this.handshakeStep) {
	      case 0:
	        this.handshakeStep = 1;
	        return this.handleServerHandshake(data);
	      case 1:
	        this.handshakeStep = 2;
	        return this.handleHandshakeResponse(data);
	      case 2:
	        return this.handleError(new Error('Server sent an unexpected handshake message.'));
	      default:
	        return this.handleError(new Error(`[INTERNAL ERROR] Unknown handshake step: ${ this.handshakeStep }`));
	    }
	  }

	  handleServerHandshake(data) {
	    this._d('handling server handshake');
	    if (typeof data !== 'string') {
	      return this.handleError(new Error('Handshake data is not a string.'));
	    }

	    const parts = data.split(':');
	    /*
	      The first part of the message should be the string: 'socketeer'.
	      This indicates that the server is in fact a socketeer server.
	     */
	    if (parts[0] !== 'socketeer') {
	      return this.handleError(new Error('Server is not a Socketeer server.'));
	    }

	    /*
	      The second part of the message should be the server protocol version.
	      This is to ensure compatibility.
	       See the protocol docs for validation requirements.
	     */
	    if (typeof parts[1] !== 'string' || parts[1].indexOf('v') !== 0) {
	      return this.handleError(new Error('Server protcol version is not specified.'));
	    }
	    const serverVersion = Math.floor(+parts[1].replace(/^v/, ''));
	    if (Number.isNaN(parts[1]) || parts[1] <= 0) {
	      return this.handleError(new Error('Server protocol version is invalid.'));
	    }

	    if (serverVersion !== PROTOCOL_VERSION) {
	      return this.ws.send(`v${ PROTOCOL_VERSION }`, err => {
	        const errMessage = 'Server protcol is incompatible with the client.';
	        if (err) {
	          return this.handleError(new Error(`${ errMessage } (failed telling the server our version)`));
	        } else {
	          return this.handleError(new Error(errMessage));
	        }
	      });
	    }

	    /*
	      The third part of the message should be the heartbeat interval set message.
	      This is to make heartbeats work.
	       See the protocol docs for validation requirements.
	     */
	    if (typeof parts[2] !== 'string' || parts[2].indexOf('i') !== 0) {
	      return this.handleError(new Error('Heartbeat interval set message not provided.'));
	    }
	    const serverHeartbeatInterval = Math.floor(+parts[2].replace(/^i/, ''));
	    if (Number.isNaN(parts[2]) || parts[2] < 0 || parts[2] > 2147483647) {
	      return this.handleError(new Error('Server\'s heartbeat interval is invalid.'));
	    }

	    this.returnValue.heartbeatInterval = serverHeartbeatInterval;

	    /*
	      Now we send our handshake message.
	     */
	    if (this.resumeToken) {
	      this._d('attempting session resume');
	      this.ws.send(`r@${ this.resumeToken }`);
	    } else {
	      this._d('querying for session resume token');
	      this.ws.send('r?');
	    }
	  }

	  handleHandshakeResponse(data) {
	    this._d('handling handshake response');
	    if (typeof data !== 'string') {
	      return this.handleError(new Error('Handshake response is not a string.'));
	    }

	    const parts = data.split(':');
	    /*
	      The first part should be either 'err' or 'ok'.
	      If err, then handle the error.
	     */
	    if (parts[0] === 'ok') {
	      // Do nothing.
	    } else if (parts[0] === 'err') {
	        // TODO: Should the protocol have err?
	        return this.handleError(new Error('Server encountered an error during handshake.'));
	      } else {
	        return this.handleError(new Error('Server sent an unexpected handshake response status.'));
	      }

	    /*
	      The second part should be the session resume status.
	      Either way, the other functions take care of this.
	     */
	    if (this.resumeToken) {
	      this.handlePotentialSessionResume(parts);
	    } else {
	      this.handleSetSessionResume(parts);
	    }
	  }

	  handlePotentialSessionResume(parts) {
	    this._d('handling potential session resume');
	    /*
	      Check the session resume status. It must be either - or +
	     */
	    if (parts[1] === '-') {
	      this.returnValue.resumeOk = false;
	      return this.finishPreparation();
	    } else if (parts[1] === '+') {
	      // This means we have also have a new session resume token.
	      const newToken = parts[2];
	      if (!validateSessionResumeToken(newToken)) {
	        return this.handleError(new Error('Invalid new session resume token.'));
	      } else {
	        this.returnValue.resumeOk = true;
	        this.returnValue.resumeToken = newToken;
	        return this.finishPreparation();
	      }
	    } else {
	      return this.handleError(new Error('Invalid session resume status.'));
	    }
	  }

	  handleSetSessionResume(parts) {
	    this._d('handling set session resume');
	    /*
	      Check the session resume status. It must be either y or n
	     */
	    if (parts[1] === 'y') {
	      // This means we also have a session resume token.
	      const newToken = parts[2];
	      if (!validateSessionResumeToken(newToken)) {
	        return this.handleError(new Error('Invalid new session resume token.'));
	      } else {
	        this.returnValue.resumeToken = newToken;
	        return this.finishPreparation();
	      }
	    } else if (parts[1] === 'n') {
	      return this.finishPreparation();
	    } else {
	      return this.handleError(new Error('Invalid session resume support status.'));
	    }
	  }

	  finishPreparation() {
	    this._d('finishing preparation');
	    this.prepared = true;
	    if (this.returnValue.isResume && !this.returnValue.resumeOk) this.ws.close();
	    this.resolve(this.returnValue);
	  }

	  startHandshakeTimeout() {
	    this._d('starting handshake timeout');
	    // We do not require a stop function because
	    // the timeout is per-instance only. If ClientPreparer.prepared = true,
	    // then it will stay prepared forever and ever.
	    // On Client reconnection, we create a new instance of ClientPreparer.
	    // TODO: Will having a stop function make garbage collection faster?
	    setTimeout(() => {
	      if (this.prepared) return;
	      this.prepared = true;
	      this.ws.close();
	      this.reject(new Error('Handshake timed out.'));
	    }, this.handshakeTimeout);
	  }
	}

	function createWebsocket(WebSocket, args) {
	  // Max of 3 construct args so far
	  return new WebSocket(args[0], args[1], args[2]);
	}

	function noop() {}

	module.exports = ClientPreparer;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// TODO: Replace async.queue with our own message queue.

	module.exports = __webpack_require__(11).queue;

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	exports.validateSessionResumeToken = function (token) {
	  // Note: If the session resume token does have a : in it during the handshake,
	  // then it will cause session resuming to silently fail.
	  if (typeof token !== 'string' || token.length < 5 || token.length > 200 || token.indexOf(':') !== -1) {
	    return false;
	  }
	  return true;
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, global, setImmediate, process) {(function (global, factory) {
	     true ? factory(exports) :
	    typeof define === 'function' && define.amd ? define(['exports'], factory) :
	    (factory((global.async = global.async || {})));
	}(this, function (exports) { 'use strict';

	    /**
	     * A faster alternative to `Function#apply`, this function invokes `func`
	     * with the `this` binding of `thisArg` and the arguments of `args`.
	     *
	     * @private
	     * @param {Function} func The function to invoke.
	     * @param {*} thisArg The `this` binding of `func`.
	     * @param {...*} args The arguments to invoke `func` with.
	     * @returns {*} Returns the result of `func`.
	     */
	    function apply(func, thisArg, args) {
	      var length = args.length;
	      switch (length) {
	        case 0: return func.call(thisArg);
	        case 1: return func.call(thisArg, args[0]);
	        case 2: return func.call(thisArg, args[0], args[1]);
	        case 3: return func.call(thisArg, args[0], args[1], args[2]);
	      }
	      return func.apply(thisArg, args);
	    }

	    /**
	     * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
	     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	     * @example
	     *
	     * _.isObject({});
	     * // => true
	     *
	     * _.isObject([1, 2, 3]);
	     * // => true
	     *
	     * _.isObject(_.noop);
	     * // => true
	     *
	     * _.isObject(null);
	     * // => false
	     */
	    function isObject(value) {
	      var type = typeof value;
	      return !!value && (type == 'object' || type == 'function');
	    }

	    var funcTag = '[object Function]';
	    var genTag = '[object GeneratorFunction]';
	    /** Used for built-in method references. */
	    var objectProto = Object.prototype;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString = objectProto.toString;

	    /**
	     * Checks if `value` is classified as a `Function` object.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isFunction(_);
	     * // => true
	     *
	     * _.isFunction(/abc/);
	     * // => false
	     */
	    function isFunction(value) {
	      // The use of `Object#toString` avoids issues with the `typeof` operator
	      // in Safari 8 which returns 'object' for typed array and weak map constructors,
	      // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
	      var tag = isObject(value) ? objectToString.call(value) : '';
	      return tag == funcTag || tag == genTag;
	    }

	    /**
	     * Checks if `value` is object-like. A value is object-like if it's not `null`
	     * and has a `typeof` result of "object".
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	     * @example
	     *
	     * _.isObjectLike({});
	     * // => true
	     *
	     * _.isObjectLike([1, 2, 3]);
	     * // => true
	     *
	     * _.isObjectLike(_.noop);
	     * // => false
	     *
	     * _.isObjectLike(null);
	     * // => false
	     */
	    function isObjectLike(value) {
	      return !!value && typeof value == 'object';
	    }

	    /** `Object#toString` result references. */
	    var symbolTag = '[object Symbol]';

	    /** Used for built-in method references. */
	    var objectProto$1 = Object.prototype;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString$1 = objectProto$1.toString;

	    /**
	     * Checks if `value` is classified as a `Symbol` primitive or object.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isSymbol(Symbol.iterator);
	     * // => true
	     *
	     * _.isSymbol('abc');
	     * // => false
	     */
	    function isSymbol(value) {
	      return typeof value == 'symbol' ||
	        (isObjectLike(value) && objectToString$1.call(value) == symbolTag);
	    }

	    /** Used as references for various `Number` constants. */
	    var NAN = 0 / 0;

	    /** Used to match leading and trailing whitespace. */
	    var reTrim = /^\s+|\s+$/g;

	    /** Used to detect bad signed hexadecimal string values. */
	    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	    /** Used to detect binary string values. */
	    var reIsBinary = /^0b[01]+$/i;

	    /** Used to detect octal string values. */
	    var reIsOctal = /^0o[0-7]+$/i;

	    /** Built-in method references without a dependency on `root`. */
	    var freeParseInt = parseInt;

	    /**
	     * Converts `value` to a number.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to process.
	     * @returns {number} Returns the number.
	     * @example
	     *
	     * _.toNumber(3);
	     * // => 3
	     *
	     * _.toNumber(Number.MIN_VALUE);
	     * // => 5e-324
	     *
	     * _.toNumber(Infinity);
	     * // => Infinity
	     *
	     * _.toNumber('3');
	     * // => 3
	     */
	    function toNumber(value) {
	      if (typeof value == 'number') {
	        return value;
	      }
	      if (isSymbol(value)) {
	        return NAN;
	      }
	      if (isObject(value)) {
	        var other = isFunction(value.valueOf) ? value.valueOf() : value;
	        value = isObject(other) ? (other + '') : other;
	      }
	      if (typeof value != 'string') {
	        return value === 0 ?  value : +value;
	      }
	      value = value.replace(reTrim, '');
	      var isBinary = reIsBinary.test(value);
	      return (isBinary || reIsOctal.test(value))
	        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
	        : (reIsBadHex.test(value) ? NAN : +value);
	    }

	    var INFINITY = 1 / 0;
	    var MAX_INTEGER = 1.7976931348623157e+308;
	    /**
	     * Converts `value` to an integer.
	     *
	     * **Note:** This function is loosely based on
	     * [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to convert.
	     * @returns {number} Returns the converted integer.
	     * @example
	     *
	     * _.toInteger(3);
	     * // => 3
	     *
	     * _.toInteger(Number.MIN_VALUE);
	     * // => 0
	     *
	     * _.toInteger(Infinity);
	     * // => 1.7976931348623157e+308
	     *
	     * _.toInteger('3');
	     * // => 3
	     */
	    function toInteger(value) {
	      if (!value) {
	        return value === 0 ? value : 0;
	      }
	      value = toNumber(value);
	      if (value === INFINITY || value === -INFINITY) {
	        var sign = (value < 0 ? -1 : 1);
	        return sign * MAX_INTEGER;
	      }
	      var remainder = value % 1;
	      return value === value ? (remainder ? value - remainder : value) : 0;
	    }

	    /** Used as the `TypeError` message for "Functions" methods. */
	    var FUNC_ERROR_TEXT = 'Expected a function';

	    /* Built-in method references for those with the same name as other `lodash` methods. */
	    var nativeMax = Math.max;

	    /**
	     * Creates a function that invokes `func` with the `this` binding of the
	     * created function and arguments from `start` and beyond provided as
	     * an array.
	     *
	     * **Note:** This method is based on the
	     * [rest parameter](https://mdn.io/rest_parameters).
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Function
	     * @param {Function} func The function to apply a rest parameter to.
	     * @param {number} [start=func.length-1] The start position of the rest parameter.
	     * @returns {Function} Returns the new function.
	     * @example
	     *
	     * var say = _.rest(function(what, names) {
	     *   return what + ' ' + _.initial(names).join(', ') +
	     *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
	     * });
	     *
	     * say('hello', 'fred', 'barney', 'pebbles');
	     * // => 'hello fred, barney, & pebbles'
	     */
	    function rest(func, start) {
	      if (typeof func != 'function') {
	        throw new TypeError(FUNC_ERROR_TEXT);
	      }
	      start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
	      return function() {
	        var args = arguments,
	            index = -1,
	            length = nativeMax(args.length - start, 0),
	            array = Array(length);

	        while (++index < length) {
	          array[index] = args[start + index];
	        }
	        switch (start) {
	          case 0: return func.call(this, array);
	          case 1: return func.call(this, args[0], array);
	          case 2: return func.call(this, args[0], args[1], array);
	        }
	        var otherArgs = Array(start + 1);
	        index = -1;
	        while (++index < start) {
	          otherArgs[index] = args[index];
	        }
	        otherArgs[start] = array;
	        return apply(func, this, otherArgs);
	      };
	    }

	    function initialParams (fn) {
	        return rest(function (args /*..., callback*/) {
	            var callback = args.pop();
	            fn.call(this, args, callback);
	        });
	    }

	    function applyEach$1(eachfn) {
	        return rest(function (fns, args) {
	            var go = initialParams(function (args, callback) {
	                var that = this;
	                return eachfn(fns, function (fn, cb) {
	                    fn.apply(that, args.concat([cb]));
	                }, callback);
	            });
	            if (args.length) {
	                return go.apply(this, args);
	            } else {
	                return go;
	            }
	        });
	    }

	    /**
	     * A no-operation function that returns `undefined` regardless of the
	     * arguments it receives.
	     *
	     * @static
	     * @memberOf _
	     * @since 2.3.0
	     * @category Util
	     * @example
	     *
	     * var object = { 'user': 'fred' };
	     *
	     * _.noop(object) === undefined;
	     * // => true
	     */
	    function noop() {
	      // No operation performed.
	    }

	    function once(fn) {
	        return function () {
	            if (fn === null) return;
	            fn.apply(this, arguments);
	            fn = null;
	        };
	    }

	    /**
	     * The base implementation of `_.property` without support for deep paths.
	     *
	     * @private
	     * @param {string} key The key of the property to get.
	     * @returns {Function} Returns the new function.
	     */
	    function baseProperty(key) {
	      return function(object) {
	        return object == null ? undefined : object[key];
	      };
	    }

	    /**
	     * Gets the "length" property value of `object`.
	     *
	     * **Note:** This function is used to avoid a
	     * [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792) that affects
	     * Safari on at least iOS 8.1-8.3 ARM64.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @returns {*} Returns the "length" value.
	     */
	    var getLength = baseProperty('length');

	    /** Used as references for various `Number` constants. */
	    var MAX_SAFE_INTEGER = 9007199254740991;

	    /**
	     * Checks if `value` is a valid array-like length.
	     *
	     * **Note:** This function is loosely based on
	     * [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is a valid length,
	     *  else `false`.
	     * @example
	     *
	     * _.isLength(3);
	     * // => true
	     *
	     * _.isLength(Number.MIN_VALUE);
	     * // => false
	     *
	     * _.isLength(Infinity);
	     * // => false
	     *
	     * _.isLength('3');
	     * // => false
	     */
	    function isLength(value) {
	      return typeof value == 'number' &&
	        value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
	    }

	    /**
	     * Checks if `value` is array-like. A value is considered array-like if it's
	     * not a function and has a `value.length` that's an integer greater than or
	     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	     * @example
	     *
	     * _.isArrayLike([1, 2, 3]);
	     * // => true
	     *
	     * _.isArrayLike(document.body.children);
	     * // => true
	     *
	     * _.isArrayLike('abc');
	     * // => true
	     *
	     * _.isArrayLike(_.noop);
	     * // => false
	     */
	    function isArrayLike(value) {
	      return value != null && isLength(getLength(value)) && !isFunction(value);
	    }

	    var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

	    function getIterator (coll) {
	        return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
	    }

	    /* Built-in method references for those with the same name as other `lodash` methods. */
	    var nativeGetPrototype = Object.getPrototypeOf;

	    /**
	     * Gets the `[[Prototype]]` of `value`.
	     *
	     * @private
	     * @param {*} value The value to query.
	     * @returns {null|Object} Returns the `[[Prototype]]`.
	     */
	    function getPrototype(value) {
	      return nativeGetPrototype(Object(value));
	    }

	    /** Used for built-in method references. */
	    var objectProto$2 = Object.prototype;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty = objectProto$2.hasOwnProperty;

	    /**
	     * The base implementation of `_.has` without support for deep paths.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {Array|string} key The key to check.
	     * @returns {boolean} Returns `true` if `key` exists, else `false`.
	     */
	    function baseHas(object, key) {
	      // Avoid a bug in IE 10-11 where objects with a [[Prototype]] of `null`,
	      // that are composed entirely of index properties, return `false` for
	      // `hasOwnProperty` checks of them.
	      return hasOwnProperty.call(object, key) ||
	        (typeof object == 'object' && key in object && getPrototype(object) === null);
	    }

	    /* Built-in method references for those with the same name as other `lodash` methods. */
	    var nativeKeys = Object.keys;

	    /**
	     * The base implementation of `_.keys` which doesn't skip the constructor
	     * property of prototypes or treat sparse arrays as dense.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @returns {Array} Returns the array of property names.
	     */
	    function baseKeys(object) {
	      return nativeKeys(Object(object));
	    }

	    /**
	     * The base implementation of `_.times` without support for iteratee shorthands
	     * or max array length checks.
	     *
	     * @private
	     * @param {number} n The number of times to invoke `iteratee`.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @returns {Array} Returns the array of results.
	     */
	    function baseTimes(n, iteratee) {
	      var index = -1,
	          result = Array(n);

	      while (++index < n) {
	        result[index] = iteratee(index);
	      }
	      return result;
	    }

	    /**
	     * This method is like `_.isArrayLike` except that it also checks if `value`
	     * is an object.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is an array-like object,
	     *  else `false`.
	     * @example
	     *
	     * _.isArrayLikeObject([1, 2, 3]);
	     * // => true
	     *
	     * _.isArrayLikeObject(document.body.children);
	     * // => true
	     *
	     * _.isArrayLikeObject('abc');
	     * // => false
	     *
	     * _.isArrayLikeObject(_.noop);
	     * // => false
	     */
	    function isArrayLikeObject(value) {
	      return isObjectLike(value) && isArrayLike(value);
	    }

	    /** `Object#toString` result references. */
	    var argsTag = '[object Arguments]';

	    /** Used for built-in method references. */
	    var objectProto$3 = Object.prototype;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty$1 = objectProto$3.hasOwnProperty;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString$2 = objectProto$3.toString;

	    /** Built-in value references. */
	    var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

	    /**
	     * Checks if `value` is likely an `arguments` object.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isArguments(function() { return arguments; }());
	     * // => true
	     *
	     * _.isArguments([1, 2, 3]);
	     * // => false
	     */
	    function isArguments(value) {
	      // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
	      return isArrayLikeObject(value) && hasOwnProperty$1.call(value, 'callee') &&
	        (!propertyIsEnumerable.call(value, 'callee') || objectToString$2.call(value) == argsTag);
	    }

	    /**
	     * Checks if `value` is classified as an `Array` object.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @type {Function}
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isArray([1, 2, 3]);
	     * // => true
	     *
	     * _.isArray(document.body.children);
	     * // => false
	     *
	     * _.isArray('abc');
	     * // => false
	     *
	     * _.isArray(_.noop);
	     * // => false
	     */
	    var isArray = Array.isArray;

	    /** `Object#toString` result references. */
	    var stringTag = '[object String]';

	    /** Used for built-in method references. */
	    var objectProto$4 = Object.prototype;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString$3 = objectProto$4.toString;

	    /**
	     * Checks if `value` is classified as a `String` primitive or object.
	     *
	     * @static
	     * @since 0.1.0
	     * @memberOf _
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isString('abc');
	     * // => true
	     *
	     * _.isString(1);
	     * // => false
	     */
	    function isString(value) {
	      return typeof value == 'string' ||
	        (!isArray(value) && isObjectLike(value) && objectToString$3.call(value) == stringTag);
	    }

	    /**
	     * Creates an array of index keys for `object` values of arrays,
	     * `arguments` objects, and strings, otherwise `null` is returned.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @returns {Array|null} Returns index keys, else `null`.
	     */
	    function indexKeys(object) {
	      var length = object ? object.length : undefined;
	      if (isLength(length) &&
	          (isArray(object) || isString(object) || isArguments(object))) {
	        return baseTimes(length, String);
	      }
	      return null;
	    }

	    /** Used as references for various `Number` constants. */
	    var MAX_SAFE_INTEGER$1 = 9007199254740991;

	    /** Used to detect unsigned integer values. */
	    var reIsUint = /^(?:0|[1-9]\d*)$/;

	    /**
	     * Checks if `value` is a valid array-like index.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	     */
	    function isIndex(value, length) {
	      value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
	      length = length == null ? MAX_SAFE_INTEGER$1 : length;
	      return value > -1 && value % 1 == 0 && value < length;
	    }

	    /** Used for built-in method references. */
	    var objectProto$5 = Object.prototype;

	    /**
	     * Checks if `value` is likely a prototype object.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	     */
	    function isPrototype(value) {
	      var Ctor = value && value.constructor,
	          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$5;

	      return value === proto;
	    }

	    /**
	     * Creates an array of the own enumerable property names of `object`.
	     *
	     * **Note:** Non-object values are coerced to objects. See the
	     * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
	     * for more details.
	     *
	     * @static
	     * @since 0.1.0
	     * @memberOf _
	     * @category Object
	     * @param {Object} object The object to query.
	     * @returns {Array} Returns the array of property names.
	     * @example
	     *
	     * function Foo() {
	     *   this.a = 1;
	     *   this.b = 2;
	     * }
	     *
	     * Foo.prototype.c = 3;
	     *
	     * _.keys(new Foo);
	     * // => ['a', 'b'] (iteration order is not guaranteed)
	     *
	     * _.keys('hi');
	     * // => ['0', '1']
	     */
	    function keys(object) {
	      var isProto = isPrototype(object);
	      if (!(isProto || isArrayLike(object))) {
	        return baseKeys(object);
	      }
	      var indexes = indexKeys(object),
	          skipIndexes = !!indexes,
	          result = indexes || [],
	          length = result.length;

	      for (var key in object) {
	        if (baseHas(object, key) &&
	            !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
	            !(isProto && key == 'constructor')) {
	          result.push(key);
	        }
	      }
	      return result;
	    }

	    function iterator(coll) {
	        var i = -1;
	        var len;
	        if (isArrayLike(coll)) {
	            len = coll.length;
	            return function next() {
	                i++;
	                return i < len ? { value: coll[i], key: i } : null;
	            };
	        }

	        var iterate = getIterator(coll);
	        if (iterate) {
	            return function next() {
	                var item = iterate.next();
	                if (item.done) return null;
	                i++;
	                return { value: item.value, key: i };
	            };
	        }

	        var okeys = keys(coll);
	        len = okeys.length;
	        return function next() {
	            i++;
	            var key = okeys[i];
	            return i < len ? { value: coll[key], key: key } : null;
	        };
	    }

	    function onlyOnce(fn) {
	        return function () {
	            if (fn === null) throw new Error("Callback was already called.");
	            fn.apply(this, arguments);
	            fn = null;
	        };
	    }

	    function _eachOfLimit(limit) {
	        return function (obj, iteratee, callback) {
	            callback = once(callback || noop);
	            obj = obj || [];
	            var nextElem = iterator(obj);
	            if (limit <= 0) {
	                return callback(null);
	            }
	            var done = false;
	            var running = 0;
	            var errored = false;

	            (function replenish() {
	                if (done && running <= 0) {
	                    return callback(null);
	                }

	                while (running < limit && !errored) {
	                    var elem = nextElem();
	                    if (elem === null) {
	                        done = true;
	                        if (running <= 0) {
	                            callback(null);
	                        }
	                        return;
	                    }
	                    running += 1;
	                    iteratee(elem.value, elem.key, onlyOnce(function (err) {
	                        running -= 1;
	                        if (err) {
	                            callback(err);
	                            errored = true;
	                        } else {
	                            replenish();
	                        }
	                    }));
	                }
	            })();
	        };
	    }

	    function doParallelLimit(fn) {
	        return function (obj, limit, iteratee, callback) {
	            return fn(_eachOfLimit(limit), obj, iteratee, callback);
	        };
	    }

	    function _asyncMap(eachfn, arr, iteratee, callback) {
	        callback = once(callback || noop);
	        arr = arr || [];
	        var results = isArrayLike(arr) || getIterator(arr) ? [] : {};
	        eachfn(arr, function (value, index, callback) {
	            iteratee(value, function (err, v) {
	                results[index] = v;
	                callback(err);
	            });
	        }, function (err) {
	            callback(err, results);
	        });
	    }

	    var mapLimit = doParallelLimit(_asyncMap);

	    function doLimit(fn, limit) {
	        return function (iterable, iteratee, callback) {
	            return fn(iterable, limit, iteratee, callback);
	        };
	    }

	    var map = doLimit(mapLimit, Infinity);

	    var applyEach = applyEach$1(map);

	    var mapSeries = doLimit(mapLimit, 1);

	    var applyEachSeries = applyEach$1(mapSeries);

	    var apply$1 = rest(function (fn, args) {
	        return rest(function (callArgs) {
	            return fn.apply(null, args.concat(callArgs));
	        });
	    });

	    function asyncify(func) {
	        return initialParams(function (args, callback) {
	            var result;
	            try {
	                result = func.apply(this, args);
	            } catch (e) {
	                return callback(e);
	            }
	            // if result is Promise object
	            if (isObject(result) && typeof result.then === 'function') {
	                result.then(function (value) {
	                    callback(null, value);
	                })['catch'](function (err) {
	                    callback(err.message ? err : new Error(err));
	                });
	            } else {
	                callback(null, result);
	            }
	        });
	    }

	    /**
	     * A specialized version of `_.forEach` for arrays without support for
	     * iteratee shorthands.
	     *
	     * @private
	     * @param {Array} array The array to iterate over.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @returns {Array} Returns `array`.
	     */
	    function arrayEach(array, iteratee) {
	      var index = -1,
	          length = array.length;

	      while (++index < length) {
	        if (iteratee(array[index], index, array) === false) {
	          break;
	        }
	      }
	      return array;
	    }

	    /**
	     * Creates a base function for methods like `_.forIn` and `_.forOwn`.
	     *
	     * @private
	     * @param {boolean} [fromRight] Specify iterating from right to left.
	     * @returns {Function} Returns the new base function.
	     */
	    function createBaseFor(fromRight) {
	      return function(object, iteratee, keysFunc) {
	        var index = -1,
	            iterable = Object(object),
	            props = keysFunc(object),
	            length = props.length;

	        while (length--) {
	          var key = props[fromRight ? length : ++index];
	          if (iteratee(iterable[key], key, iterable) === false) {
	            break;
	          }
	        }
	        return object;
	      };
	    }

	    /**
	     * The base implementation of `baseForOwn` which iterates over `object`
	     * properties returned by `keysFunc` invoking `iteratee` for each property.
	     * Iteratee functions may exit iteration early by explicitly returning `false`.
	     *
	     * @private
	     * @param {Object} object The object to iterate over.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @param {Function} keysFunc The function to get the keys of `object`.
	     * @returns {Object} Returns `object`.
	     */
	    var baseFor = createBaseFor();

	    /**
	     * The base implementation of `_.forOwn` without support for iteratee shorthands.
	     *
	     * @private
	     * @param {Object} object The object to iterate over.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @returns {Object} Returns `object`.
	     */
	    function baseForOwn(object, iteratee) {
	      return object && baseFor(object, iteratee, keys);
	    }

	    /**
	     * Removes all key-value entries from the stack.
	     *
	     * @private
	     * @name clear
	     * @memberOf Stack
	     */
	    function stackClear() {
	      this.__data__ = { 'array': [], 'map': null };
	    }

	    /**
	     * Performs a
	     * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
	     * comparison between two values to determine if they are equivalent.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to compare.
	     * @param {*} other The other value to compare.
	     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	     * @example
	     *
	     * var object = { 'user': 'fred' };
	     * var other = { 'user': 'fred' };
	     *
	     * _.eq(object, object);
	     * // => true
	     *
	     * _.eq(object, other);
	     * // => false
	     *
	     * _.eq('a', 'a');
	     * // => true
	     *
	     * _.eq('a', Object('a'));
	     * // => false
	     *
	     * _.eq(NaN, NaN);
	     * // => true
	     */
	    function eq(value, other) {
	      return value === other || (value !== value && other !== other);
	    }

	    /**
	     * Gets the index at which the `key` is found in `array` of key-value pairs.
	     *
	     * @private
	     * @param {Array} array The array to search.
	     * @param {*} key The key to search for.
	     * @returns {number} Returns the index of the matched value, else `-1`.
	     */
	    function assocIndexOf(array, key) {
	      var length = array.length;
	      while (length--) {
	        if (eq(array[length][0], key)) {
	          return length;
	        }
	      }
	      return -1;
	    }

	    /** Used for built-in method references. */
	    var arrayProto = Array.prototype;

	    /** Built-in value references. */
	    var splice = arrayProto.splice;

	    /**
	     * Removes `key` and its value from the associative array.
	     *
	     * @private
	     * @param {Array} array The array to modify.
	     * @param {string} key The key of the value to remove.
	     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	     */
	    function assocDelete(array, key) {
	      var index = assocIndexOf(array, key);
	      if (index < 0) {
	        return false;
	      }
	      var lastIndex = array.length - 1;
	      if (index == lastIndex) {
	        array.pop();
	      } else {
	        splice.call(array, index, 1);
	      }
	      return true;
	    }

	    /**
	     * Removes `key` and its value from the stack.
	     *
	     * @private
	     * @name delete
	     * @memberOf Stack
	     * @param {string} key The key of the value to remove.
	     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	     */
	    function stackDelete(key) {
	      var data = this.__data__,
	          array = data.array;

	      return array ? assocDelete(array, key) : data.map['delete'](key);
	    }

	    /**
	     * Gets the associative array value for `key`.
	     *
	     * @private
	     * @param {Array} array The array to query.
	     * @param {string} key The key of the value to get.
	     * @returns {*} Returns the entry value.
	     */
	    function assocGet(array, key) {
	      var index = assocIndexOf(array, key);
	      return index < 0 ? undefined : array[index][1];
	    }

	    /**
	     * Gets the stack value for `key`.
	     *
	     * @private
	     * @name get
	     * @memberOf Stack
	     * @param {string} key The key of the value to get.
	     * @returns {*} Returns the entry value.
	     */
	    function stackGet(key) {
	      var data = this.__data__,
	          array = data.array;

	      return array ? assocGet(array, key) : data.map.get(key);
	    }

	    /**
	     * Checks if an associative array value for `key` exists.
	     *
	     * @private
	     * @param {Array} array The array to query.
	     * @param {string} key The key of the entry to check.
	     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	     */
	    function assocHas(array, key) {
	      return assocIndexOf(array, key) > -1;
	    }

	    /**
	     * Checks if a stack value for `key` exists.
	     *
	     * @private
	     * @name has
	     * @memberOf Stack
	     * @param {string} key The key of the entry to check.
	     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	     */
	    function stackHas(key) {
	      var data = this.__data__,
	          array = data.array;

	      return array ? assocHas(array, key) : data.map.has(key);
	    }

	    /**
	     * Checks if `value` is a host object in IE < 9.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	     */
	    function isHostObject(value) {
	      // Many host objects are `Object` objects that can coerce to strings
	      // despite having improperly defined `toString` methods.
	      var result = false;
	      if (value != null && typeof value.toString != 'function') {
	        try {
	          result = !!(value + '');
	        } catch (e) {}
	      }
	      return result;
	    }

	    /** Used to match `RegExp` [syntax characters](http://ecma-international.org/ecma-262/6.0/#sec-patterns). */
	    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

	    /** Used to detect host constructors (Safari). */
	    var reIsHostCtor = /^\[object .+?Constructor\]$/;

	    /** Used for built-in method references. */
	    var objectProto$7 = Object.prototype;

	    /** Used to resolve the decompiled source of functions. */
	    var funcToString = Function.prototype.toString;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty$2 = objectProto$7.hasOwnProperty;

	    /** Used to detect if a method is native. */
	    var reIsNative = RegExp('^' +
	      funcToString.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
	      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
	    );

	    /**
	     * Checks if `value` is a native function.
	     *
	     * @static
	     * @memberOf _
	     * @since 3.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is a native function,
	     *  else `false`.
	     * @example
	     *
	     * _.isNative(Array.prototype.push);
	     * // => true
	     *
	     * _.isNative(_);
	     * // => false
	     */
	    function isNative(value) {
	      if (value == null) {
	        return false;
	      }
	      if (isFunction(value)) {
	        return reIsNative.test(funcToString.call(value));
	      }
	      return isObjectLike(value) &&
	        (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
	    }

	    /**
	     * Gets the native function at `key` of `object`.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {string} key The key of the method to get.
	     * @returns {*} Returns the function if it's native, else `undefined`.
	     */
	    function getNative(object, key) {
	      var value = object[key];
	      return isNative(value) ? value : undefined;
	    }

	    /* Built-in method references that are verified to be native. */
	    var nativeCreate = getNative(Object, 'create');

	    /** Used for built-in method references. */
	    var objectProto$6 = Object.prototype;

	    /**
	     * Creates an hash object.
	     *
	     * @private
	     * @constructor
	     * @returns {Object} Returns the new hash object.
	     */
	    function Hash() {}

	    // Avoid inheriting from `Object.prototype` when possible.
	    Hash.prototype = nativeCreate ? nativeCreate(null) : objectProto$6;

	    /**
	     * Checks if `value` is a global object.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @returns {null|Object} Returns `value` if it's a global object, else `null`.
	     */
	    function checkGlobal(value) {
	      return (value && value.Object === Object) ? value : null;
	    }

	    /** Used to determine if values are of the language type `Object`. */
	    var objectTypes = {
	      'function': true,
	      'object': true
	    };

	    /** Detect free variable `exports`. */
	    var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
	      ? exports
	      : undefined;

	    /** Detect free variable `module`. */
	    var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
	      ? module
	      : undefined;

	    /** Detect free variable `global` from Node.js. */
	    var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

	    /** Detect free variable `self`. */
	    var freeSelf = checkGlobal(objectTypes[typeof self] && self);

	    /** Detect free variable `window`. */
	    var freeWindow = checkGlobal(objectTypes[typeof window] && window);

	    /** Detect `this` as the global object. */
	    var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

	    /**
	     * Used as a reference to the global object.
	     *
	     * The `this` value is used if it's the global object to avoid Greasemonkey's
	     * restricted `window` object, otherwise the `window` object is used.
	     */
	    var root = freeGlobal ||
	      ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
	        freeSelf || thisGlobal || Function('return this')();

	    /* Built-in method references that are verified to be native. */
	    var Map = getNative(root, 'Map');

	    /**
	     * Removes all key-value entries from the map.
	     *
	     * @private
	     * @name clear
	     * @memberOf MapCache
	     */
	    function mapClear() {
	      this.__data__ = {
	        'hash': new Hash,
	        'map': Map ? new Map : [],
	        'string': new Hash
	      };
	    }

	    /** Used for built-in method references. */
	    var objectProto$8 = Object.prototype;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty$3 = objectProto$8.hasOwnProperty;

	    /**
	     * Checks if a hash value for `key` exists.
	     *
	     * @private
	     * @param {Object} hash The hash to query.
	     * @param {string} key The key of the entry to check.
	     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	     */
	    function hashHas(hash, key) {
	      return nativeCreate ? hash[key] !== undefined : hasOwnProperty$3.call(hash, key);
	    }

	    /**
	     * Removes `key` and its value from the hash.
	     *
	     * @private
	     * @param {Object} hash The hash to modify.
	     * @param {string} key The key of the value to remove.
	     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	     */
	    function hashDelete(hash, key) {
	      return hashHas(hash, key) && delete hash[key];
	    }

	    /**
	     * Checks if `value` is suitable for use as unique object key.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	     */
	    function isKeyable(value) {
	      var type = typeof value;
	      return type == 'number' || type == 'boolean' ||
	        (type == 'string' && value != '__proto__') || value == null;
	    }

	    /**
	     * Removes `key` and its value from the map.
	     *
	     * @private
	     * @name delete
	     * @memberOf MapCache
	     * @param {string} key The key of the value to remove.
	     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	     */
	    function mapDelete(key) {
	      var data = this.__data__;
	      if (isKeyable(key)) {
	        return hashDelete(typeof key == 'string' ? data.string : data.hash, key);
	      }
	      return Map ? data.map['delete'](key) : assocDelete(data.map, key);
	    }

	    /** Used to stand-in for `undefined` hash values. */
	    var HASH_UNDEFINED = '__lodash_hash_undefined__';

	    /** Used for built-in method references. */
	    var objectProto$9 = Object.prototype;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty$4 = objectProto$9.hasOwnProperty;

	    /**
	     * Gets the hash value for `key`.
	     *
	     * @private
	     * @param {Object} hash The hash to query.
	     * @param {string} key The key of the value to get.
	     * @returns {*} Returns the entry value.
	     */
	    function hashGet(hash, key) {
	      if (nativeCreate) {
	        var result = hash[key];
	        return result === HASH_UNDEFINED ? undefined : result;
	      }
	      return hasOwnProperty$4.call(hash, key) ? hash[key] : undefined;
	    }

	    /**
	     * Gets the map value for `key`.
	     *
	     * @private
	     * @name get
	     * @memberOf MapCache
	     * @param {string} key The key of the value to get.
	     * @returns {*} Returns the entry value.
	     */
	    function mapGet(key) {
	      var data = this.__data__;
	      if (isKeyable(key)) {
	        return hashGet(typeof key == 'string' ? data.string : data.hash, key);
	      }
	      return Map ? data.map.get(key) : assocGet(data.map, key);
	    }

	    /**
	     * Checks if a map value for `key` exists.
	     *
	     * @private
	     * @name has
	     * @memberOf MapCache
	     * @param {string} key The key of the entry to check.
	     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	     */
	    function mapHas(key) {
	      var data = this.__data__;
	      if (isKeyable(key)) {
	        return hashHas(typeof key == 'string' ? data.string : data.hash, key);
	      }
	      return Map ? data.map.has(key) : assocHas(data.map, key);
	    }

	    /**
	     * Sets the associative array `key` to `value`.
	     *
	     * @private
	     * @param {Array} array The array to modify.
	     * @param {string} key The key of the value to set.
	     * @param {*} value The value to set.
	     */
	    function assocSet(array, key, value) {
	      var index = assocIndexOf(array, key);
	      if (index < 0) {
	        array.push([key, value]);
	      } else {
	        array[index][1] = value;
	      }
	    }

	    /** Used to stand-in for `undefined` hash values. */
	    var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

	    /**
	     * Sets the hash `key` to `value`.
	     *
	     * @private
	     * @param {Object} hash The hash to modify.
	     * @param {string} key The key of the value to set.
	     * @param {*} value The value to set.
	     */
	    function hashSet(hash, key, value) {
	      hash[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
	    }

	    /**
	     * Sets the map `key` to `value`.
	     *
	     * @private
	     * @name set
	     * @memberOf MapCache
	     * @param {string} key The key of the value to set.
	     * @param {*} value The value to set.
	     * @returns {Object} Returns the map cache instance.
	     */
	    function mapSet(key, value) {
	      var data = this.__data__;
	      if (isKeyable(key)) {
	        hashSet(typeof key == 'string' ? data.string : data.hash, key, value);
	      } else if (Map) {
	        data.map.set(key, value);
	      } else {
	        assocSet(data.map, key, value);
	      }
	      return this;
	    }

	    /**
	     * Creates a map cache object to store key-value pairs.
	     *
	     * @private
	     * @constructor
	     * @param {Array} [values] The values to cache.
	     */
	    function MapCache(values) {
	      var index = -1,
	          length = values ? values.length : 0;

	      this.clear();
	      while (++index < length) {
	        var entry = values[index];
	        this.set(entry[0], entry[1]);
	      }
	    }

	    // Add methods to `MapCache`.
	    MapCache.prototype.clear = mapClear;
	    MapCache.prototype['delete'] = mapDelete;
	    MapCache.prototype.get = mapGet;
	    MapCache.prototype.has = mapHas;
	    MapCache.prototype.set = mapSet;

	    /** Used as the size to enable large array optimizations. */
	    var LARGE_ARRAY_SIZE = 200;

	    /**
	     * Sets the stack `key` to `value`.
	     *
	     * @private
	     * @name set
	     * @memberOf Stack
	     * @param {string} key The key of the value to set.
	     * @param {*} value The value to set.
	     * @returns {Object} Returns the stack cache instance.
	     */
	    function stackSet(key, value) {
	      var data = this.__data__,
	          array = data.array;

	      if (array) {
	        if (array.length < (LARGE_ARRAY_SIZE - 1)) {
	          assocSet(array, key, value);
	        } else {
	          data.array = null;
	          data.map = new MapCache(array);
	        }
	      }
	      var map = data.map;
	      if (map) {
	        map.set(key, value);
	      }
	      return this;
	    }

	    /**
	     * Creates a stack cache object to store key-value pairs.
	     *
	     * @private
	     * @constructor
	     * @param {Array} [values] The values to cache.
	     */
	    function Stack(values) {
	      var index = -1,
	          length = values ? values.length : 0;

	      this.clear();
	      while (++index < length) {
	        var entry = values[index];
	        this.set(entry[0], entry[1]);
	      }
	    }

	    // Add methods to `Stack`.
	    Stack.prototype.clear = stackClear;
	    Stack.prototype['delete'] = stackDelete;
	    Stack.prototype.get = stackGet;
	    Stack.prototype.has = stackHas;
	    Stack.prototype.set = stackSet;

	    /**
	     * A specialized version of `_.some` for arrays without support for iteratee
	     * shorthands.
	     *
	     * @private
	     * @param {Array} array The array to iterate over.
	     * @param {Function} predicate The function invoked per iteration.
	     * @returns {boolean} Returns `true` if any element passes the predicate check,
	     *  else `false`.
	     */
	    function arraySome(array, predicate) {
	      var index = -1,
	          length = array.length;

	      while (++index < length) {
	        if (predicate(array[index], index, array)) {
	          return true;
	        }
	      }
	      return false;
	    }

	    var UNORDERED_COMPARE_FLAG$1 = 1;
	    var PARTIAL_COMPARE_FLAG$2 = 2;
	    /**
	     * A specialized version of `baseIsEqualDeep` for arrays with support for
	     * partial deep comparisons.
	     *
	     * @private
	     * @param {Array} array The array to compare.
	     * @param {Array} other The other array to compare.
	     * @param {Function} equalFunc The function to determine equivalents of values.
	     * @param {Function} customizer The function to customize comparisons.
	     * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
	     *  for more details.
	     * @param {Object} stack Tracks traversed `array` and `other` objects.
	     * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
	     */
	    function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
	      var index = -1,
	          isPartial = bitmask & PARTIAL_COMPARE_FLAG$2,
	          isUnordered = bitmask & UNORDERED_COMPARE_FLAG$1,
	          arrLength = array.length,
	          othLength = other.length;

	      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
	        return false;
	      }
	      // Assume cyclic values are equal.
	      var stacked = stack.get(array);
	      if (stacked) {
	        return stacked == other;
	      }
	      var result = true;
	      stack.set(array, other);

	      // Ignore non-index properties.
	      while (++index < arrLength) {
	        var arrValue = array[index],
	            othValue = other[index];

	        if (customizer) {
	          var compared = isPartial
	            ? customizer(othValue, arrValue, index, other, array, stack)
	            : customizer(arrValue, othValue, index, array, other, stack);
	        }
	        if (compared !== undefined) {
	          if (compared) {
	            continue;
	          }
	          result = false;
	          break;
	        }
	        // Recursively compare arrays (susceptible to call stack limits).
	        if (isUnordered) {
	          if (!arraySome(other, function(othValue) {
	                return arrValue === othValue ||
	                  equalFunc(arrValue, othValue, customizer, bitmask, stack);
	              })) {
	            result = false;
	            break;
	          }
	        } else if (!(
	              arrValue === othValue ||
	                equalFunc(arrValue, othValue, customizer, bitmask, stack)
	            )) {
	          result = false;
	          break;
	        }
	      }
	      stack['delete'](array);
	      return result;
	    }

	    /** Built-in value references. */
	    var Symbol$1 = root.Symbol;

	    /** Built-in value references. */
	    var Uint8Array = root.Uint8Array;

	    /**
	     * Converts `map` to an array.
	     *
	     * @private
	     * @param {Object} map The map to convert.
	     * @returns {Array} Returns the converted array.
	     */
	    function mapToArray(map) {
	      var index = -1,
	          result = Array(map.size);

	      map.forEach(function(value, key) {
	        result[++index] = [key, value];
	      });
	      return result;
	    }

	    /**
	     * Converts `set` to an array.
	     *
	     * @private
	     * @param {Object} set The set to convert.
	     * @returns {Array} Returns the converted array.
	     */
	    function setToArray(set) {
	      var index = -1,
	          result = Array(set.size);

	      set.forEach(function(value) {
	        result[++index] = value;
	      });
	      return result;
	    }

	    var UNORDERED_COMPARE_FLAG$2 = 1;
	    var PARTIAL_COMPARE_FLAG$3 = 2;
	    var boolTag = '[object Boolean]';
	    var dateTag = '[object Date]';
	    var errorTag = '[object Error]';
	    var mapTag = '[object Map]';
	    var numberTag = '[object Number]';
	    var regexpTag = '[object RegExp]';
	    var setTag = '[object Set]';
	    var stringTag$1 = '[object String]';
	    var symbolTag$1 = '[object Symbol]';
	    var arrayBufferTag = '[object ArrayBuffer]';
	    var dataViewTag = '[object DataView]';
	    var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined;
	    var symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;
	    /**
	     * A specialized version of `baseIsEqualDeep` for comparing objects of
	     * the same `toStringTag`.
	     *
	     * **Note:** This function only supports comparing values with tags of
	     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
	     *
	     * @private
	     * @param {Object} object The object to compare.
	     * @param {Object} other The other object to compare.
	     * @param {string} tag The `toStringTag` of the objects to compare.
	     * @param {Function} equalFunc The function to determine equivalents of values.
	     * @param {Function} customizer The function to customize comparisons.
	     * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
	     *  for more details.
	     * @param {Object} stack Tracks traversed `object` and `other` objects.
	     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
	     */
	    function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
	      switch (tag) {
	        case dataViewTag:
	          if ((object.byteLength != other.byteLength) ||
	              (object.byteOffset != other.byteOffset)) {
	            return false;
	          }
	          object = object.buffer;
	          other = other.buffer;

	        case arrayBufferTag:
	          if ((object.byteLength != other.byteLength) ||
	              !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
	            return false;
	          }
	          return true;

	        case boolTag:
	        case dateTag:
	          // Coerce dates and booleans to numbers, dates to milliseconds and
	          // booleans to `1` or `0` treating invalid dates coerced to `NaN` as
	          // not equal.
	          return +object == +other;

	        case errorTag:
	          return object.name == other.name && object.message == other.message;

	        case numberTag:
	          // Treat `NaN` vs. `NaN` as equal.
	          return (object != +object) ? other != +other : object == +other;

	        case regexpTag:
	        case stringTag$1:
	          // Coerce regexes to strings and treat strings, primitives and objects,
	          // as equal. See https://es5.github.io/#x15.10.6.4 for more details.
	          return object == (other + '');

	        case mapTag:
	          var convert = mapToArray;

	        case setTag:
	          var isPartial = bitmask & PARTIAL_COMPARE_FLAG$3;
	          convert || (convert = setToArray);

	          if (object.size != other.size && !isPartial) {
	            return false;
	          }
	          // Assume cyclic values are equal.
	          var stacked = stack.get(object);
	          if (stacked) {
	            return stacked == other;
	          }
	          bitmask |= UNORDERED_COMPARE_FLAG$2;
	          stack.set(object, other);

	          // Recursively compare objects (susceptible to call stack limits).
	          return equalArrays(convert(object), convert(other), equalFunc, customizer, bitmask, stack);

	        case symbolTag$1:
	          if (symbolValueOf) {
	            return symbolValueOf.call(object) == symbolValueOf.call(other);
	          }
	      }
	      return false;
	    }

	    /** Used to compose bitmasks for comparison styles. */
	    var PARTIAL_COMPARE_FLAG$4 = 2;

	    /**
	     * A specialized version of `baseIsEqualDeep` for objects with support for
	     * partial deep comparisons.
	     *
	     * @private
	     * @param {Object} object The object to compare.
	     * @param {Object} other The other object to compare.
	     * @param {Function} equalFunc The function to determine equivalents of values.
	     * @param {Function} customizer The function to customize comparisons.
	     * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
	     *  for more details.
	     * @param {Object} stack Tracks traversed `object` and `other` objects.
	     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
	     */
	    function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
	      var isPartial = bitmask & PARTIAL_COMPARE_FLAG$4,
	          objProps = keys(object),
	          objLength = objProps.length,
	          othProps = keys(other),
	          othLength = othProps.length;

	      if (objLength != othLength && !isPartial) {
	        return false;
	      }
	      var index = objLength;
	      while (index--) {
	        var key = objProps[index];
	        if (!(isPartial ? key in other : baseHas(other, key))) {
	          return false;
	        }
	      }
	      // Assume cyclic values are equal.
	      var stacked = stack.get(object);
	      if (stacked) {
	        return stacked == other;
	      }
	      var result = true;
	      stack.set(object, other);

	      var skipCtor = isPartial;
	      while (++index < objLength) {
	        key = objProps[index];
	        var objValue = object[key],
	            othValue = other[key];

	        if (customizer) {
	          var compared = isPartial
	            ? customizer(othValue, objValue, key, other, object, stack)
	            : customizer(objValue, othValue, key, object, other, stack);
	        }
	        // Recursively compare objects (susceptible to call stack limits).
	        if (!(compared === undefined
	              ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack))
	              : compared
	            )) {
	          result = false;
	          break;
	        }
	        skipCtor || (skipCtor = key == 'constructor');
	      }
	      if (result && !skipCtor) {
	        var objCtor = object.constructor,
	            othCtor = other.constructor;

	        // Non `Object` object instances with different constructors are not equal.
	        if (objCtor != othCtor &&
	            ('constructor' in object && 'constructor' in other) &&
	            !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
	              typeof othCtor == 'function' && othCtor instanceof othCtor)) {
	          result = false;
	        }
	      }
	      stack['delete'](object);
	      return result;
	    }

	    /* Built-in method references that are verified to be native. */
	    var DataView = getNative(root, 'DataView');

	    /* Built-in method references that are verified to be native. */
	    var Promise = getNative(root, 'Promise');

	    /* Built-in method references that are verified to be native. */
	    var Set = getNative(root, 'Set');

	    /* Built-in method references that are verified to be native. */
	    var WeakMap = getNative(root, 'WeakMap');

	    var mapTag$1 = '[object Map]';
	    var objectTag$1 = '[object Object]';
	    var promiseTag = '[object Promise]';
	    var setTag$1 = '[object Set]';
	    var weakMapTag = '[object WeakMap]';
	    var dataViewTag$1 = '[object DataView]';

	    /** Used for built-in method references. */
	    var objectProto$11 = Object.prototype;

	    /** Used to resolve the decompiled source of functions. */
	    var funcToString$1 = Function.prototype.toString;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString$4 = objectProto$11.toString;

	    /** Used to detect maps, sets, and weakmaps. */
	    var dataViewCtorString = DataView ? (DataView + '') : '';
	    var mapCtorString = Map ? funcToString$1.call(Map) : '';
	    var promiseCtorString = Promise ? funcToString$1.call(Promise) : '';
	    var setCtorString = Set ? funcToString$1.call(Set) : '';
	    var weakMapCtorString = WeakMap ? funcToString$1.call(WeakMap) : '';
	    /**
	     * Gets the `toStringTag` of `value`.
	     *
	     * @private
	     * @param {*} value The value to query.
	     * @returns {string} Returns the `toStringTag`.
	     */
	    function getTag(value) {
	      return objectToString$4.call(value);
	    }

	    // Fallback for data views, maps, sets, and weak maps in IE 11,
	    // for data views in Edge, and promises in Node.js.
	    if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag$1) ||
	        (Map && getTag(new Map) != mapTag$1) ||
	        (Promise && getTag(Promise.resolve()) != promiseTag) ||
	        (Set && getTag(new Set) != setTag$1) ||
	        (WeakMap && getTag(new WeakMap) != weakMapTag)) {
	      getTag = function(value) {
	        var result = objectToString$4.call(value),
	            Ctor = result == objectTag$1 ? value.constructor : null,
	            ctorString = typeof Ctor == 'function' ? funcToString$1.call(Ctor) : '';

	        if (ctorString) {
	          switch (ctorString) {
	            case dataViewCtorString: return dataViewTag$1;
	            case mapCtorString: return mapTag$1;
	            case promiseCtorString: return promiseTag;
	            case setCtorString: return setTag$1;
	            case weakMapCtorString: return weakMapTag;
	          }
	        }
	        return result;
	      };
	    }

	    var getTag$1 = getTag;

	    var argsTag$2 = '[object Arguments]';
	    var arrayTag$1 = '[object Array]';
	    var boolTag$1 = '[object Boolean]';
	    var dateTag$1 = '[object Date]';
	    var errorTag$1 = '[object Error]';
	    var funcTag$1 = '[object Function]';
	    var mapTag$2 = '[object Map]';
	    var numberTag$1 = '[object Number]';
	    var objectTag$2 = '[object Object]';
	    var regexpTag$1 = '[object RegExp]';
	    var setTag$2 = '[object Set]';
	    var stringTag$2 = '[object String]';
	    var weakMapTag$1 = '[object WeakMap]';
	    var arrayBufferTag$1 = '[object ArrayBuffer]';
	    var dataViewTag$2 = '[object DataView]';
	    var float32Tag = '[object Float32Array]';
	    var float64Tag = '[object Float64Array]';
	    var int8Tag = '[object Int8Array]';
	    var int16Tag = '[object Int16Array]';
	    var int32Tag = '[object Int32Array]';
	    var uint8Tag = '[object Uint8Array]';
	    var uint8ClampedTag = '[object Uint8ClampedArray]';
	    var uint16Tag = '[object Uint16Array]';
	    var uint32Tag = '[object Uint32Array]';
	    /** Used to identify `toStringTag` values of typed arrays. */
	    var typedArrayTags = {};
	    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
	    typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
	    typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
	    typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
	    typedArrayTags[uint32Tag] = true;
	    typedArrayTags[argsTag$2] = typedArrayTags[arrayTag$1] =
	    typedArrayTags[arrayBufferTag$1] = typedArrayTags[boolTag$1] =
	    typedArrayTags[dataViewTag$2] = typedArrayTags[dateTag$1] =
	    typedArrayTags[errorTag$1] = typedArrayTags[funcTag$1] =
	    typedArrayTags[mapTag$2] = typedArrayTags[numberTag$1] =
	    typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$1] =
	    typedArrayTags[setTag$2] = typedArrayTags[stringTag$2] =
	    typedArrayTags[weakMapTag$1] = false;

	    /** Used for built-in method references. */
	    var objectProto$12 = Object.prototype;

	    /**
	     * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
	     * of values.
	     */
	    var objectToString$5 = objectProto$12.toString;

	    /**
	     * Checks if `value` is classified as a typed array.
	     *
	     * @static
	     * @memberOf _
	     * @since 3.0.0
	     * @category Lang
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` is correctly classified,
	     *  else `false`.
	     * @example
	     *
	     * _.isTypedArray(new Uint8Array);
	     * // => true
	     *
	     * _.isTypedArray([]);
	     * // => false
	     */
	    function isTypedArray(value) {
	      return isObjectLike(value) &&
	        isLength(value.length) && !!typedArrayTags[objectToString$5.call(value)];
	    }

	    /** Used to compose bitmasks for comparison styles. */
	    var PARTIAL_COMPARE_FLAG$1 = 2;

	    /** `Object#toString` result references. */
	    var argsTag$1 = '[object Arguments]';
	    var arrayTag = '[object Array]';
	    var objectTag = '[object Object]';
	    /** Used for built-in method references. */
	    var objectProto$10 = Object.prototype;

	    /** Used to check objects for own properties. */
	    var hasOwnProperty$5 = objectProto$10.hasOwnProperty;

	    /**
	     * A specialized version of `baseIsEqual` for arrays and objects which performs
	     * deep comparisons and tracks traversed objects enabling objects with circular
	     * references to be compared.
	     *
	     * @private
	     * @param {Object} object The object to compare.
	     * @param {Object} other The other object to compare.
	     * @param {Function} equalFunc The function to determine equivalents of values.
	     * @param {Function} [customizer] The function to customize comparisons.
	     * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual`
	     *  for more details.
	     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
	     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
	     */
	    function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
	      var objIsArr = isArray(object),
	          othIsArr = isArray(other),
	          objTag = arrayTag,
	          othTag = arrayTag;

	      if (!objIsArr) {
	        objTag = getTag$1(object);
	        objTag = objTag == argsTag$1 ? objectTag : objTag;
	      }
	      if (!othIsArr) {
	        othTag = getTag$1(other);
	        othTag = othTag == argsTag$1 ? objectTag : othTag;
	      }
	      var objIsObj = objTag == objectTag && !isHostObject(object),
	          othIsObj = othTag == objectTag && !isHostObject(other),
	          isSameTag = objTag == othTag;

	      if (isSameTag && !objIsObj) {
	        stack || (stack = new Stack);
	        return (objIsArr || isTypedArray(object))
	          ? equalArrays(object, other, equalFunc, customizer, bitmask, stack)
	          : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
	      }
	      if (!(bitmask & PARTIAL_COMPARE_FLAG$1)) {
	        var objIsWrapped = objIsObj && hasOwnProperty$5.call(object, '__wrapped__'),
	            othIsWrapped = othIsObj && hasOwnProperty$5.call(other, '__wrapped__');

	        if (objIsWrapped || othIsWrapped) {
	          var objUnwrapped = objIsWrapped ? object.value() : object,
	              othUnwrapped = othIsWrapped ? other.value() : other;

	          stack || (stack = new Stack);
	          return equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
	        }
	      }
	      if (!isSameTag) {
	        return false;
	      }
	      stack || (stack = new Stack);
	      return equalObjects(object, other, equalFunc, customizer, bitmask, stack);
	    }

	    /**
	     * The base implementation of `_.isEqual` which supports partial comparisons
	     * and tracks traversed objects.
	     *
	     * @private
	     * @param {*} value The value to compare.
	     * @param {*} other The other value to compare.
	     * @param {Function} [customizer] The function to customize comparisons.
	     * @param {boolean} [bitmask] The bitmask of comparison flags.
	     *  The bitmask may be composed of the following flags:
	     *     1 - Unordered comparison
	     *     2 - Partial comparison
	     * @param {Object} [stack] Tracks traversed `value` and `other` objects.
	     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	     */
	    function baseIsEqual(value, other, customizer, bitmask, stack) {
	      if (value === other) {
	        return true;
	      }
	      if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
	        return value !== value && other !== other;
	      }
	      return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
	    }

	    var UNORDERED_COMPARE_FLAG = 1;
	    var PARTIAL_COMPARE_FLAG = 2;
	    /**
	     * The base implementation of `_.isMatch` without support for iteratee shorthands.
	     *
	     * @private
	     * @param {Object} object The object to inspect.
	     * @param {Object} source The object of property values to match.
	     * @param {Array} matchData The property names, values, and compare flags to match.
	     * @param {Function} [customizer] The function to customize comparisons.
	     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
	     */
	    function baseIsMatch(object, source, matchData, customizer) {
	      var index = matchData.length,
	          length = index,
	          noCustomizer = !customizer;

	      if (object == null) {
	        return !length;
	      }
	      object = Object(object);
	      while (index--) {
	        var data = matchData[index];
	        if ((noCustomizer && data[2])
	              ? data[1] !== object[data[0]]
	              : !(data[0] in object)
	            ) {
	          return false;
	        }
	      }
	      while (++index < length) {
	        data = matchData[index];
	        var key = data[0],
	            objValue = object[key],
	            srcValue = data[1];

	        if (noCustomizer && data[2]) {
	          if (objValue === undefined && !(key in object)) {
	            return false;
	          }
	        } else {
	          var stack = new Stack;
	          if (customizer) {
	            var result = customizer(objValue, srcValue, key, object, source, stack);
	          }
	          if (!(result === undefined
	                ? baseIsEqual(srcValue, objValue, customizer, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG, stack)
	                : result
	              )) {
	            return false;
	          }
	        }
	      }
	      return true;
	    }

	    /**
	     * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @returns {boolean} Returns `true` if `value` if suitable for strict
	     *  equality comparisons, else `false`.
	     */
	    function isStrictComparable(value) {
	      return value === value && !isObject(value);
	    }

	    /**
	     * A specialized version of `_.map` for arrays without support for iteratee
	     * shorthands.
	     *
	     * @private
	     * @param {Array} array The array to iterate over.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @returns {Array} Returns the new mapped array.
	     */
	    function arrayMap(array, iteratee) {
	      var index = -1,
	          length = array.length,
	          result = Array(length);

	      while (++index < length) {
	        result[index] = iteratee(array[index], index, array);
	      }
	      return result;
	    }

	    /**
	     * The base implementation of `_.toPairs` and `_.toPairsIn` which creates an array
	     * of key-value pairs for `object` corresponding to the property names of `props`.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {Array} props The property names to get values for.
	     * @returns {Object} Returns the new array of key-value pairs.
	     */
	    function baseToPairs(object, props) {
	      return arrayMap(props, function(key) {
	        return [key, object[key]];
	      });
	    }

	    /**
	     * Creates an array of own enumerable string keyed-value pairs for `object`
	     * which can be consumed by `_.fromPairs`.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @alias entries
	     * @category Object
	     * @param {Object} object The object to query.
	     * @returns {Array} Returns the new array of key-value pairs.
	     * @example
	     *
	     * function Foo() {
	     *   this.a = 1;
	     *   this.b = 2;
	     * }
	     *
	     * Foo.prototype.c = 3;
	     *
	     * _.toPairs(new Foo);
	     * // => [['a', 1], ['b', 2]] (iteration order is not guaranteed)
	     */
	    function toPairs(object) {
	      return baseToPairs(object, keys(object));
	    }

	    /**
	     * Gets the property names, values, and compare flags of `object`.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @returns {Array} Returns the match data of `object`.
	     */
	    function getMatchData(object) {
	      var result = toPairs(object),
	          length = result.length;

	      while (length--) {
	        result[length][2] = isStrictComparable(result[length][1]);
	      }
	      return result;
	    }

	    /**
	     * The base implementation of `_.matches` which doesn't clone `source`.
	     *
	     * @private
	     * @param {Object} source The object of property values to match.
	     * @returns {Function} Returns the new function.
	     */
	    function baseMatches(source) {
	      var matchData = getMatchData(source);
	      if (matchData.length == 1 && matchData[0][2]) {
	        var key = matchData[0][0],
	            value = matchData[0][1];

	        return function(object) {
	          if (object == null) {
	            return false;
	          }
	          return object[key] === value &&
	            (value !== undefined || (key in Object(object)));
	        };
	      }
	      return function(object) {
	        return object === source || baseIsMatch(object, source, matchData);
	      };
	    }

	    /** Used as the `TypeError` message for "Functions" methods. */
	    var FUNC_ERROR_TEXT$1 = 'Expected a function';

	    /**
	     * Creates a function that memoizes the result of `func`. If `resolver` is
	     * provided it determines the cache key for storing the result based on the
	     * arguments provided to the memoized function. By default, the first argument
	     * provided to the memoized function is used as the map cache key. The `func`
	     * is invoked with the `this` binding of the memoized function.
	     *
	     * **Note:** The cache is exposed as the `cache` property on the memoized
	     * function. Its creation may be customized by replacing the `_.memoize.Cache`
	     * constructor with one whose instances implement the
	     * [`Map`](http://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-map-prototype-object)
	     * method interface of `delete`, `get`, `has`, and `set`.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @category Function
	     * @param {Function} func The function to have its output memoized.
	     * @param {Function} [resolver] The function to resolve the cache key.
	     * @returns {Function} Returns the new memoizing function.
	     * @example
	     *
	     * var object = { 'a': 1, 'b': 2 };
	     * var other = { 'c': 3, 'd': 4 };
	     *
	     * var values = _.memoize(_.values);
	     * values(object);
	     * // => [1, 2]
	     *
	     * values(other);
	     * // => [3, 4]
	     *
	     * object.a = 2;
	     * values(object);
	     * // => [1, 2]
	     *
	     * // Modify the result cache.
	     * values.cache.set(object, ['a', 'b']);
	     * values(object);
	     * // => ['a', 'b']
	     *
	     * // Replace `_.memoize.Cache`.
	     * _.memoize.Cache = WeakMap;
	     */
	    function memoize(func, resolver) {
	      if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
	        throw new TypeError(FUNC_ERROR_TEXT$1);
	      }
	      var memoized = function() {
	        var args = arguments,
	            key = resolver ? resolver.apply(this, args) : args[0],
	            cache = memoized.cache;

	        if (cache.has(key)) {
	          return cache.get(key);
	        }
	        var result = func.apply(this, args);
	        memoized.cache = cache.set(key, result);
	        return result;
	      };
	      memoized.cache = new (memoize.Cache || MapCache);
	      return memoized;
	    }

	    // Assign cache to `_.memoize`.
	    memoize.Cache = MapCache;

	    /** Used as references for various `Number` constants. */
	    var INFINITY$1 = 1 / 0;

	    /** Used to convert symbols to primitives and strings. */
	    var symbolProto$1 = Symbol$1 ? Symbol$1.prototype : undefined;
	    var symbolToString = symbolProto$1 ? symbolProto$1.toString : undefined;
	    /**
	     * Converts `value` to a string if it's not one. An empty string is returned
	     * for `null` and `undefined` values. The sign of `-0` is preserved.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Lang
	     * @param {*} value The value to process.
	     * @returns {string} Returns the string.
	     * @example
	     *
	     * _.toString(null);
	     * // => ''
	     *
	     * _.toString(-0);
	     * // => '-0'
	     *
	     * _.toString([1, 2, 3]);
	     * // => '1,2,3'
	     */
	    function toString(value) {
	      // Exit early for strings to avoid a performance hit in some environments.
	      if (typeof value == 'string') {
	        return value;
	      }
	      if (value == null) {
	        return '';
	      }
	      if (isSymbol(value)) {
	        return symbolToString ? symbolToString.call(value) : '';
	      }
	      var result = (value + '');
	      return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
	    }

	    /** Used to match property names within property paths. */
	    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]/g;

	    /** Used to match backslashes in property paths. */
	    var reEscapeChar = /\\(\\)?/g;

	    /**
	     * Converts `string` to a property path array.
	     *
	     * @private
	     * @param {string} string The string to convert.
	     * @returns {Array} Returns the property path array.
	     */
	    var stringToPath = memoize(function(string) {
	      var result = [];
	      toString(string).replace(rePropName, function(match, number, quote, string) {
	        result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
	      });
	      return result;
	    });

	    /**
	     * Casts `value` to a path array if it's not one.
	     *
	     * @private
	     * @param {*} value The value to inspect.
	     * @returns {Array} Returns the cast property path array.
	     */
	    function baseCastPath(value) {
	      return isArray(value) ? value : stringToPath(value);
	    }

	    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
	    var reIsPlainProp = /^\w*$/;
	    /**
	     * Checks if `value` is a property name and not a property path.
	     *
	     * @private
	     * @param {*} value The value to check.
	     * @param {Object} [object] The object to query keys on.
	     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
	     */
	    function isKey(value, object) {
	      var type = typeof value;
	      if (type == 'number' || type == 'symbol') {
	        return true;
	      }
	      return !isArray(value) &&
	        (isSymbol(value) || reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
	          (object != null && value in Object(object)));
	    }

	    /**
	     * The base implementation of `_.get` without support for default values.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {Array|string} path The path of the property to get.
	     * @returns {*} Returns the resolved value.
	     */
	    function baseGet(object, path) {
	      path = isKey(path, object) ? [path] : baseCastPath(path);

	      var index = 0,
	          length = path.length;

	      while (object != null && index < length) {
	        object = object[path[index++]];
	      }
	      return (index && index == length) ? object : undefined;
	    }

	    /**
	     * Gets the value at `path` of `object`. If the resolved value is
	     * `undefined` the `defaultValue` is used in its place.
	     *
	     * @static
	     * @memberOf _
	     * @since 3.7.0
	     * @category Object
	     * @param {Object} object The object to query.
	     * @param {Array|string} path The path of the property to get.
	     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
	     * @returns {*} Returns the resolved value.
	     * @example
	     *
	     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
	     *
	     * _.get(object, 'a[0].b.c');
	     * // => 3
	     *
	     * _.get(object, ['a', '0', 'b', 'c']);
	     * // => 3
	     *
	     * _.get(object, 'a.b.c', 'default');
	     * // => 'default'
	     */
	    function get(object, path, defaultValue) {
	      var result = object == null ? undefined : baseGet(object, path);
	      return result === undefined ? defaultValue : result;
	    }

	    /**
	     * The base implementation of `_.hasIn` without support for deep paths.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {Array|string} key The key to check.
	     * @returns {boolean} Returns `true` if `key` exists, else `false`.
	     */
	    function baseHasIn(object, key) {
	      return key in Object(object);
	    }

	    /**
	     * Checks if `path` exists on `object`.
	     *
	     * @private
	     * @param {Object} object The object to query.
	     * @param {Array|string} path The path to check.
	     * @param {Function} hasFunc The function to check properties.
	     * @returns {boolean} Returns `true` if `path` exists, else `false`.
	     */
	    function hasPath(object, path, hasFunc) {
	      if (object == null) {
	        return false;
	      }
	      var result = hasFunc(object, path);
	      if (!result && !isKey(path)) {
	        path = baseCastPath(path);

	        var index = -1,
	            length = path.length;

	        while (object != null && ++index < length) {
	          var key = path[index];
	          if (!(result = hasFunc(object, key))) {
	            break;
	          }
	          object = object[key];
	        }
	      }
	      var length = object ? object.length : undefined;
	      return result || (
	        !!length && isLength(length) && isIndex(path, length) &&
	        (isArray(object) || isString(object) || isArguments(object))
	      );
	    }

	    /**
	     * Checks if `path` is a direct or inherited property of `object`.
	     *
	     * @static
	     * @memberOf _
	     * @since 4.0.0
	     * @category Object
	     * @param {Object} object The object to query.
	     * @param {Array|string} path The path to check.
	     * @returns {boolean} Returns `true` if `path` exists, else `false`.
	     * @example
	     *
	     * var object = _.create({ 'a': _.create({ 'b': _.create({ 'c': 3 }) }) });
	     *
	     * _.hasIn(object, 'a');
	     * // => true
	     *
	     * _.hasIn(object, 'a.b.c');
	     * // => true
	     *
	     * _.hasIn(object, ['a', 'b', 'c']);
	     * // => true
	     *
	     * _.hasIn(object, 'b');
	     * // => false
	     */
	    function hasIn(object, path) {
	      return hasPath(object, path, baseHasIn);
	    }

	    var UNORDERED_COMPARE_FLAG$3 = 1;
	    var PARTIAL_COMPARE_FLAG$5 = 2;
	    /**
	     * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
	     *
	     * @private
	     * @param {string} path The path of the property to get.
	     * @param {*} srcValue The value to match.
	     * @returns {Function} Returns the new function.
	     */
	    function baseMatchesProperty(path, srcValue) {
	      return function(object) {
	        var objValue = get(object, path);
	        return (objValue === undefined && objValue === srcValue)
	          ? hasIn(object, path)
	          : baseIsEqual(srcValue, objValue, undefined, UNORDERED_COMPARE_FLAG$3 | PARTIAL_COMPARE_FLAG$5);
	      };
	    }

	    /**
	     * This method returns the first argument given to it.
	     *
	     * @static
	     * @since 0.1.0
	     * @memberOf _
	     * @category Util
	     * @param {*} value Any value.
	     * @returns {*} Returns `value`.
	     * @example
	     *
	     * var object = { 'user': 'fred' };
	     *
	     * _.identity(object) === object;
	     * // => true
	     */
	    function identity(value) {
	      return value;
	    }

	    /**
	     * A specialized version of `baseProperty` which supports deep paths.
	     *
	     * @private
	     * @param {Array|string} path The path of the property to get.
	     * @returns {Function} Returns the new function.
	     */
	    function basePropertyDeep(path) {
	      return function(object) {
	        return baseGet(object, path);
	      };
	    }

	    /**
	     * Creates a function that returns the value at `path` of a given object.
	     *
	     * @static
	     * @memberOf _
	     * @since 2.4.0
	     * @category Util
	     * @param {Array|string} path The path of the property to get.
	     * @returns {Function} Returns the new function.
	     * @example
	     *
	     * var objects = [
	     *   { 'a': { 'b': { 'c': 2 } } },
	     *   { 'a': { 'b': { 'c': 1 } } }
	     * ];
	     *
	     * _.map(objects, _.property('a.b.c'));
	     * // => [2, 1]
	     *
	     * _.map(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
	     * // => [1, 2]
	     */
	    function property(path) {
	      return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
	    }

	    /**
	     * The base implementation of `_.iteratee`.
	     *
	     * @private
	     * @param {*} [value=_.identity] The value to convert to an iteratee.
	     * @returns {Function} Returns the iteratee.
	     */
	    function baseIteratee(value) {
	      // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
	      // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
	      if (typeof value == 'function') {
	        return value;
	      }
	      if (value == null) {
	        return identity;
	      }
	      if (typeof value == 'object') {
	        return isArray(value)
	          ? baseMatchesProperty(value[0], value[1])
	          : baseMatches(value);
	      }
	      return property(value);
	    }

	    /**
	     * Iterates over own enumerable string keyed properties of an object invoking
	     * `iteratee` for each property. The iteratee is invoked with three arguments:
	     * (value, key, object). Iteratee functions may exit iteration early by
	     * explicitly returning `false`.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.3.0
	     * @category Object
	     * @param {Object} object The object to iterate over.
	     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
	     * @returns {Object} Returns `object`.
	     * @example
	     *
	     * function Foo() {
	     *   this.a = 1;
	     *   this.b = 2;
	     * }
	     *
	     * Foo.prototype.c = 3;
	     *
	     * _.forOwn(new Foo, function(value, key) {
	     *   console.log(key);
	     * });
	     * // => Logs 'a' then 'b' (iteration order is not guaranteed).
	     */
	    function forOwn(object, iteratee) {
	      return object && baseForOwn(object, baseIteratee(iteratee));
	    }

	    /**
	     * Gets the index at which the first occurrence of `NaN` is found in `array`.
	     *
	     * @private
	     * @param {Array} array The array to search.
	     * @param {number} fromIndex The index to search from.
	     * @param {boolean} [fromRight] Specify iterating from right to left.
	     * @returns {number} Returns the index of the matched `NaN`, else `-1`.
	     */
	    function indexOfNaN(array, fromIndex, fromRight) {
	      var length = array.length,
	          index = fromIndex + (fromRight ? 0 : -1);

	      while ((fromRight ? index-- : ++index < length)) {
	        var other = array[index];
	        if (other !== other) {
	          return index;
	        }
	      }
	      return -1;
	    }

	    /**
	     * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
	     *
	     * @private
	     * @param {Array} array The array to search.
	     * @param {*} value The value to search for.
	     * @param {number} fromIndex The index to search from.
	     * @returns {number} Returns the index of the matched value, else `-1`.
	     */
	    function baseIndexOf(array, value, fromIndex) {
	      if (value !== value) {
	        return indexOfNaN(array, fromIndex);
	      }
	      var index = fromIndex - 1,
	          length = array.length;

	      while (++index < length) {
	        if (array[index] === value) {
	          return index;
	        }
	      }
	      return -1;
	    }

	    function auto (tasks, concurrency, callback) {
	        if (typeof concurrency === 'function') {
	            // concurrency is optional, shift the args.
	            callback = concurrency;
	            concurrency = null;
	        }
	        callback = once(callback || noop);
	        var keys$$ = keys(tasks);
	        var numTasks = keys$$.length;
	        if (!numTasks) {
	            return callback(null);
	        }
	        if (!concurrency) {
	            concurrency = numTasks;
	        }

	        var results = {};
	        var runningTasks = 0;
	        var hasError = false;

	        var listeners = {};

	        var readyTasks = [];

	        forOwn(tasks, function (task, key) {
	            if (!isArray(task)) {
	                // no dependencies
	                enqueueTask(key, [task]);
	                return;
	            }

	            var dependencies = task.slice(0, task.length - 1);
	            var remainingDependencies = dependencies.length;

	            checkForDeadlocks();

	            function checkForDeadlocks() {
	                var len = dependencies.length;
	                var dep;
	                while (len--) {
	                    if (!(dep = tasks[dependencies[len]])) {
	                        throw new Error('async.auto task `' + key + '` has non-existent dependency in ' + dependencies.join(', '));
	                    }
	                    if (isArray(dep) && baseIndexOf(dep, key, 0) >= 0) {
	                        throw new Error('async.auto task `' + key + '`Has cyclic dependencies');
	                    }
	                }
	            }

	            arrayEach(dependencies, function (dependencyName) {
	                addListener(dependencyName, function () {
	                    remainingDependencies--;
	                    if (remainingDependencies === 0) {
	                        enqueueTask(key, task);
	                    }
	                });
	            });
	        });

	        processQueue();

	        function enqueueTask(key, task) {
	            readyTasks.push(function () {
	                runTask(key, task);
	            });
	        }

	        function processQueue() {
	            if (readyTasks.length === 0 && runningTasks === 0) {
	                return callback(null, results);
	            }
	            while (readyTasks.length && runningTasks < concurrency) {
	                var run = readyTasks.shift();
	                run();
	            }
	        }

	        function addListener(taskName, fn) {
	            var taskListeners = listeners[taskName];
	            if (!taskListeners) {
	                taskListeners = listeners[taskName] = [];
	            }

	            taskListeners.push(fn);
	        }

	        function taskComplete(taskName) {
	            var taskListeners = listeners[taskName] || [];
	            arrayEach(taskListeners, function (fn) {
	                fn();
	            });
	            processQueue();
	        }

	        function runTask(key, task) {
	            if (hasError) return;

	            var taskCallback = onlyOnce(rest(function (err, args) {
	                runningTasks--;
	                if (args.length <= 1) {
	                    args = args[0];
	                }
	                if (err) {
	                    var safeResults = {};
	                    forOwn(results, function (val, rkey) {
	                        safeResults[rkey] = val;
	                    });
	                    safeResults[key] = args;
	                    hasError = true;
	                    listeners = [];

	                    callback(err, safeResults);
	                } else {
	                    results[key] = args;
	                    taskComplete(key);
	                }
	            }));

	            runningTasks++;
	            var taskFn = task[task.length - 1];
	            if (task.length > 1) {
	                taskFn(results, taskCallback);
	            } else {
	                taskFn(taskCallback);
	            }
	        }
	    }

	    /**
	     * Copies the values of `source` to `array`.
	     *
	     * @private
	     * @param {Array} source The array to copy values from.
	     * @param {Array} [array=[]] The array to copy values to.
	     * @returns {Array} Returns `array`.
	     */
	    function copyArray(source, array) {
	      var index = -1,
	          length = source.length;

	      array || (array = Array(length));
	      while (++index < length) {
	        array[index] = source[index];
	      }
	      return array;
	    }

	    var argsRegex = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

	    function parseParams(func) {
	        return func.toString().match(argsRegex)[1].split(/\s*\,\s*/);
	    }

	    function autoInject(tasks, callback) {
	        var newTasks = {};

	        forOwn(tasks, function (taskFn, key) {
	            var params;

	            if (isArray(taskFn)) {
	                params = copyArray(taskFn);
	                taskFn = params.pop();

	                newTasks[key] = params.concat(newTask);
	            } else if (taskFn.length === 0) {
	                throw new Error("autoInject task functions require explicit parameters.");
	            } else if (taskFn.length === 1) {
	                // no dependencies, use the function as-is
	                newTasks[key] = taskFn;
	            } else {
	                params = parseParams(taskFn);
	                params.pop();

	                newTasks[key] = params.concat(newTask);
	            }

	            function newTask(results, taskCb) {
	                var newArgs = arrayMap(params, function (name) {
	                    return results[name];
	                });
	                newArgs.push(taskCb);
	                taskFn.apply(null, newArgs);
	            }
	        });

	        auto(newTasks, function (err, results) {
	            var params;
	            if (isArray(callback)) {
	                params = copyArray(callback);
	                callback = params.pop();
	            } else {
	                params = parseParams(callback);
	                params.shift();
	            }

	            params = arrayMap(params, function (name) {
	                return results[name];
	            });

	            params.unshift(err);
	            callback.apply(null, params);
	        });
	    }

	    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

	    var _defer;
	    if (_setImmediate) {
	        _defer = _setImmediate;
	    } else if (typeof process === 'object' && typeof process.nextTick === 'function') {
	        _defer = process.nextTick;
	    } else {
	        _defer = function (fn) {
	            setTimeout(fn, 0);
	        };
	    }

	    var setImmediate$1 = rest(function (fn, args) {
	        _defer(function () {
	            fn.apply(null, args);
	        });
	    });

	    function queue(worker, concurrency, payload) {
	        if (concurrency == null) {
	            concurrency = 1;
	        } else if (concurrency === 0) {
	            throw new Error('Concurrency must not be zero');
	        }
	        function _insert(q, data, pos, callback) {
	            if (callback != null && typeof callback !== 'function') {
	                throw new Error('task callback must be a function');
	            }
	            q.started = true;
	            if (!isArray(data)) {
	                data = [data];
	            }
	            if (data.length === 0 && q.idle()) {
	                // call drain immediately if there are no tasks
	                return setImmediate$1(function () {
	                    q.drain();
	                });
	            }
	            arrayEach(data, function (task) {
	                var item = {
	                    data: task,
	                    callback: callback || noop
	                };

	                if (pos) {
	                    q.tasks.unshift(item);
	                } else {
	                    q.tasks.push(item);
	                }
	            });
	            setImmediate$1(q.process);
	        }
	        function _next(q, tasks) {
	            return function () {
	                workers -= 1;

	                var removed = false;
	                var args = arguments;
	                arrayEach(tasks, function (task) {
	                    arrayEach(workersList, function (worker, index) {
	                        if (worker === task && !removed) {
	                            workersList.splice(index, 1);
	                            removed = true;
	                        }
	                    });

	                    task.callback.apply(task, args);
	                });

	                if (workers <= q.concurrency - q.buffer) {
	                    q.unsaturated();
	                }

	                if (q.tasks.length + workers === 0) {
	                    q.drain();
	                }
	                q.process();
	            };
	        }

	        var workers = 0;
	        var workersList = [];
	        var q = {
	            tasks: [],
	            concurrency: concurrency,
	            payload: payload,
	            saturated: noop,
	            unsaturated: noop,
	            buffer: concurrency / 4,
	            empty: noop,
	            drain: noop,
	            started: false,
	            paused: false,
	            push: function (data, callback) {
	                _insert(q, data, false, callback);
	            },
	            kill: function () {
	                q.drain = noop;
	                q.tasks = [];
	            },
	            unshift: function (data, callback) {
	                _insert(q, data, true, callback);
	            },
	            process: function () {
	                while (!q.paused && workers < q.concurrency && q.tasks.length) {

	                    var tasks = q.payload ? q.tasks.splice(0, q.payload) : q.tasks.splice(0, q.tasks.length);

	                    var data = arrayMap(tasks, baseProperty('data'));

	                    if (q.tasks.length === 0) {
	                        q.empty();
	                    }
	                    workers += 1;
	                    workersList.push(tasks[0]);

	                    if (workers === q.concurrency) {
	                        q.saturated();
	                    }

	                    var cb = onlyOnce(_next(q, tasks));
	                    worker(data, cb);
	                }
	            },
	            length: function () {
	                return q.tasks.length;
	            },
	            running: function () {
	                return workers;
	            },
	            workersList: function () {
	                return workersList;
	            },
	            idle: function () {
	                return q.tasks.length + workers === 0;
	            },
	            pause: function () {
	                q.paused = true;
	            },
	            resume: function () {
	                if (q.paused === false) {
	                    return;
	                }
	                q.paused = false;
	                var resumeCount = Math.min(q.concurrency, q.tasks.length);
	                // Need to call q.process once per concurrent
	                // worker to preserve full concurrency after pause
	                for (var w = 1; w <= resumeCount; w++) {
	                    setImmediate$1(q.process);
	                }
	            }
	        };
	        return q;
	    }

	    function cargo(worker, payload) {
	        return queue(worker, 1, payload);
	    }

	    function eachOfLimit(obj, limit, iteratee, cb) {
	        _eachOfLimit(limit)(obj, iteratee, cb);
	    }

	    var eachOfSeries = doLimit(eachOfLimit, 1);

	    function reduce(arr, memo, iteratee, cb) {
	        eachOfSeries(arr, function (x, i, cb) {
	            iteratee(memo, x, function (err, v) {
	                memo = v;
	                cb(err);
	            });
	        }, function (err) {
	            cb(err, memo);
	        });
	    }

	    function seq() /* functions... */{
	        var fns = arguments;
	        return rest(function (args) {
	            var that = this;

	            var cb = args[args.length - 1];
	            if (typeof cb == 'function') {
	                args.pop();
	            } else {
	                cb = noop;
	            }

	            reduce(fns, args, function (newargs, fn, cb) {
	                fn.apply(that, newargs.concat([rest(function (err, nextargs) {
	                    cb(err, nextargs);
	                })]));
	            }, function (err, results) {
	                cb.apply(that, [err].concat(results));
	            });
	        });
	    }

	    var reverse = Array.prototype.reverse;

	    function compose() /* functions... */{
	        return seq.apply(null, reverse.call(arguments));
	    }

	    function concat$1(eachfn, arr, fn, callback) {
	        var result = [];
	        eachfn(arr, function (x, index, cb) {
	            fn(x, function (err, y) {
	                result = result.concat(y || []);
	                cb(err);
	            });
	        }, function (err) {
	            callback(err, result);
	        });
	    }

	    var eachOf = doLimit(eachOfLimit, Infinity);

	    function doParallel(fn) {
	        return function (obj, iteratee, callback) {
	            return fn(eachOf, obj, iteratee, callback);
	        };
	    }

	    var concat = doParallel(concat$1);

	    function doSeries(fn) {
	        return function (obj, iteratee, callback) {
	            return fn(eachOfSeries, obj, iteratee, callback);
	        };
	    }

	    var concatSeries = doSeries(concat$1);

	    var constant = rest(function (values) {
	        var args = [null].concat(values);
	        return initialParams(function (ignoredArgs, callback) {
	            return callback.apply(this, args);
	        });
	    });

	    function _createTester(eachfn, check, getResult) {
	        return function (arr, limit, iteratee, cb) {
	            function done(err) {
	                if (cb) {
	                    if (err) {
	                        cb(err);
	                    } else {
	                        cb(null, getResult(false));
	                    }
	                }
	            }
	            function wrappedIteratee(x, _, callback) {
	                if (!cb) return callback();
	                iteratee(x, function (err, v) {
	                    if (cb) {
	                        if (err) {
	                            cb(err);
	                            cb = iteratee = false;
	                        } else if (check(v)) {
	                            cb(null, getResult(true, x));
	                            cb = iteratee = false;
	                        }
	                    }
	                    callback();
	                });
	            }
	            if (arguments.length > 3) {
	                cb = cb || noop;
	                eachfn(arr, limit, wrappedIteratee, done);
	            } else {
	                cb = iteratee;
	                cb = cb || noop;
	                iteratee = limit;
	                eachfn(arr, wrappedIteratee, done);
	            }
	        };
	    }

	    function _findGetResult(v, x) {
	        return x;
	    }

	    var detect = _createTester(eachOf, identity, _findGetResult);

	    var detectLimit = _createTester(eachOfLimit, identity, _findGetResult);

	    var detectSeries = _createTester(eachOfSeries, identity, _findGetResult);

	    function consoleFunc(name) {
	        return rest(function (fn, args) {
	            fn.apply(null, args.concat([rest(function (err, args) {
	                if (typeof console === 'object') {
	                    if (err) {
	                        if (console.error) {
	                            console.error(err);
	                        }
	                    } else if (console[name]) {
	                        arrayEach(args, function (x) {
	                            console[name](x);
	                        });
	                    }
	                }
	            })]));
	        });
	    }

	    var dir = consoleFunc('dir');

	    function during(test, iteratee, cb) {
	        cb = cb || noop;

	        var next = rest(function (err, args) {
	            if (err) {
	                cb(err);
	            } else {
	                args.push(check);
	                test.apply(this, args);
	            }
	        });

	        var check = function (err, truth) {
	            if (err) return cb(err);
	            if (!truth) return cb(null);
	            iteratee(next);
	        };

	        test(check);
	    }

	    function doDuring(iteratee, test, cb) {
	        var calls = 0;

	        during(function (next) {
	            if (calls++ < 1) return next(null, true);
	            test.apply(this, arguments);
	        }, iteratee, cb);
	    }

	    function whilst(test, iteratee, cb) {
	        cb = cb || noop;
	        if (!test()) return cb(null);
	        var next = rest(function (err, args) {
	            if (err) return cb(err);
	            if (test.apply(this, args)) return iteratee(next);
	            cb.apply(null, [null].concat(args));
	        });
	        iteratee(next);
	    }

	    function doWhilst(iteratee, test, cb) {
	        var calls = 0;
	        return whilst(function () {
	            return ++calls <= 1 || test.apply(this, arguments);
	        }, iteratee, cb);
	    }

	    function doUntil(iteratee, test, cb) {
	        return doWhilst(iteratee, function () {
	            return !test.apply(this, arguments);
	        }, cb);
	    }

	    function _withoutIndex(iteratee) {
	        return function (value, index, callback) {
	            return iteratee(value, callback);
	        };
	    }

	    function eachLimit(arr, limit, iteratee, cb) {
	        return _eachOfLimit(limit)(arr, _withoutIndex(iteratee), cb);
	    }

	    var each = doLimit(eachLimit, Infinity);

	    var eachSeries = doLimit(eachLimit, 1);

	    function ensureAsync(fn) {
	        return initialParams(function (args, callback) {
	            var sync = true;
	            args.push(function () {
	                var innerArgs = arguments;
	                if (sync) {
	                    setImmediate$1(function () {
	                        callback.apply(null, innerArgs);
	                    });
	                } else {
	                    callback.apply(null, innerArgs);
	                }
	            });
	            fn.apply(this, args);
	            sync = false;
	        });
	    }

	    function notId(v) {
	        return !v;
	    }

	    var everyLimit = _createTester(eachOfLimit, notId, notId);

	    var every = doLimit(everyLimit, Infinity);

	    var everySeries = doLimit(everyLimit, 1);

	    function _filter(eachfn, arr, iteratee, callback) {
	        var results = [];
	        eachfn(arr, function (x, index, callback) {
	            iteratee(x, function (err, v) {
	                if (err) {
	                    callback(err);
	                } else {
	                    if (v) {
	                        results.push({ index: index, value: x });
	                    }
	                    callback();
	                }
	            });
	        }, function (err) {
	            if (err) {
	                callback(err);
	            } else {
	                callback(null, arrayMap(results.sort(function (a, b) {
	                    return a.index - b.index;
	                }), baseProperty('value')));
	            }
	        });
	    }

	    var filterLimit = doParallelLimit(_filter);

	    var filter = doLimit(filterLimit, Infinity);

	    var filterSeries = doLimit(filterLimit, 1);

	    function forever(fn, cb) {
	        var done = onlyOnce(cb || noop);
	        var task = ensureAsync(fn);

	        function next(err) {
	            if (err) return done(err);
	            task(next);
	        }
	        next();
	    }

	    function iterator$1 (tasks) {
	        function makeCallback(index) {
	            function fn() {
	                if (tasks.length) {
	                    tasks[index].apply(null, arguments);
	                }
	                return fn.next();
	            }
	            fn.next = function () {
	                return index < tasks.length - 1 ? makeCallback(index + 1) : null;
	            };
	            return fn;
	        }
	        return makeCallback(0);
	    }

	    var log = consoleFunc('log');

	    function has(obj, key) {
	        return key in obj;
	    }

	    function memoize$1(fn, hasher) {
	        var memo = Object.create(null);
	        var queues = Object.create(null);
	        hasher = hasher || identity;
	        var memoized = initialParams(function memoized(args, callback) {
	            var key = hasher.apply(null, args);
	            if (has(memo, key)) {
	                setImmediate$1(function () {
	                    callback.apply(null, memo[key]);
	                });
	            } else if (has(queues, key)) {
	                queues[key].push(callback);
	            } else {
	                queues[key] = [callback];
	                fn.apply(null, args.concat([rest(function (args) {
	                    memo[key] = args;
	                    var q = queues[key];
	                    delete queues[key];
	                    for (var i = 0, l = q.length; i < l; i++) {
	                        q[i].apply(null, args);
	                    }
	                })]));
	            }
	        });
	        memoized.memo = memo;
	        memoized.unmemoized = fn;
	        return memoized;
	    }

	    function _parallel(eachfn, tasks, callback) {
	        callback = callback || noop;
	        var results = isArrayLike(tasks) ? [] : {};

	        eachfn(tasks, function (task, key, callback) {
	            task(rest(function (err, args) {
	                if (args.length <= 1) {
	                    args = args[0];
	                }
	                results[key] = args;
	                callback(err);
	            }));
	        }, function (err) {
	            callback(err, results);
	        });
	    }

	    function parallelLimit(tasks, limit, cb) {
	        return _parallel(_eachOfLimit(limit), tasks, cb);
	    }

	    var parallel = doLimit(parallelLimit, Infinity);

	    function queue$1 (worker, concurrency) {
	        return queue(function (items, cb) {
	            worker(items[0], cb);
	        }, concurrency, 1);
	    }

	    function priorityQueue (worker, concurrency) {
	        function _compareTasks(a, b) {
	            return a.priority - b.priority;
	        }

	        function _binarySearch(sequence, item, compare) {
	            var beg = -1,
	                end = sequence.length - 1;
	            while (beg < end) {
	                var mid = beg + (end - beg + 1 >>> 1);
	                if (compare(item, sequence[mid]) >= 0) {
	                    beg = mid;
	                } else {
	                    end = mid - 1;
	                }
	            }
	            return beg;
	        }

	        function _insert(q, data, priority, callback) {
	            if (callback != null && typeof callback !== 'function') {
	                throw new Error('task callback must be a function');
	            }
	            q.started = true;
	            if (!isArray(data)) {
	                data = [data];
	            }
	            if (data.length === 0) {
	                // call drain immediately if there are no tasks
	                return setImmediate$1(function () {
	                    q.drain();
	                });
	            }
	            arrayEach(data, function (task) {
	                var item = {
	                    data: task,
	                    priority: priority,
	                    callback: typeof callback === 'function' ? callback : noop
	                };

	                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

	                if (q.tasks.length === q.concurrency) {
	                    q.saturated();
	                }
	                if (q.tasks.length <= q.concurrency - q.buffer) {
	                    q.unsaturated();
	                }
	                setImmediate$1(q.process);
	            });
	        }

	        // Start with a normal queue
	        var q = queue$1(worker, concurrency);

	        // Override push to accept second parameter representing priority
	        q.push = function (data, priority, callback) {
	            _insert(q, data, priority, callback);
	        };

	        // Remove unshift function
	        delete q.unshift;

	        return q;
	    }

	    /**
	     * Creates a `baseEach` or `baseEachRight` function.
	     *
	     * @private
	     * @param {Function} eachFunc The function to iterate over a collection.
	     * @param {boolean} [fromRight] Specify iterating from right to left.
	     * @returns {Function} Returns the new base function.
	     */
	    function createBaseEach(eachFunc, fromRight) {
	      return function(collection, iteratee) {
	        if (collection == null) {
	          return collection;
	        }
	        if (!isArrayLike(collection)) {
	          return eachFunc(collection, iteratee);
	        }
	        var length = collection.length,
	            index = fromRight ? length : -1,
	            iterable = Object(collection);

	        while ((fromRight ? index-- : ++index < length)) {
	          if (iteratee(iterable[index], index, iterable) === false) {
	            break;
	          }
	        }
	        return collection;
	      };
	    }

	    /**
	     * The base implementation of `_.forEach` without support for iteratee shorthands.
	     *
	     * @private
	     * @param {Array|Object} collection The collection to iterate over.
	     * @param {Function} iteratee The function invoked per iteration.
	     * @returns {Array|Object} Returns `collection`.
	     */
	    var baseEach = createBaseEach(baseForOwn);

	    /**
	     * Iterates over elements of `collection` invoking `iteratee` for each element.
	     * The iteratee is invoked with three arguments: (value, index|key, collection).
	     * Iteratee functions may exit iteration early by explicitly returning `false`.
	     *
	     * **Note:** As with other "Collections" methods, objects with a "length"
	     * property are iterated like arrays. To avoid this behavior use `_.forIn`
	     * or `_.forOwn` for object iteration.
	     *
	     * @static
	     * @memberOf _
	     * @since 0.1.0
	     * @alias each
	     * @category Collection
	     * @param {Array|Object} collection The collection to iterate over.
	     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
	     * @returns {Array|Object} Returns `collection`.
	     * @example
	     *
	     * _([1, 2]).forEach(function(value) {
	     *   console.log(value);
	     * });
	     * // => Logs `1` then `2`.
	     *
	     * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
	     *   console.log(key);
	     * });
	     * // => Logs 'a' then 'b' (iteration order is not guaranteed).
	     */
	    function forEach(collection, iteratee) {
	      return (typeof iteratee == 'function' && isArray(collection))
	        ? arrayEach(collection, iteratee)
	        : baseEach(collection, baseIteratee(iteratee));
	    }

	    function race(tasks, cb) {
	        cb = once(cb || noop);
	        if (!isArray(tasks)) return cb(new TypeError('First argument to race must be an array of functions'));
	        if (!tasks.length) return cb();
	        forEach(tasks, function (task) {
	            task(cb);
	        });
	    }

	    var slice = Array.prototype.slice;

	    function reduceRight(arr, memo, iteratee, cb) {
	        var reversed = slice.call(arr).reverse();
	        reduce(reversed, memo, iteratee, cb);
	    }

	    function reflect(fn) {
	        return initialParams(function reflectOn(args, reflectCallback) {
	            args.push(rest(function callback(err, cbArgs) {
	                if (err) {
	                    reflectCallback(null, {
	                        error: err
	                    });
	                } else {
	                    var value = null;
	                    if (cbArgs.length === 1) {
	                        value = cbArgs[0];
	                    } else if (cbArgs.length > 1) {
	                        value = cbArgs;
	                    }
	                    reflectCallback(null, {
	                        value: value
	                    });
	                }
	            }));

	            return fn.apply(this, args);
	        });
	    }

	    function reject$1(eachfn, arr, iteratee, callback) {
	        _filter(eachfn, arr, function (value, cb) {
	            iteratee(value, function (err, v) {
	                if (err) {
	                    cb(err);
	                } else {
	                    cb(null, !v);
	                }
	            });
	        }, callback);
	    }

	    var rejectLimit = doParallelLimit(reject$1);

	    var reject = doLimit(rejectLimit, Infinity);

	    function reflectAll(tasks) {
	        return tasks.map(reflect);
	    }

	    var rejectSeries = doLimit(rejectLimit, 1);

	    function series(tasks, cb) {
	        return _parallel(eachOfSeries, tasks, cb);
	    }

	    function retry(times, task, callback) {
	        var DEFAULT_TIMES = 5;
	        var DEFAULT_INTERVAL = 0;

	        var opts = {
	            times: DEFAULT_TIMES,
	            interval: DEFAULT_INTERVAL
	        };

	        function parseTimes(acc, t) {
	            if (typeof t === 'object') {
	                acc.times = +t.times || DEFAULT_TIMES;
	                acc.interval = +t.interval || DEFAULT_INTERVAL;
	            } else if (typeof t === 'number' || typeof t === 'string') {
	                acc.times = +t || DEFAULT_TIMES;
	            } else {
	                throw new Error("Invalid arguments for async.retry");
	            }
	        }

	        if (arguments.length < 3 && typeof times === 'function') {
	            callback = task || noop;
	            task = times;
	        } else {
	            parseTimes(opts, times);
	            callback = callback || noop;
	        }

	        if (typeof task !== 'function') {
	            throw new Error("Invalid arguments for async.retry");
	        }

	        var attempts = [];
	        while (opts.times) {
	            var isFinalAttempt = !(opts.times -= 1);
	            attempts.push(retryAttempt(isFinalAttempt));
	            if (!isFinalAttempt && opts.interval > 0) {
	                attempts.push(retryInterval(opts.interval));
	            }
	        }

	        series(attempts, function (done, data) {
	            data = data[data.length - 1];
	            callback(data.err, data.result);
	        });

	        function retryAttempt(isFinalAttempt) {
	            return function (seriesCallback) {
	                task(function (err, result) {
	                    seriesCallback(!err || isFinalAttempt, {
	                        err: err,
	                        result: result
	                    });
	                });
	            };
	        }

	        function retryInterval(interval) {
	            return function (seriesCallback) {
	                setTimeout(function () {
	                    seriesCallback(null);
	                }, interval);
	            };
	        }
	    }

	    function retryable (opts, task) {
	        if (!task) {
	            task = opts;
	            opts = null;
	        }
	        return initialParams(function (args, callback) {
	            function taskFn(cb) {
	                task.apply(null, args.concat([cb]));
	            }

	            if (opts) retry(opts, taskFn, callback);else retry(taskFn, callback);
	        });
	    }

	    var someLimit = _createTester(eachOfLimit, Boolean, identity);

	    var some = doLimit(someLimit, Infinity);

	    var someSeries = doLimit(someLimit, 1);

	    function sortBy(arr, iteratee, cb) {
	        map(arr, function (x, cb) {
	            iteratee(x, function (err, criteria) {
	                if (err) return cb(err);
	                cb(null, { value: x, criteria: criteria });
	            });
	        }, function (err, results) {
	            if (err) return cb(err);
	            cb(null, arrayMap(results.sort(comparator), baseProperty('value')));
	        });

	        function comparator(left, right) {
	            var a = left.criteria,
	                b = right.criteria;
	            return a < b ? -1 : a > b ? 1 : 0;
	        }
	    }

	    function timeout(asyncFn, miliseconds, info) {
	        var originalCallback, timer;
	        var timedOut = false;

	        function injectedCallback() {
	            if (!timedOut) {
	                originalCallback.apply(null, arguments);
	                clearTimeout(timer);
	            }
	        }

	        function timeoutCallback() {
	            var name = asyncFn.name || 'anonymous';
	            var error = new Error('Callback function "' + name + '" timed out.');
	            error.code = 'ETIMEDOUT';
	            if (info) {
	                error.info = info;
	            }
	            timedOut = true;
	            originalCallback(error);
	        }

	        return initialParams(function (args, origCallback) {
	            originalCallback = origCallback;
	            // setup timer and call original function
	            timer = setTimeout(timeoutCallback, miliseconds);
	            asyncFn.apply(null, args.concat(injectedCallback));
	        });
	    }

	    /* Built-in method references for those with the same name as other `lodash` methods. */
	    var nativeCeil = Math.ceil;
	    var nativeMax$1 = Math.max;
	    /**
	     * The base implementation of `_.range` and `_.rangeRight` which doesn't
	     * coerce arguments to numbers.
	     *
	     * @private
	     * @param {number} start The start of the range.
	     * @param {number} end The end of the range.
	     * @param {number} step The value to increment or decrement by.
	     * @param {boolean} [fromRight] Specify iterating from right to left.
	     * @returns {Array} Returns the new array of numbers.
	     */
	    function baseRange(start, end, step, fromRight) {
	      var index = -1,
	          length = nativeMax$1(nativeCeil((end - start) / (step || 1)), 0),
	          result = Array(length);

	      while (length--) {
	        result[fromRight ? length : ++index] = start;
	        start += step;
	      }
	      return result;
	    }

	    function timeLimit(count, limit, iteratee, cb) {
	        return mapLimit(baseRange(0, count, 1), limit, iteratee, cb);
	    }

	    var times = doLimit(timeLimit, Infinity);

	    var timesSeries = doLimit(timeLimit, 1);

	    function transform(arr, memo, iteratee, callback) {
	        if (arguments.length === 3) {
	            callback = iteratee;
	            iteratee = memo;
	            memo = isArray(arr) ? [] : {};
	        }

	        eachOf(arr, function (v, k, cb) {
	            iteratee(memo, v, k, cb);
	        }, function (err) {
	            callback(err, memo);
	        });
	    }

	    function unmemoize(fn) {
	        return function () {
	            return (fn.unmemoized || fn).apply(null, arguments);
	        };
	    }

	    function until(test, iteratee, cb) {
	        return whilst(function () {
	            return !test.apply(this, arguments);
	        }, iteratee, cb);
	    }

	    function waterfall (tasks, cb) {
	        cb = once(cb || noop);
	        if (!isArray(tasks)) return cb(new Error('First argument to waterfall must be an array of functions'));
	        if (!tasks.length) return cb();
	        var taskIndex = 0;

	        function nextTask(args) {
	            if (taskIndex === tasks.length) {
	                return cb.apply(null, [null].concat(args));
	            }

	            var taskCallback = onlyOnce(rest(function (err, args) {
	                if (err) {
	                    return cb.apply(null, [err].concat(args));
	                }
	                nextTask(args);
	            }));

	            args.push(taskCallback);

	            var task = tasks[taskIndex++];
	            task.apply(null, args);
	        }

	        nextTask([]);
	    }

	    var index = {
	        applyEach: applyEach,
	        applyEachSeries: applyEachSeries,
	        apply: apply$1,
	        asyncify: asyncify,
	        auto: auto,
	        autoInject: autoInject,
	        cargo: cargo,
	        compose: compose,
	        concat: concat,
	        concatSeries: concatSeries,
	        constant: constant,
	        detect: detect,
	        detectLimit: detectLimit,
	        detectSeries: detectSeries,
	        dir: dir,
	        doDuring: doDuring,
	        doUntil: doUntil,
	        doWhilst: doWhilst,
	        during: during,
	        each: each,
	        eachLimit: eachLimit,
	        eachOf: eachOf,
	        eachOfLimit: eachOfLimit,
	        eachOfSeries: eachOfSeries,
	        eachSeries: eachSeries,
	        ensureAsync: ensureAsync,
	        every: every,
	        everyLimit: everyLimit,
	        everySeries: everySeries,
	        filter: filter,
	        filterLimit: filterLimit,
	        filterSeries: filterSeries,
	        forever: forever,
	        iterator: iterator$1,
	        log: log,
	        map: map,
	        mapLimit: mapLimit,
	        mapSeries: mapSeries,
	        memoize: memoize$1,
	        nextTick: setImmediate$1,
	        parallel: parallel,
	        parallelLimit: parallelLimit,
	        priorityQueue: priorityQueue,
	        queue: queue$1,
	        race: race,
	        reduce: reduce,
	        reduceRight: reduceRight,
	        reflect: reflect,
	        reflectAll: reflectAll,
	        reject: reject,
	        rejectLimit: rejectLimit,
	        rejectSeries: rejectSeries,
	        retry: retry,
	        retryable: retryable,
	        seq: seq,
	        series: series,
	        setImmediate: setImmediate$1,
	        some: some,
	        someLimit: someLimit,
	        someSeries: someSeries,
	        sortBy: sortBy,
	        timeout: timeout,
	        times: times,
	        timesLimit: timeLimit,
	        timesSeries: timesSeries,
	        transform: transform,
	        unmemoize: unmemoize,
	        until: until,
	        waterfall: waterfall,
	        whilst: whilst,

	        // aliases
	        all: every,
	        any: some,
	        forEach: each,
	        forEachSeries: eachSeries,
	        forEachLimit: eachLimit,
	        forEachOf: eachOf,
	        forEachOfSeries: eachOfSeries,
	        forEachOfLimit: eachOfLimit,
	        inject: reduce,
	        foldl: reduce,
	        foldr: reduceRight,
	        select: filter,
	        selectLimit: filterLimit,
	        selectSeries: filterSeries,
	        wrapSync: asyncify
	    };

	    exports['default'] = index;
	    exports.applyEach = applyEach;
	    exports.applyEachSeries = applyEachSeries;
	    exports.apply = apply$1;
	    exports.asyncify = asyncify;
	    exports.auto = auto;
	    exports.autoInject = autoInject;
	    exports.cargo = cargo;
	    exports.compose = compose;
	    exports.concat = concat;
	    exports.concatSeries = concatSeries;
	    exports.constant = constant;
	    exports.detect = detect;
	    exports.detectLimit = detectLimit;
	    exports.detectSeries = detectSeries;
	    exports.dir = dir;
	    exports.doDuring = doDuring;
	    exports.doUntil = doUntil;
	    exports.doWhilst = doWhilst;
	    exports.during = during;
	    exports.each = each;
	    exports.eachLimit = eachLimit;
	    exports.eachOf = eachOf;
	    exports.eachOfLimit = eachOfLimit;
	    exports.eachOfSeries = eachOfSeries;
	    exports.eachSeries = eachSeries;
	    exports.ensureAsync = ensureAsync;
	    exports.every = every;
	    exports.everyLimit = everyLimit;
	    exports.everySeries = everySeries;
	    exports.filter = filter;
	    exports.filterLimit = filterLimit;
	    exports.filterSeries = filterSeries;
	    exports.forever = forever;
	    exports.iterator = iterator$1;
	    exports.log = log;
	    exports.map = map;
	    exports.mapLimit = mapLimit;
	    exports.mapSeries = mapSeries;
	    exports.memoize = memoize$1;
	    exports.nextTick = setImmediate$1;
	    exports.parallel = parallel;
	    exports.parallelLimit = parallelLimit;
	    exports.priorityQueue = priorityQueue;
	    exports.queue = queue$1;
	    exports.race = race;
	    exports.reduce = reduce;
	    exports.reduceRight = reduceRight;
	    exports.reflect = reflect;
	    exports.reflectAll = reflectAll;
	    exports.reject = reject;
	    exports.rejectLimit = rejectLimit;
	    exports.rejectSeries = rejectSeries;
	    exports.retry = retry;
	    exports.retryable = retryable;
	    exports.seq = seq;
	    exports.series = series;
	    exports.setImmediate = setImmediate$1;
	    exports.some = some;
	    exports.someLimit = someLimit;
	    exports.someSeries = someSeries;
	    exports.sortBy = sortBy;
	    exports.timeout = timeout;
	    exports.times = times;
	    exports.timesLimit = timeLimit;
	    exports.timesSeries = timesSeries;
	    exports.transform = transform;
	    exports.unmemoize = unmemoize;
	    exports.until = until;
	    exports.waterfall = waterfall;
	    exports.whilst = whilst;
	    exports.all = every;
	    exports.allLimit = everyLimit;
	    exports.allSeries = everySeries;
	    exports.any = some;
	    exports.anyLimit = someLimit;
	    exports.anySeries = someSeries;
	    exports.find = detect;
	    exports.findLimit = detectLimit;
	    exports.findSeries = detectSeries;
	    exports.forEach = each;
	    exports.forEachSeries = eachSeries;
	    exports.forEachLimit = eachLimit;
	    exports.forEachOf = eachOf;
	    exports.forEachOfSeries = eachOfSeries;
	    exports.forEachOfLimit = eachOfLimit;
	    exports.inject = reduce;
	    exports.foldl = reduce;
	    exports.foldr = reduceRight;
	    exports.select = filter;
	    exports.selectLimit = filterLimit;
	    exports.selectSeries = filterSeries;
	    exports.wrapSync = asyncify;

	}));
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(17)(module), (function() { return this; }()), __webpack_require__(0).setImmediate, __webpack_require__(4)))

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = debug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(15);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lowercased letter, i.e. "n".
	 */

	exports.formatters = {};

	/**
	 * Previously assigned color.
	 */

	var prevColor = 0;

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 *
	 * @return {Number}
	 * @api private
	 */

	function selectColor() {
	  return exports.colors[prevColor++ % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function debug(namespace) {

	  // define the `disabled` version
	  function disabled() {
	  }
	  disabled.enabled = false;

	  // define the `enabled` version
	  function enabled() {

	    var self = enabled;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // add the `color` if not set
	    if (null == self.useColors) self.useColors = exports.useColors();
	    if (null == self.color && self.useColors) self.color = selectColor();

	    var args = Array.prototype.slice.call(arguments);

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %o
	      args = ['%o'].concat(args);
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    if ('function' === typeof exports.formatArgs) {
	      args = exports.formatArgs.apply(self, args);
	    }
	    var logFn = enabled.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }
	  enabled.enabled = true;

	  var fn = exports.enabled(namespace) ? enabled : disabled;

	  fn.namespace = namespace;

	  return fn;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	module.exports = function (obj, sub) {
	  if (sub) sub = sub.split('.')

	  if (obj === null || obj === undefined) return false

	  if (!sub) return true

	  var current = obj
	  var prop
	  for (var i = 0; i < sub.length; i++) {
	    prop = sub[i]
	    if (current[prop] === null || current[prop] === undefined) return false
	    current = current[prop]
	  }

	  return true
	}


/***/ },
/* 14 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 15 */
/***/ function(module, exports) {

	/**
	 * Helpers.
	 */

	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function(val, options){
	  options = options || {};
	  if ('string' == typeof val) return parse(val);
	  return options.long
	    ? long(val)
	    : short(val);
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = '' + str;
	  if (str.length > 10000) return;
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
	  if (!match) return;
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function short(ms) {
	  if (ms >= d) return Math.round(ms / d) + 'd';
	  if (ms >= h) return Math.round(ms / h) + 'h';
	  if (ms >= m) return Math.round(ms / m) + 'm';
	  if (ms >= s) return Math.round(ms / s) + 's';
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function long(ms) {
	  return plural(ms, d, 'day')
	    || plural(ms, h, 'hour')
	    || plural(ms, m, 'minute')
	    || plural(ms, s, 'second')
	    || ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) return;
	  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
	  return Math.ceil(ms / n) + ' ' + name + 's';
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate) {'use strict';
	module.exports = typeof setImmediate === 'function' ? setImmediate :
		function setImmediate() {
			var args = [].slice.apply(arguments);
			args.splice(1, 0, 0);
			setTimeout.apply(null, args);
		};

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).setImmediate))

/***/ },
/* 17 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			Object.defineProperty(module, "loaded", {
				enumerable: true,
				configurable: false,
				get: function() { return module.l; }
			});
			Object.defineProperty(module, "id", {
				enumerable: true,
				configurable: false,
				get: function() { return module.i; }
			});
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }
/******/ ]);