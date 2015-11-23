require! 'debug'

class Room
    (@name) ->
        @d = debug "socketeer:Room[#{@name}]"
        @d "constructing new instance"
        @clients = []

    /**
     * Adds a client to the room.
     * @param {Client} client Socketeer client
     * @returns {Boolean} added Whether the client has been added.
     *                          False if client was already in room.
     */
    add: (client) ->
        @d "adding client to room: #{client?.id}"
        for _client, idx in @clients
            if client is _client
                return false
        @clients.push client
        return true

    /**
     * Removes a client from the room.
     * @param {Client} client Socketeer client
     * @returns {Boolean} removed Whether the client has been removed.
     *                            False if client wasn't in the room
     *                            in the first place.
     */
    remove: (client) ->
        @d "removing client from room: #{client?.id}"
        for _client, idx in @clients
            if client is _client
                @clients.splice idx, 1
                return true
        return false

    /**
     * Whether the client is in the room.
     * @param {Client} client Socketeer client
     * @returns {Boolean} exists Whether the client is in this room.
     */
    exists: (client) ->
        @d "checking if client exists in room: #{client?.id}"
        for _client in @clients
            if client is _client
                return true
        return false

    /**
     * Broadcasts an event to all clients in the room.
     * @param {String} name Event name
     * @param {Object} data Event data
     */
    emit: (name, data) ->
        @d "emitting #{name} to all clients in room"
        for client in @clients
            client.emit name, data

    /**
     * Removes all clients from the room.
     */
    clear: ->
        @d "clearing room from clients"
        @clients = []

module.exports = Room