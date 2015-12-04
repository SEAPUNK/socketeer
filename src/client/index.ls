require! 'ws':WebSocket
require! '../client-abstract':ClientAbstract
require! 'debug'
require! 'util'

class SocketeerClient extends ClientAbstract
    /**
     * Constructs a new instance.
     * @param {String} address Address passed to the ws module
     * @param {String|Array} protocols Protocols passed to the ws module
     * @param {Object} options Options passed to the ws module, with additional
     *                         'heartbeatTimeout' and 'reconnectWait' parameters.
     */
    (address, protocols, options={}) ->
        @d = debug 'socketeer:SocketeerClient'
        @construct-opts = do
            address: address
            protocols: protocols
            options: options
        @d "constructing websocket with options: #{util.inspect @construct-opts}"
        @heartbeat-timeout = options.heartbeat-timeout or 15000
        @reconnect-wait = options.reconnect-wait or 5000
        @d "heartbeat timeout set to #{@heartbeat-timeout}"
        @closed = false
        @ready = false
        @ws = new WebSocket ...
        @attach-events!
        super @ws

    /**
     * @private
     * Attaches ws events.
     */
    attach-events: ->
        @d "attaching events"
        @ws.on 'open', @~handle-open
        super ...

    /**
     * @private
     * Handles a heartbeat event.
     */
    handle-heartbeat: ->
        @d "handling heartbeat"
        @reset-heartbeat-timeout!
        @ws.send 'h'

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        @d "handling message"
        if @ws.readyState is @ws.CLOSING
        or @ws.readyState is @ws.CLOSED
            return @d "ignoring message, as socket is closing"
        if data is 'h' # BRING OUT YOUR H
            @d "message is heartbeat"
            return @handle-heartbeat!
        if (String(data).index-of 'hi') is 0
            @d "message is heartbeat interval"
            @d "data: #{data}"
            reg = /^hi(.*)$/.exec String(data)
            interval = +reg[1]
            if Number.isNaN interval or not interval
                # This means that the heartbeat interval data is invalid.
                # Terminate the connnection, since we don't want to listen
                #   to anything more that they have to say.
                @_emit 'error', new Error 'invalid heartbeat interval from server'
                return @kill!
            @heartbeat-interval = interval
            @d "heartbeat interval set to #{@heartbeat-interval}"
            return @reset-heartbeat-timeout!
        super ...


    /**
     * @private
     * (Re)starts the heartbeat 1timeout.
     */
    reset-heartbeat-timeout: ->
        timeoutPeriod = @heartbeat-interval + @heartbeat-timeout
        @d "resetting heartbeat timeout: #{timeoutPeriod}"
        if @heartbeat-timer
            @d "clearing existing heartbeat timer"
            clear-timeout @heartbeat-timer
        @heartbeat-timer = set-timeout ~>
            @d "heartbeat timeout called"
            # This means that the server took too long to send a timeout.
            @_emit 'timeout'
            # Terminate the connection because it timed out: there's no
            # point to handshaking a close, since that is also likely to
            # time out.
            @kill!
        , timeoutPeriod

    /**
     * @private
     * Stops heartbeat timeout.
     */
    stop-heartbeat-timeout: ->
        @d "stopping heartbeat timeout"
        clear-timeout @heartbeat-timer

    /**
     * @private
     * Handles open event.
     */
    handle-open: ->
        @d "handling open"
        /**
         * @TODO [protocol] timeout for before the 'hi' message
         * @TODO [protocol] don't 'ready' until 'hi' message is received
         * @TODO [protocol] if not 'ready', then ignore all server messages (except for the heartbeat interval)
         */
        @ready = true
        @_emit '_open', @is-reconnection
        @_emit 'open', @is-reconnection

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     * @param {Object} error Error, if the socket closed due to an error.
     */
    handle-close: (code, message, error) ->
        @d "handling close"
        @ready = false
        @closed = true
        @stop-heartbeat-timeout!
        super ...

    /**
     * Emits an event with event data.
     * Throws an error if not finished connecting.
     *
     * @note This function is renamed to 'emit' once an instance is created
     * 
     * @param {String} name Event name
     * @param {Object} data Event data
     * @param {Function} [callback] Callback for action handlers.
     *                              If callback is set, it emits a socket 'action',
     *                              rather than an 'event'.
     */
    emit_: (name, data, callback) ->
        @d "emitting: #{name}"
        if not @ready
            throw new Error "client is not ready"
        super ...

    /**
     * Reconnects to server.
     *
     * @param {Boolean} immediate Whether to ignore the set reconnectWait option.
     */
    reconnect: (immediate) ->
        @d "trying reconnect"
        if not @closed
            @d "not closed, not going to reconnect"
            throw new Error "client has not disconnected to reconnect yet"
        return if @will-reconnect
        @will-reconnect = true
        @d "will reconnect in #{@reconnect-wait} ms"
        timeout = if immediate then 0 else @reconnect-wait
        set-timeout ~>
            @d "reconnecting"
            @will-reconnect = false
            @closed = false
            @is-reconnection = true
            o = @construct-opts
            @ws = new WebSocket o.address, o.protocols, o.options
            @attach-events!
        , timeout

module.exports = SocketeerClient