/* global describe, it */
var socketeer = require('../index.js')
var expect = require('chai').expect

describe('SocketeerServer', function () {
  describe('[construct]', function () {
    it('should construct without any arguments', function () {
      var server = new socketeer.Server()
      expect(server).to.be.an.instanceof(socketeer.Server)
    })
  })
})
