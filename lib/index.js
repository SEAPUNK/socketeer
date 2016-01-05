'use strict'

/** @namespace socketeer **/
const enums = require('./Enums')
/**
 * {@link SocketeerClient} class.
 * @member socketeer.Client
 */
exports.Client = require('./Client')
/**
 * {@link SocketeerServer} class.
 * @member socketeer.Server
 */
exports.Server = require('./Server')
/**
 * {@link ActionResponse} enum.
 * @member socketeer.ActionResponse
 */
exports.ActionResponse = enums.ActionResponse
