require! '../client-abstract':ClientAbstract

class ServerClient extends ClientAbstract
    (@ws) ->
        @attach-events!
        super ...

    /**
     * @private
     * Registers the client to the Socketeer manager.
     * Must be called before anything else is done with the client.
     * @param {String} id Client ID
     * @param {ClientPool} pool Socketeer ClientPool
     */
    register: (@id, @pool) ->
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
        @heartbeat-loop = set-timeout ~>
            @ws.send 'h'
            @heartbeat-timeout = set-timeout ~>
                # Client timed out, and thus, we gotta kill the connection.
                @emit 'timeout'
                @terminate!
            , @pool.manager.heartbeat-timeout
        , @pool.manager.heartbeat-interval

    /**
     * @private
     * Handles heartbeats.
     */
    handle-heartbeat: ->
        clear-timeout @heartbeat-timeout
        start-heartbeat!

    /**
     * @private
     * Stops the heartbeat loop
     */
    stop-heartbeat: ->
        clear-timeout @heartbeat-loop

    /**
     * @private
     * Handles the ws 'message' event.
     * @param {Object} data Data
     * @param {Object} flags Flags
     */
    handle-message: (data, flags) ->
        if data is 'h'
            return @handle-heartbeat!
        super ...

    /**
     * @private
     * Handles ws 'close' event.
     * @param {Object} code Code
     * @param {Object} message Message
     */
    handle-close: (code, message) ->
        # Leave all rooms
        @pool.roomManager.removeAll @
        @pool.roomManager._leaveAll @

        # Stop the heartbeat loop
        @stop-heartbeat!

        # Remove from client pool
        @pool.remove @id

        super ...

module.exports = ServerClient