const nock = require('nock')
const dco = require('..')
const { Probot } = require('probot')
const payload = require('./fixtures/pull_request.opened')
const payloadSuccess = require('./fixtures/pull_request.opened-success')
const compare = require('./fixtures/compare')
const compareSuccess = require('./fixtures/compare.signed-off')
const checkRun = require('./fixtures/check_run.created')

nock.disableNetConnect()

describe('dco', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    const app = probot.load(dco)

    // just return a test token
    app.app = () => 'test'
  })

  test('creates a failing check', async () => {
    nock('https://api.github.com')
      .post('/installations/13055/access_tokens')
      .reply(200, {token: 'test'})

    nock('https://api.github.com')
      .get('/repos/robotland/test/contents/.github/dco.yml')
      .reply(404)

    nock('https://api.github.com')
      .get('/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94')
      .reply(200, compare)

    nock('https://api.github.com')
      .post('/repos/robotland/test/check-runs', (body) => {
        body.completed_at = '2018-07-13T04:42:27.417Z'
        expect(body).toMatchObject(checkRun)
        return true
      })
      .reply(200)

    await probot.receive({event: 'pull_request', payload})
  })

  test('creates a passing check', async () => {
    nock('https://api.github.com')
      .post('/installations/13055/access_tokens')
      .reply(200, {token: 'test'})

    nock('https://api.github.com')
      .get('/repos/octocat/Hello-World/contents/.github/dco.yml')
      .reply(404)

    nock('https://api.github.com')
      .get('/repos/octocat/Hello-World/compare/bbcd538c8e72b8c175046e27cc8f907076331401...octocat:0328041d1152db8ae77652d1618a02e57f745f17')
      .reply(200, compareSuccess)

    nock('https://api.github.com')
      .post('/repos/octocat/Hello-World/check-runs', (body) => {
        console.log(body)
        expect(body).toMatchObject(checkRun)
        return true
      })
      .reply(200)

    console.log(payloadSuccess.action)
    await probot.receive({event: 'pull_request', payloadSuccess})
  })
})
