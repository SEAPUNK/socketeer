require! 'ws':WebSocket
require! '../client-abstract':ClientAbstract

class SocketeerClient extends ClientAbstract
    /**
     * Constructs a new instance.
     * @param {String} address Address passed to the ws module
     * @param {String|Array} protocols Protocols passed to the ws module
     * @param {Object} options Options passed to the ws module, with an additional
     *                         'pingTimeout' parameter.
     */
    (address, protocols, options) ->
        ws = new WebSocket ...
        @_pingTimeout = options.pingTimeout or 15000
        ws.on 'open', @~handle-open
        super ws

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
    reset-heartbeat-timeout = ->
        if @heartbeat-timeout
            clear-timeout @heartbeat-timeout
        @heartbeat-timeout = set-timeout ~>
            # This means that the server took too long to send a timeout.
            @emit 'timeout'
            # Terminate the connection because it timed out: there's no
            # point to handshaking a close, since that is also likely to
            # time out.
            @terminate!
        , @heartbeat-interval + @heartbeat-timeout

    /**
     * @private
     * Handles open event.
     */
    handle-open: ->
        @ready = true
        /** @TODO timeout for before the 'hi' message */
        @emit 'open'

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

module.exports = SocketeerClient