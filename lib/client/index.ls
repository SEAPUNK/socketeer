require! 'ws':WebSocket
require! '../client-abstract':ClientAbstract
require! 'debug'
require! 'util'

class SocketeerClient extends ClientAbstract
    /**
     * Constructs a new instance.
     * @param {String} address Address passed to the ws module
     * @param {String|Array} protocols Protocols passed to the ws module
     * @param {Object} options Options passed to the ws module, with an additional
     *                         'heartbeatTimeout' parameter.
     */
    (address, protocols, options) ->
        @d = debug 'socketeer:SocketeerClient'
        @construct-opts = do
            address: address
            protocols: protocols
            options: options
        @d "constructing websocket with options: #{util.inspect @construct-opts}"
        @ws = new WebSocket ...
        @attach-events!
        @heartbeat-timeout = options.heartbeat-timeout or 15000
        @d "heartbeat timeout set to #{@heartbeat-timeout}"
        super ws

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
                @emit 'error', new Error 'invalid heartbeat interval from server'
                return @terminate!
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
            @emit 'timeout'
            # Terminate the connection because it timed out: there's no
            # point to handshaking a close, since that is also likely to
            # time out.
            @terminate!
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
        @d "handling close: #{code}, #{message}"
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
        @d "emitting: #{name} - callback: #{callback}"
        if not @ready
            throw new Error "client is not ready"
        super ...

    /**
     * Reconnects to server.
     */
    reconnect: ->
        @d "trying reconnect"
        if not @closed
            @d "not closed, not going to reconnect"
            throw new Error "client has not disconnected to reconnect yet"
        @d "reconnecting"
        @closed = false
        @is-reconnection = true
        o = @construct-opts
        ws = new WebSocket o.address, o.protocols, o.options
        @attach-events!

module.exports = SocketeerClient