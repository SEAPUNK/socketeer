class Client
    (@ws) ->

    /**
     * Registers the client to the Socketeer manager.
     * Must be called before anything else is done with the client.
     * @param {String} id Client ID
     * @param {ClientPool} pool Socketeer ClientPool
     */
    register: (@id, @pool) ->
    
    

module.exports = Client