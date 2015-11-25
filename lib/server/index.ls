require! 'ws'
require! 'debug'
require! 'suspend'
require! 'events'
require! 'util'

require! './client-pool':ClientPool
require! './client':Client

require! './room-manager':RoomManager

EventEmitter = events.EventEmitter

class SocketeerServer extends EventEmitter
    (options={}) ->
        {
            @heartbeat-timeout = 15000
            @heartbeat-interval = 10000
        } = options
        @d = debug 'socketeer:SocketeerServer'
        @d 'constructing new instance'
        @room = new RoomManager!
        @pool = new ClientPool @
        @uses = []
        @data = {}

    /**
     * starts the server listening on port {port}
     * @param {Number} port Port to listen on
     * @param {Function} callback Optional callback. 
     *                            Refer to the `ws.Server`
     *                            documentation for more details.
     */
    start: (port, callback) ->
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
        @ws.on 'error', @~handle-error
        @ws.on 'headers', @~handle-headers
        @ws.on 'connection', @~handle-connection

    /**
     * @private
     * ws 'error' handler
     * @param {Object} err Error
     */
    handle-error: (err) ->
        @d "got 'error', #{util.inspect err}"
        @emit 'error', err

    /**
     * @private
     * ws 'headers' handler
     * @param {Object} headers Headers
     */
    handle-headers: (headers) ->
        @d "got 'headers', #{util.inspect headers}"
        @emit 'headers', headers

    /**
     * @private
     * ws 'connection' handler
     * @param {Object} connection Connection
     */
    handle-connection: suspend (connection) ->*
        /** @TODO connection pre-registration rejection messages */
        @d "got 'connection', creating client"
        client = new Client connection
        id = @pool.generate-id!
        client.set-id id
        @d "running #{@uses.length} middleware(s) on client"
        for use in @uses
            try
                rejection-message = yield use client, suspend.resume!
                if rejection-message
                    /** @TODO reject this connection with an error message */
                    client.kill!
            catch err
                @d "failed running a middleware on client: #{util.inspect err}"
                /** @TODO reject this connection with an error message */
                client.kill!
        @pool.add client, id
        client = @pool.get id
        @room._joinAll client
        @emit 'connection', client

    /**
     * Broadcasts an event to all connected clients
     * Alias to this.room.rooms['all'].emit
     * @param {String} name Event name
     * @param {Object} data Event data
     */
    broadcast: (name, data) ->
        @d "broadcasting: #{name}, #{data}"
        @room.get 'all'
            .emit name, data

    /**
     * Gets a room.
     * Alias to this.room.get
     * @param {String} name Room name
     */
    to: (name, create) ->
        return @room.get name, create

    /**
     * Adds a middleware to the server.
     * @param {Function} middleware Middleware
     */
    use: (middleware) ->
        @uses.push middleware

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