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
        @reserved = {}
    
    /**
     * Adds a client to the pool
     * @param {Client} client Socketeer client
     * @param {String} id ID to use
     * @returns {String} id Client ID
     */
    add: (client, id) ->
        @d "adding client to pool"
        if @pool[id]
            throw new Error "id #{id} is already in the pool (should never happen)"
        delete @reserved[id]
        client.register @
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
     * Generates (and reserves) an ID to use for the pool
     */
    generate-id: ->
        @d "generating and reserving a new id"
        while true
            id = uuid.v4!
            break if not @pool[id] and not @reserved[id]
        @reserved[id] = true
        @d "generated client pool id: #{id}"

    /**
     * Runs a function on all clients in the pool
     * @param {Function} func Function to use on each client
     */
    for-each: (func) ->
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