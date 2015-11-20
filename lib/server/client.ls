require! '../client-abstract':ClientAbstract

class ServerClient extends ClientAbstract
    /**
     * @private
     * Registers the client to the Socketeer manager.
     * Must be called before anything else is done with the client.
     * @param {String} id Client ID
     * @param {ClientPool} pool Socketeer ClientPool
     */
    register: (@id, @pool) ->
        # Nothing needed here

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

        # Remove from client pool
        @pool.remove @id

        super ...

module.exports = ServerClient