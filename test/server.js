/* global describe, it */
var socketeer = require('../index.js')
var expect = require('chai').expect

var port = 49999

describe('SocketeerServer', function () {
  describe('[construct]', function () {
    it('should construct without any arguments', function () {
      var server = new socketeer.Server()
      expect(server).to.be.an.instanceof(socketeer.Server)
    })
  })

  // @TODO do other tests before this one

  describe('middle-of-handshake problems', function () {
    it('should handle unprocessed middleware gracefully if client closes connection in the middle of them', function (done) {
      this.timeout(10000)
      var closeConnection
      var server = new socketeer.Server()
      server.use(function (client, callback) {
        client.once('premature-close', function () {
          server.stop()
          done()
        })
        client.on('close', function () {
          callback()
        })
        if (!closeConnection) {
          return done(new Error('closeConnection does not exist'))
        }
        closeConnection()
      })
      server.use(function () {
        done(new Error('middleware ran when it should not have'))
      })
      server.on('connection', function () {
        done(new Error('connection event was triggered'))
      })
      server.start(port, function () {
        var client = new socketeer.Client('ws://localhost:' + port)
        closeConnection = function () {
          client.close()
        }
      })
    })

    it('should gracefully handle errors before the connection event is emitted', function (done) {
      this.timeout(10000)
      var server = new socketeer.Server()
      server.use(function (client, callback) {
        client.once('premature-error', function (err) {
          if (err.message !== 'test') {
            done(err)
          }
          client.kill()
          server.stop()
          done()
        })
        client._emit('error', new Error('test'))
      })
      server.on('connection', function (connection) {
        done(new Error('connection event was triggered'))
      })
      server.start(port, function () {
        var client = new socketeer.Client('ws://localhost:' + port)
        client.on('open', function () {})
      })
    })
  })
})
