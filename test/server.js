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

    // @TODO do other tests before this one

    it('should handle unprocessed middleware gracefully if client closes connection in the middle of them', function (done) {
      var server = new socketeer.Server()
      server.use(function (client, callback) {
        client.once('premature-close', function () {
          server.stop()
          done()
        })
        client.on('close', function () {
          callback()
        })
      })
      server.use(function () {
        done(new Error('middleware ran when it should not have'))
      })
      server.on('connection', function () {
        done(new Error('middleware is not running'))
      })
      server.start(port, function () {
        var client = new socketeer.Client('ws://localhost:' + port)
        client.on('open', function () {
          client.close()
        })
      })
    })

    // @TODO this test; be able to trigger an error
    // it('should gracefully handle errors before the connection event is emitted', function (done) {
    //   var server = new socketeer.Server()
    //   server.use(function (client, callback) {

    //   })
    // })
  })
})
