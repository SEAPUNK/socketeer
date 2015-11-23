require! './room':Room
require! 'debug'

class RoomManager
    ->
        @d = debug 'socketeer:RoomManager'
        @d "constructing new instance"
        @rooms = {}
        @rooms['all'] = new Room 'all'

    /**
     * Creates a room
     * @param {String} name Room name to use
     * @returns {Boolean} created Whether the room was created.
     *                            Value is 'false' if the room already exists.
     */
    create: (name) ->
        @d "creating room with name #{name}"
        if name is 'all'
            throw new Error "cannot create room 'all': reserved room name"
        return false if @rooms[name]
        @d "room doesn't exist, constructing"
        @rooms[name] = new Room name
        return true

    /**
     * Gets a room.
     * @param {String} name Room name
     * @param {Boolean=true} create Whether to create the room if it doesn't exist
     * @returns {Room} room Socketeer room
     */
    get: (name, create=true) ->
        @d "getting room #{name} | create: #{create}"
        @create name if create
        return @rooms[name]

    /**
     * Adds a client to a room. Room is created if it doesn't exist.
     * @param {String} name Room name
     * @param {Client} client Socketeer client
     */
    join: (name, client) ->
        @d "joining client to room #{name}: #{client?.id}"
        if name is 'all'
            throw new Error "cannot add client to room 'all': reserved room"
        @create name
        @rooms[name].add client

    /**
     * @private
     * Adds client to "all" room.
     * @param {Client} client Socketeer client
     */
    _joinAll: (client) ->
        @d "joining client to 'all' room: #{client?.id}"
        @rooms['all'].add client

    /**
     * @private
     * Removes client from the "all" room.
     * @param {Client} client Socketeer client
     * @type {[type]}
     */
    _leaveAll: (client) ->
        @d "removing client from 'all' room: #{client?.id}"
        @rooms['all'].remove client

    /**
     * Removes client from room.
     * @param {String} name Room name
     * @param {Client} client Socketeer client
     * @returns {Boolean} removed Whether the client was removed from room.
     *                            False if room doesn't exist, or
     *                            if client wasn't in the room.
     */
    leave: (name, client) ->
        @d "removing client from room #{name}: #{client?.id}"
        if name is 'all'
            throw new Error "client cannot leave room 'all' until it's disconnected"
        return false if not @rooms[name]
        return @rooms[name].remove client

    /**
     * Removes a room.
     * @param {String} name Room name
     */
    remove: (name) ->
        @d "removing room #{name}"
        if name is 'all'
            throw new Error "cannot remove room 'all': reserved room name"
        return false if not @rooms[name]
        @rooms[name].clear!
        delete @rooms[name]

    /**
     * Deletes all rooms except for 'all',
     * and removes all clients from the 'all' room.
     */
    clear: ->
        @d "clearing rooms"
        for name, room of @rooms
            continue if name is 'all'
            room.clear!
            delete @rooms[name]
        @get 'all'
            .clear!

    /**
     * Removes client from all rooms.
     * @param {Client} client Socketeer client
     */
    removeAll: (client) ->
        @d "removing client from all rooms except 'all'"
        for name, room of @rooms
            continue if name is 'all'
            room.remove client

module.exports = RoomManager