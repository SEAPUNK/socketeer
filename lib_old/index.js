'use strict'

/** @namespace socketeer **/
const enums = require('./common/enums')
/**
 * {@link SocketeerClient} class.
 * @member socketeer.Client
 */
exports.Client = require('./client')
/**
 * {@link SocketeerServer} class.
 * @member socketeer.Server
 */
exports.Server = require('./server')
/**
 * {@link ActionResponse} enum.
 * @member socketeer.ActionResponse
 */
exports.ActionResponse = enums.ActionResponse
