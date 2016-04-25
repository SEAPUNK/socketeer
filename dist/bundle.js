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
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(22).nextTick;
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

	exports = module.exports = __webpack_require__(18);
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
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const debug = __webpack_require__(2);
	const maybestack = __webpack_require__(3);
	const ClientAbstract = __webpack_require__(6);
	const ClientPreparer = __webpack_require__(7);

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
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const Client = __webpack_require__(4);

	class BrowserClient extends Client {
	  constructor(address, options) {
	    super(address, options, window.WebSocket);
	    this._isBrowserClient = true;
	  }
	}

	module.exports = BrowserClient;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const EventEmitter = __webpack_require__(20).EventEmitter;
	const maybestack = __webpack_require__(3);
	const exists = __webpack_require__(19);
	const setImmediateShim = __webpack_require__(23);
	const MessageQueue = __webpack_require__(8);
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
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const debug = __webpack_require__(2);
	const validateSessionResumeToken = __webpack_require__(9).validateSessionResumeToken;
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
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// TODO: Replace async.queue with our own message queue.

	module.exports = __webpack_require__(10);

/***/ },
/* 9 */
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
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var queue = __webpack_require__(16);

	module.exports = function (worker, concurrency) {
	    return queue(function (items, cb) {
	        worker(items[0], cb);
	    }, concurrency, 1);
	};


/***/ },
/* 11 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function arrayEach(arr, iterator) {
	    var index = -1;
	    var length = arr.length;

	    while (++index < length) {
	        iterator(arr[index], index, arr);
	    }
	};


/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';

	module.exports = Array.isArray || function isArray(obj) {
	    return Object.prototype.toString.call(obj) === '[object Array]';
	};


/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function map(arr, iterator) {
	    var index = -1;
	    var length = arr.length;
	    var result = new Array(length);
	    while (++index < length) result[index] = iterator(arr[index], index, arr);
	    return result;
	};


/***/ },
/* 14 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function noop () {};


/***/ },
/* 15 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function only_once(fn) {
	    return function() {
	        if (fn === null) throw new Error('Callback was already called.');
	        fn.apply(this, arguments);
	        fn = null;
	    };
	};


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var map = __webpack_require__(13);
	var noop = __webpack_require__(14);
	var isArray = __webpack_require__(12);
	var onlyOnce = __webpack_require__(15);
	var arrayEach = __webpack_require__(11);
	var setImmediate = __webpack_require__(17);

	module.exports = function queue(worker, concurrency, payload) {
	    if (concurrency == null)
	        concurrency = 1;
	    else if (concurrency === 0) {
	        throw new Error('Concurrency must not be zero');
	    }

	    function _insert(q, data, pos, callback) {
	        if (callback != null && typeof callback !== "function") {
	            throw new Error("task callback must be a function");
	        }
	        q.started = true;
	        if (!isArray(data)) {
	            data = [data];
	        }
	        if (data.length === 0 && q.idle()) {
	            // call drain immediately if there are no tasks
	            return setImmediate(function() {
	                q.drain();
	            });
	        }
	        arrayEach(data, function(task) {
	            var item = {
	                data: task,
	                callback: callback || noop
	            };

	            if (pos) {
	                q.tasks.unshift(item);
	            } else {
	                q.tasks.push(item);
	            }

	            if (q.tasks.length === q.concurrency) {
	                q.saturated();
	            }
	        });
	        setImmediate(q.process);
	    }

	    function _next(q, tasks) {
	        return function() {
	            workers -= 1;

	            var removed = false;
	            var args = arguments;
	            arrayEach(tasks, function(task) {
	                arrayEach(workersList, function(worker, index) {
	                    if (worker === task && !removed) {
	                        workersList.splice(index, 1);
	                        removed = true;
	                    }
	                });

	                task.callback.apply(task, args);
	            });
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
	        empty: noop,
	        drain: noop,
	        started: false,
	        paused: false,
	        push: function(data, callback) {
	            _insert(q, data, false, callback);
	        },
	        kill: function() {
	            q.drain = noop;
	            q.tasks = [];
	        },
	        unshift: function(data, callback) {
	            _insert(q, data, true, callback);
	        },
	        process: function() {
	            while (!q.paused && workers < q.concurrency && q.tasks.length) {

	                var tasks = q.payload ?
	                    q.tasks.splice(0, q.payload) :
	                    q.tasks.splice(0, q.tasks.length);

	                var data = map(tasks, function(task) {
	                    return task.data;
	                });

	                if (q.tasks.length === 0) {
	                    q.empty();
	                }
	                workers += 1;
	                workersList.push(tasks[0]);
	                var cb = onlyOnce(_next(q, tasks));
	                worker(data, cb);
	            }
	        },
	        length: function() {
	            return q.tasks.length;
	        },
	        running: function() {
	            return workers;
	        },
	        workersList: function() {
	            return workersList;
	        },
	        idle: function() {
	            return q.tasks.length + workers === 0;
	        },
	        pause: function() {
	            q.paused = true;
	        },
	        resume: function() {
	            if (q.paused === false) {
	                return;
	            }
	            q.paused = false;
	            var resumeCount = Math.min(q.concurrency, q.tasks.length);
	            // Need to call q.process once per concurrent
	            // worker to preserve full concurrency after pause
	            for (var w = 1; w <= resumeCount; w++) {
	                setImmediate(q.process);
	            }
	        }
	    };
	    return q;
	};


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate) {'use strict';

	var _setImmediate = typeof setImmediate === 'function' && setImmediate;
	var fallback = function(fn) {
	    setTimeout(fn, 0);
	};

	module.exports = function setImmediate(fn) {
	    // not a direct alias for IE10 compatibility
	    return (_setImmediate || fallback)(fn);
	};

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).setImmediate))

/***/ },
/* 18 */
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
	exports.humanize = __webpack_require__(21);

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
/* 19 */
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
/* 20 */
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
/* 21 */
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
/* 22 */
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
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate) {'use strict';
	module.exports = typeof setImmediate === 'function' ? setImmediate :
		function setImmediate() {
			var args = [].slice.apply(arguments);
			args.splice(1, 0, 0);
			setTimeout.apply(null, args);
		};

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).setImmediate))

/***/ }
/******/ ]);