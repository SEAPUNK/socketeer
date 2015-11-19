require! 'ws'
require! 'debug'
require! 'suspend'
require! 'events'

require! './client-pool':ClientPool
require! './client':Client

require! './room-manager':RoomManager
require! './room':Room

EventEmitter = events.EventEmitter

class SocketeerServer extends EventEmitter
    ->
        @d = debug 'socketeer:server'
        @d 'constructing new instance'
    
    /**
     * keeps track of all rooms
     * @type {RoomManager}
     */
    room: new RoomManager!
    
    /**
     * keeps track of all clients
     * @type {ClientPool}
     */
    pool: new ClientPool @room


    /**
     * starts the server listening on port {port}
     * @param {Number} port Port to listen on
     * @param {Function} callback Optional callback. 
     *                            Refer to the `ws.Server`
     *                            documentation for more details.
     */
    start: (port, callback)
        if @ws
            throw new Error "server has already started"
        @d "starting server on port #{port}"
        
        opts =
            port: port
            # we aren't going to use deprecated protocols
            disableHixie: true
            /**
             * @TODO determine if this is a security problem
             *     over HTTPS if we left this to true
             */
            perMessageDeflate: false
        
        @ws = new ws.Server opts, callback
        @ws.on 'error', @handle-error

    /**
     * ws 'error' handler
     * @param {Object} err Error
     */
    handle-error: (err) ->
        @d "got 'error', #{util.inspect err}"
        @emit 'error', err

    /**
     * ws 'headers' handler
     * @param {Object} headers Headers
     */
    handle-headers: (headers) ->
        @d "got 'headers', #{util.inspect headers}"
        @emit 'headers', headers

    /**
     * ws 'connection' handler
     * @param {Object} connection Connection
     */
    handle-connection: (connection) ->
        @d "got 'connection', creating client"
        id = @pool.add new Client connection
        client = @pool.get id
        @room.add 'all', client
        @emit 'connection', client

    /**
     * Stops the server, closing all connections, and clearing the pool.
     */
    stop: ->
        @d 'stopping server'
        return if not @ws
        @pool.clear!
        @room.clear!
        @ws.close!
        @ws = null

module.exports = SocketeerServer