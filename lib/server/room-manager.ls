require! './room':Room

class RoomManager
    ->
        @rooms['all'] = new Room 'all'

    rooms: {}

    /**
     * Creates a room
     * @param {String} name Room name to use
     * @returns {Boolean} created Whether the room was created.
     *                            Value is 'false' if the room already exists.
     */
    create: (name) ->
        if name is 'all'
            throw new Error "cannot create room 'all': reserved room name"
        return false if @rooms[name]
        rooms[name] = new Room name
        return true

    /**
     * Gets a room.
     * @param {String} name Room name
     * @returns {Room} room Socketeer room
     */
    get: (name) ->
        return rooms[name]

    /**
     * Adds a client to a room. Room is created if it doesn't exist.
     * @param {String} name Room name
     * @param {Client} client Socketeer client
     */
    join: (name, client) ->
        @create name
        @rooms[name].add client

    /**
     * Removes a room.
     * @param {String} name Room name
     */
    remove: (name) ->
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
        for room, name in @rooms
            continue if name is 'all'
            room.clear!
            delete @rooms[name]
        @get 'all'
            .clear!

module.exports = RoomManager