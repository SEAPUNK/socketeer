require! 'events'
require! 'util'

{ActionResponse} = require './enums'

EventEmitter = events.EventEmitter

class ClientAbstract extends EventEmitter
    (ws) ->
        /**
         * Put the EventEmitter's emit into _emit
         * Put our emitter into emit
         */
        @_emit = @emit
        @emit = @~emit_
        @events = {}
        @actions = {}
        @action-callbacks = {}
        @data = {}

    /**
     * @private
     * Attaches ws events.
     */
    attach-events: ->
        @d "attaching events (super)"
        @ws.on 'message', @~handle-message
        @ws.on 'error', @~handle-error
        @ws.on 'close', @~handle-close

    /**
     * @private
     * Sends data converted into JSON
     * @param {Object} data Data
     */
    send: (data) ->
        data = JSON.stringify data
        @d "sending data (super): #{data}"
        @ws.send data

    /**
     * @private
     * Handles ws 'error' event.
     * @param {Object} err Error
     */
    handle-error: (err) ->
        @d "handling error (super): #{util.inspect err}"
        @_emit 'error', err
        /*
            We are emitting 'close' as well because the ws library does
            not handle errors like net.Socket: error means that an error occured
            and the socket is closed; there will be no 'close' event.

            net.Socket's documentation states that if there is an 'error' event,
            then the socket is pretty much dead. There is no way to recover.
         */
        @handle-close null, null, err

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     * @param {Error} error=null Error, if the socket closed due to an error.
     */
    handle-close: (code, message, error=null) ->
        @d "handling close (super): #{util.inspect code}, message: #{util.inspect message}, error: #{error?.stack or error}"
        # Emit the close event
        @_emit 'close', code, message, error

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        @d "handling message (super)"
        if @ws.readyState is @ws.CLOSING
        or @ws.readyState is @ws.CLOSED
            return @d "ignoring message, as socket is closing (this should not happen!)"
        if typeof data is not 'string'
            @d "message is not string, ignoring"
            /** @TODO handle data other than JSON */
            return
        try
            @d "parsing JSON: #{data}"
            data = JSON.parse data
        catch err
            @d "JSON parse failed, ignoring: #{util.inspect err}"
            return

        if data.a? or data.s?
            @d "data is action"
            return @handle-action data
        else if data.e?
            @d "data is event"
            return @handle-event data
        else
            @d "data is unknown, ignoring"
            return
    /**
     * @private
     * Handles an action.
     * @param {Object} data Data
     */
    handle-action: (data) ->
        @d "handling action (super): #{util.inspect data}"
        if data.s?
            return @_call-action-response-handler data
        @_call-action-handler data

    /**
     * @private
     * Handles an event.
     * @param {Object} data Data
     */
    handle-event: (data) ->
        @d "handling event (super): #{util.inspect data}"
        @_call-event-handlers data

    /**
     * @private
     * Calls the handlers for an event.
     * @param {object} data Data
     */
    _call-event-handlers: (data) ->
        @d "event handlers for event '#{data.e}'"
        return if not @events[data.e]
        @d "event '#{data.e}' exists, there are #{@events[data.e].length} handlers"

        run = (evt, data) ->
            set-timeout ->
                evt data.d

        for evt in @events[data.e]
            run evt, data

    /**
     * @private
     * Calls the action handler.
     * @param {object} data Data
     */
    _call-action-handler: (data) ->
        @d "action handler for action '#{data.a}'"
        if not @actions[data.a]
            @d "action '#{data.a}' does not exist"
            return @send do
                i: data.i
                s: ActionResponse.NONEXISTENT
                d: ActionResponse.NONEXISTENT
        try
            @d "calling action handler '#{data.a}'"
            @actions[data.a] data.d, (err, response) ~>
                if err
                    @d "action handler '#{data.a}' errored (callback fail), responding (#{util.inspect err})"
                    @send do
                        i: data.i
                        s: ActionResponse.ERROR
                        d: ActionResponse.ERROR
                    throw err
                else
                    @d "action handler '#{data.a}' called back, responding"
                    @send do
                        i: data.i
                        s: ActionResponse.OK
                        d: response
        catch err
            @d "action handler '#{data.a}' errored (call fail), responding (#{util.inspect err})"
            @send do
                i: data.i
                s: ActionResponse.ERROR
                d: ActionResponse.ERROR
            throw err
    
    /**
     * @private
     * Calls the action response handler.
     * @param {Object} data Data
     */
    _call-action-response-handler: (data) ->
        @d "action response handler for #{data.i}"
        return if not @action-callbacks[data.i]
        @d "response handler exists, continuing"
        set-timeout ~>
            @d "determining error from status: #{data.s}"
            var err
            if data.s is not ActionResponse.OK
                switch data.s
                case ActionResponse.ERROR
                    err := new Error "a server error occured"
                case ActionResponse.NONEXISTENT
                    err := new Error "action does not exist"
                default
                    err := new Error "a non-OK response was received: #{data.s}"
            @d "calling action response handler #{data.a}@#{data.i}"
            @action-callbacks[data.i] err, data.d

    /**
     * @private
     * Generates an action callback ID, for callback handling purposes.
     */
    _curActionId: 0
    _generateActionId: ->
        @d "generating action id: #{@_curActionId}"
        return @_curActionId++

    /**
     * @private
     * Emits an action.
     * @param {String} name Action name
     * @param {Object} data Action data
     * @param {Function} callback Action response callback
     */
    _emitAction: (name, data, callback) ->
        @d "emitting action (super): #{name}"
        id = @_generateActionId!
        @action-callbacks[id] = callback
        @send do
            i: id
            a: name
            d: data

    /**
     * @private
     * Emits an event.
     * @param {String} name Event name
     * @param {Object} data Event data
     */
    _emitEvent: (name, data) ->
        @d "emitting event (super): #{name}"
        @send do
            e: name
            d: data

    /**
     * Defines an event handler.
     * @param {String} name Event name
     * @param {Function} handler Event handler
     */
    event: (name, handler) ->
        @d "defining event handler for '#{name}'"
        if not @events[name]
            @events[name] = []
        @events[name].push handler

    /**
     * Defines an action handler.
     * @param {String} name Action name
     * @param {Function} handler Action handler
     * @param {Boolean} force Whether to overwrite the handler
     *                        if it already exists for the action
     */
    action: (name, handler, force) ->
        @d "defining action handler for '#{name}' (force: #{not not force})"
        if @actions[name] and not force
            @d "action handler is already defined"
            throw new Error "action is already registered"
        @actions[name] = handler

    /**
     * Emits an event with event data.
     *
     * @note This function is renamed to 'emit' once an instance is created.
     *
     * @param {String} name Event name
     * @param {Object} data Event data
     * @param {Function} [callback] Callback for action handlers.
     *                              If callback is set, it emits a socket 'action',
     *                              rather than an 'event'.
     */
    emit_: (name, data, callback) ->
        @d "emitting (super): #{name} - typeof callback: #{typeof callback}"
        if typeof callback is 'function'
            @_emitAction name, data, callback
        else
            @_emitEvent name, data

    /**
     * Closes the connection gracefully.
     */
    close: (code, data) ->
        @d "closing connection"
        @ws.close code, data

    /**
     * Closes the connection, less gracefully.
     */
    kill: ->
        @d "killing connection"
        @ws.terminate!

module.exports = ClientAbstract