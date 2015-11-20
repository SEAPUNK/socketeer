require! 'ws':WebSocket
require! '../client-abstract':ClientAbstract

class SocketeerClient extends ClientAbstract
    /**
     * Constructs a new instance.
     * @param {String} address Address passed to the ws module
     * @param {String|Array} protocols Protocols passed to the ws module
     * @param {Object} options Options passed to the ws module, with an additional
     *                         'heartbeatTimeout' parameter.
     */
    (address, protocols, options) ->
        @construct-opts = do
            address: address
            protocols: protocols
            options: options
        @ws = new WebSocket ...
        @attach-events!
        @heartbeat-timeout = options.heartbeat-timeout or 15000
        super ws

    /**
     * @private
     * Attaches ws events.
     */
    attach-events: ->
        @ws.on 'open', @~handle-open
        super ...

    /**
     * @private
     * Handles a heartbeat event.
     */
    handle-heartbeat: ->
        @reset-heartbeat-timeout!
        @ws.send 'h'

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        if data is 'h' # BRING OUT YOUR H
            return @handle-heartbeat!
        if (String(data).index-of 'hi') is 0
            reg = /^hi(.*)$/.exec String(data)
            interval = +reg[1]
            if Number.isNaN interval or not interval
                # This means that the heartbeat interval data is invalid.
                # Terminate the connnection, since we don't want to listen
                #   to anything more that they have to say.
                @emit 'error', new Error 'invalid heartbeat interval from server'
                return @terminate!
            @heartbeat-interval = interval
            return @reset-heartbeat-timeout!
        super ...


    /**
     * @private
     * (Re)starts the heartbeat timeout.
     */
    reset-heartbeat-timeout: ->
        if @heartbeat-timer
            clear-timeout @heartbeat-timer
        @heartbeat-timer = set-timeout ~>
            # This means that the server took too long to send a timeout.
            @emit 'timeout'
            # Terminate the connection because it timed out: there's no
            # point to handshaking a close, since that is also likely to
            # time out.
            @terminate!
        , @heartbeat-interval + @heartbeat-timeout

    /**
     * @private
     * Stops heartbeat timeout.
     */
    stop-heartbeat-timeout: ->
        clear-timeout @heartbeat-timer

    /**
     * @private
     * Handles open event.
     */
    handle-open: ->
        @ready = true
        /** @TODO timeout for before the 'hi' message */
        @emit 'open', @is-reconnection

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     */
    handle-close: (code, message) ->
        @ready = false
        @closed = true
        @stop-heartbeat-timeout!
        super ...

    /**
     * Emits an event with event data.
     * Throws an error if not finished connecting.
     * @param {String} name Event name
     * @param {Object} data Event data
     * @param {Function} [callback] Callback for action handlers.
     *                              If callback is set, it emits a socket 'action',
     *                              rather than an 'event'.
     */
    emit: (name, data, callback) ->
        if not @ready
            throw new Error "client is not ready"
        super ...

    /**
     * Reconnects to server.
     */
    reconnect: ->
        if not @closed
            throw new Error "client has not disconnected to reconnect yet"
        @closed = false
        @is-reconnection = true
        o = @construct-opts
        ws = new WebSocket o.address, o.protocols, o.options
        @attach-events!

module.exports = SocketeerClient