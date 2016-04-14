import test from 'ava'
import {Server, Client} from '../../'

const PORT = 42425

test('server and client should correctly pause and resume a session 10 times in a row', (t) => {
  return new Promise(async function (resolve, reject) {
    const server = new Server({
      supportsResuming: true,
      failless: false
    })
    let client

    await server.listen(PORT)

    server.on('error', (err) => reject(new Error('Server errored out: ' + err)))
    server.on('connectionSetupError', reject)
    server.on('connection', (sclient) => {
      sclient.action('store', async function (thing) {
        sclient.data.thing = thing
      })
      sclient.action('get', async function () {
        return sclient.data.thing
      })
    })

    let successfulTries = 0

    client = new Client(`ws://127.0.0.1:${PORT}/`, {failless: false})

    client.on('close', async function () {
      if (!await client.resume()) {
        return reject(new Error('could not resume session'))
      }

      const thing = await client.request('get', null)
      if (thing === 123) {
        successfulTries++
      } else {
        return reject(new Error('expected 123, but got ' + thing + ' instead'))
      }

      if (successfulTries === 10) {
        resolve()
      } else {
        client.close()
      }
    })

    client.once('open', async function () {
      await client.request('store', 123)
      client.close()
    })
  })
})
