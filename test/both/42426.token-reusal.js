import test from 'ava'
import {Server, Client} from '../../'

const PORT = 42426

test('server should not accept an already used session resume token', (t) => {
  return new Promise(async function (resolve, reject) {
    const server = new Server({
      supportsResuming: true,
      failless: false
    })
    let client

    await server.listen(PORT)

    server.on('connection', (sclient) => {
      sclient.action('store', async function (thing) {
        sclient.data.thing = thing
      })
      sclient.action('get', async function () {
        return sclient.data.thing
      })
    })

    let closedOnce = false
    let clientOldToken

    client = new Client(`ws://127.0.0.1:${PORT}/`, {failless: false})

    client.on('close', async function () {
      if (closedOnce) {
        if (await client.resume()) {
          return reject(new Error('reused token successfully'))
        } else {
          return resolve()
        }
      } else {
        if (!await client.resume()) {
          return reject(new Error('could not resume session'))
        }
      }
      client._resumeToken = clientOldToken
      closedOnce = true
      client.close()
    })

    client.once('open', async function () {
      clientOldToken = client._resumeToken
      await client.request('store', 123)
      client.close()
    })
  })
})
