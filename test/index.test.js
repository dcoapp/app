const nock = require('nock')
const dco = require('..')
const { Probot } = require('probot')
const payload = require('./fixtures/pull_request.opened')
const compare = require('./fixtures/compare')

nock.disableNetConnect()

describe('dco', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(dco)

    // just return a test token
    app.app = () => 'test'
  })

  test('creates a failing status', async () => {
    nock('https://api.github.com')
      .post('/installations/13055/access_tokens')
      .reply(200, {token: 'test'})

    nock('https://api.github.com')
      .get('/repos/robotland/test/contents/.github/dco.yml')
      .reply(404)

    nock('https://api.github.com')
      .get('/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94')
      .reply(200, compare)

    // nock('https://api.github.com')
    //   .post('/repos/robotland/test/checks/e76ed6025cec8879c75454a6efd6081d46de4c94', (body) => {
    //     expect(body).toMatchObject({
    //       context: 'DCO',
    //       state: 'failure'
    //     })
    //     return true
    //   })
      //.reply(200)

    await probot.receive({event: 'pull_request', payload})
  })
})
