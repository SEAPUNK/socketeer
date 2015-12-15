/* global describe, it */
var socketeer = require('../index.js')
var expect = require('chai').expect

var Room = require('../lib/server/room').default

var port = 49999
var globalServer

describe('SocketeerServer', function () {
  describe('[construct]', function () {
    it('should construct without any arguments', function () {
      var server = new socketeer.Server()
      expect(server).to.be.an.instanceof(socketeer.Server)
    })

    it('should accept the heartbeatTimeout argument', function () {
      var server = new socketeer.Server({
        heartbeatTimeout: 200
      })
      expect(server.heartbeatTimeout).to.be.equal(200)
    })

    it('should accept the heartbeatInterval argument', function () {
      var server = new socketeer.Server({
        heartbeatInterval: 300
      })
      expect(server.heartbeatInterval).to.be.equal(300)
    })
  })

  describe('.start()', function () {
    it('should listen on the port we want it to', function (done) {
      globalServer = new socketeer.Server()
      globalServer.once('error', done)
      globalServer.start(port, function (err) {
        if (err) return done(err)
        var client = new socketeer.Client('ws://localhost:' + port)
        client.once('open', function () {
          globalServer.stop()
          done()
        })
        client.once('error', done)
      })
    })
  })

  describe('.stop()', function () {
    it('should stop the server properly', function (done) {
      // the server from .start() should not be running
      var client = new socketeer.Client('ws://localhost:' + port)
      client.once('error', function () {
        done()
      })
      client.once('open', function () {
        done(new Error('server did not seem to stop'))
      })
    })

    it('should allow the server to start again after it stopped', function (done) {
      globalServer.once('error', done)
      globalServer.start(port, function () {
        done()
      })
    })
  })

  describe('.broadcast()', function () {
    it('should broadcast message to all clients', function (done) {
      var clientsToConnect = []
      var clientsToAwait = []

      clientsToConnect.push(new socketeer.Client('ws://localhost:' + port))
      clientsToConnect.push(new socketeer.Client('ws://localhost:' + port))

      var startBroadcast = function () {
        clientsToAwait.forEach(function (e) {
          e.event('neat', checkEvent)
        })
        globalServer.broadcast('neat', 123)
      }

      var checkEvent = function (data) {
        if (data !== 123) {
          done(new Error('event did not have correct data'))
        }
        clientsToAwait.pop()
        if (!clientsToAwait.length) {
          done()
        }
      }

      var checkOpen = function () {
        clientsToAwait.push(clientsToConnect.pop())
        if (!clientsToConnect.length) {
          startBroadcast()
        }
      }

      clientsToConnect.forEach(function (e) {
        e.once('error', done)
        e.once('open', checkOpen)
      })
    })
  })

  describe('.to()', function () {
    it('should return a room', function () {
      var room = globalServer.to('all')
      expect(room).to.be.an.instanceof(Room)
    })

    it('should create the room if it does not exist', function () {
      var room = globalServer.to('create-test')
      expect(room).to.be.an.instanceof(Room)
    })

    it('should not create room if asked not to', function () {
      var room = globalServer.to('aklsdfjlaskdfjlkasjdf', false)
      expect(room).to.be.equal(undefined)
    })
  })

  // @TODO do other tests before this one

  describe('middle-of-handshake problems', function () {
    it('should gracefully handle unprocessed middleware if client closes connection in the middle of them', function (done) {
      this.timeout(10000)
      var closeConnection
      globalServer._uses = []
      globalServer.use(function (client, callback) {
        client.once('premature-close', function () {
          done()
        })
        client.once('close', function () {
          callback()
        })
        if (!closeConnection) {
          return done(new Error('closeConnection does not exist'))
        }
        closeConnection()
      })
      globalServer.use(function () {
        done(new Error('middleware ran when it should not have'))
      })
      globalServer.once('connection', function () {
        done(new Error('connection event was triggered'))
      })
      var client = new socketeer.Client('ws://localhost:' + port)
      client.once('error', done)
      closeConnection = function () {
        client.close()
      }
    })

    it('should gracefully handle errors before the connection event is emitted', function (done) {
      this.timeout(10000)
      globalServer._uses = []
      globalServer.use(function (client, callback) {
        client.once('premature-error', function (err) {
          if (err.message !== 'test') {
            done(err)
          }
          client.kill()
          done()
        })
        client._emit('error', new Error('test'))
      })
      globalServer.once('connection', function (connection) {
        done(new Error('connection event was triggered'))
      })
      var client = new socketeer.Client('ws://localhost:' + port)
      client.once('error', done)
    })
  })
})
