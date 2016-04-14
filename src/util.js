'use strict'

exports.validateSessionResumeToken = function (token) {
  // Note: If the session resume token does have a : in it during the handshake,
  // then it will cause session resuming to silently fail.
  if (
    typeof token !== 'string' ||
    token.length < 5 ||
    token.length > 200 ||
    token.indexOf(':') !== -1
  ) {
    return false
  }
  return true
}
