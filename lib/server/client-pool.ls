require! 'uuid'

class ClientPool
    /**
     * Constructs the client pool.
     * @param {RoomManager} roomManager Socketeer room manager
     */
    (@manager) ->
        @roomManager = @manager.room

    pool: {}
    
    /**
     * Adds a client to the pool
     * @param {Client} client Socketeer client
     * @returns {String} id Client ID
     */
    add: (client) ->
        while true
            id = uuid.v4!
            break if not @pool[id]
        client.register id, @, @room-manager
        @pool[id] = client
        return id

    /**
     * Gets the client from the pool by id
     * @param {String} id Client ID
     * @returns {Client} Socketeer client
     */
    get: (id) ->
        return @pool[id]

    /**
     * Runs a function on all clients in the pool
     * @param {Function} func Function to use on each client
     */
    forEach: (func) ->
        for client of @pool
            func client

    /**
     * Removes a client from the pool
     * @type {String} id Client ID
     */
    remove: (id) ->
        delete @pool[id]

    /**
     * Clears the pool.
     */
    clear: ->
        @pool = {}

module.exports = ClientPool