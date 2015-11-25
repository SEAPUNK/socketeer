require! 'uuid'
require! 'debug'

class ClientPool
    /**
     * Constructs the client pool.
     * @param {RoomManager} roomManager Socketeer room manager
     */
    (@manager) ->
        @d = debug 'socketeer:ClientPool'
        @d "constructing new instance"
        @roomManager = @manager.room
        @pool = {}
    
    /**
     * Adds a client to the pool
     * @param {Client} client Socketeer client
     * @returns {String} id Client ID
     */
    add: (client) ->
        @d "adding client to pool"
        while true
            id = uuid.v4!
            break if not @pool[id]
        @d "generated client pool id: #{id}"
        client.register id, @, @room-manager
        @pool[id] = client
        return id

    /**
     * Gets the client from the pool by id
     * @param {String} id Client ID
     * @returns {Client} Socketeer client
     */
    get: (id) ->
        @d "getting client with id #{id}"
        return @pool[id]

    /**
     * Runs a function on all clients in the pool
     * @param {Function} func Function to use on each client
     */
    forEach: (func) ->
        @d "running a foreach function on pool"
        for client of @pool
            func client

    /**
     * Removes a client from the pool
     * @type {String} id Client ID
     */
    remove: (id) ->
        @d "removing client with id #{id} from pool"
        delete @pool[id]

    /**
     * Clears the pool.
     */
    clear: ->
        @d "clearing pool"
        @pool = {}

module.exports = ClientPool