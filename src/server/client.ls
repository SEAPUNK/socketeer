require! '../client-abstract':ClientAbstract
require! 'debug'

class ServerClient extends ClientAbstract
    (@ws) ->
        @d = debug 'socketeer:SocketeerServerClient'
        @ip = ws._socket.remote-address
        @attach-events!
        super ...

    /**
     * @private
     * Sets the ServerClient ID. Throws an error if it's already set.
     * @param {String} id Socket ID
     */
    set-id: (id) ->
        @d "setting client ID to #{id}"
        if @id
            @d "could not set ID (already set)"
            throw new Error "socket already has an ID"
        @id = id

    /**
     * @private
     * Registers the client to the Socketeer manager.
     * Must be called before anything else is done with the client.
     * @param {ClientPool} pool Socketeer ClientPool
     */
    register: (@pool) ->
        /**
         * @TODO prevent certain functions from being called
         *     until the socket is registered
         */
        @registered = true
        interval = @pool.manager.heartbeat-interval
        @ws.send "hi#{interval}"
        @start-heartbeat!

    /**
     * Adds client to a room.
     * Convenience function for RoomManager.join
     * @param {String} name Room name
     */
    join: (name) ->
        return @pool.roomManager.join name, @

    /**
     * Removes client from a room.
     * Convenience function for RoomManager.leave
     * @param {String} name Room name
     */
    leave: (name) ->
        return @pool.roomManager.leave name, @

    /**
     * @private
     * Starts the heartbeat loop
     */
    start-heartbeat: ->
        @d 'starting heartbeat loop'
        @heartbeat-loop = set-timeout ~>
            @ws.send 'h'
            @heartbeat-timeout = set-timeout ~>
                # Client timed out, and thus, we gotta kill the connection.
                @_emit 'timeout'
                @kill!
            , @pool.manager.heartbeat-timeout
        , @pool.manager.heartbeat-interval

    /**
     * @private
     * Handles heartbeats.
     */
    handle-heartbeat: ->
        @d 'handling heartbeat'
        @stop-heartbeat!
        @start-heartbeat!

    /**
     * @private
     * Stops the heartbeat loop
     */
    stop-heartbeat: ->
        @d 'stopping heartbeat loop'
        clear-timeout @heartbeat-loop
        clear-timeout @heartbeat-timeout

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        @d 'handling message'
        if @ws.readyState is @ws.CLOSING
        or @ws.readyState is @ws.CLOSED
            return @d "ignoring message, as socket is closing"
        if data is 'h'
            return @handle-heartbeat!
        super ...

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     * @param {Boolean} error Error, if the socket closed due to an error.
     */
    handle-close: (code, message, error) ->
        @d 'handling close'

        if @registered
            # Leave all rooms
            @pool.roomManager.removeAll @
            @pool.roomManager._leaveAll @

            # Stop the heartbeat loop
            @stop-heartbeat!

            # Remove from client pool
            @pool.remove @id

        super ...

module.exports = ServerClient