class Room
    (@name) ->

    clients: []

    /**
     * Adds a client to the room.
     * @param {Client} client Socketeer client
     */
    add: (client) ->
        @clients.push client

    /**
     * Removes a client from the room.
     * @param {Client} client Socketeer client
     */
    remove: (client) ->
        for _client, idx in @clients
            if client is _client
                @clients.splice idx, 1

    /**
     * Whether the client is in a room.
     * @param {Client} client Socketeer client
     * @returns {Boolean} exists Whether the client is in this room.
     */
    exists: (client) ->
        for _client in @clients
            if client is _client
                return true
        return false

    /**
     * Broadcasts an event to all clients in this room.
     * @param {String} name Event name
     * @param {Object} data Event data
     */
    emit: (name, data) ->
        for client in @clients
            client.emit name, data

    /**
     * Removes all clients from room.
     */
    clear: ->
        @clients = []

module.exports = Room