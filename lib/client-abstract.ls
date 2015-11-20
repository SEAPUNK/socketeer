require! 'events'

{ActionResponse} = require './enums'

EventEmitter = events.EventEmitter

class ClientAbstract extends EventEmitter
    (@ws) ->
        @ws.on 'message', @~handle-message
        @ws.on 'error', @~handle-error
        @ws.on 'close', @~handle-close

    events: {}
    actions: {}
    action-callbacks: {}

    /**
     * @private
     * Sends data converted into JSON
     * @param {Object} data Data
     */
    send: (data) ->
        @ws.send JSON.stringify data

    /**
     * @private
     * Handles ws 'error' event.
     * @param {Object} err Error
     */
    handle-error: (err) ->
        @emit 'error', err

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     */
    handle-close: (code, message) ->
        # Emit the close event
        @emit 'close', do
            code: code
            message: message

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        if typeof data is not 'string'
            /** @TODO handle data other than JSON */
            return
        try
            data = JSON.parse data
        catch err
            return
        if data.a
            return @handle-action data
        if data.e
            return @handle-event data

    /**
     * @private
     * Handles an action.
     * @param {Object} data Data
     */
    handle-action: (data) ->
        if data.s
            return @_call-action-response-handler data

        @_call-action-handler data

    /**
     * @private
     * Handles an event.
     * @param {Object} data Data
     */
    handle-event: (data) ->
        @_call-event-handlers data

    /**
     * @private
     * Calls the handlers for an event.
     * @param {object} data Data
     */
    _call-event-handlers: (data) ->
        return if not @events[data.e]

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
        if not @actions[data.a]
            return @send do
                i: data.i
                a: data.a
                s: ActionResponse.NONEXISTENT
        try
            @actions[data.a] data.d, (data) ~>
                @send do
                    i: data.i
                    a: data.a
                    s: ActionResponse.OK
                    d: data
        catch err
            @send do
                i: data.i
                a: data.a
                s: ActionResponse.ERROR
            throw err
    
    /**
     * @private
     * Calls the action response handler.
     * @param {Object} data Data
     */
    _call-action-response-handler: (data) ->
        return if not @action-callbacks[data.i]
        set-timeout ~>
            var err
            if data.s is not ActionResponse.OK
                switch data.s
                case ActionResponse.ERROR
                    err := new Error "a server error occured"
                case ActionResponse.NONEXISTENT
                    err := new Error "action does not exist"
                default
                    err := new Error "a non-OK response was received: #{data.s}"
            @action-callbacks[data.i] err, data.d

    /**
     * @private
     * Generates an action callback ID, for callback handling purposes.
     */
    _curActionId: 0
    _generateActionId = ->
        return @_curActionId++

    /**
     * @private
     * Emits an action.
     * @param {String} name Action name
     * @param {Object} data Action data
     * @param {Function} callback Action response callback
     */
    _emitAction: (name, data, callback) ->
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
        @send do
            e: name
            d: data

    /**
     * Defines an event handler.
     * @param {String} name Event name
     * @param {Function} handler Event handler
     */
    event: (name, handler) ->
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
        if @actions[name] and not force
            throw new Error "action is already registered"
        @actions[name] = handler

    /**
     * Emits an event with event data.
     * @param {String} name Event name
     * @param {Object} data Event data
     * @param {Function} [callback] Callback for action handlers.
     *                              If callback is set, it emits a socket 'action',
     *                              rather than an 'event'.
     */
    emit: (name, data, callback) ->
        if typeof callback is 'function'
            @_emitAction name, data, callback
        else
            @_emitEvent name, data

    /**
     * Closes the connection gracefully.
     */
    close: ->
        @ws.close!

    /**
     * Closes the connection, less gracefully.
     */
    kill: ->
        @ws.terminate!

module.exports = ClientAbstract