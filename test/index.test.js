const nock = require('nock')
const { Probot, ProbotOctokitCore } = require('probot')

const dco = require('..')

const payload = require('./fixtures/pull_request.opened')
const payloadSuccess = require('./fixtures/pull_request.opened-success')
const compare = require('./fixtures/compare')
const compareSuccess = require('./fixtures/compare-success')

nock.disableNetConnect()

describe('dco', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({
      id: 1,
      githubToken: 'test',
      Octokit: ProbotOctokitCore
    })
    probot.load(dco)
  })

  test('creates a failing check', async () => {
    const mock = nock('https://api.github.com')
      .get('/repos/robotland/test/contents/.github%2Fdco.yml')
      .reply(404)
      .get('/repos/robotland/.github/contents/.github%2Fdco.yml')
      .reply(404)

      .get('/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94')
      .reply(200, compare)

      .post('/repos/robotland/test/check-runs', (body) => {
        body.started_at = '2018-07-14T18:18:54.156Z'
        body.completed_at = '2018-07-14T18:18:54.156Z'
        expect(body).toMatchSnapshot()
        return true
      })
      .reply(200)

    await probot.receive({ name: 'pull_request', payload })

    expect(mock.activeMocks()).toStrictEqual([])
  })

  test('creates a passing check', async () => {
    const mock = nock('https://api.github.com')
      // no config
      .get('/repos/octocat/Hello-World/contents/.github%2Fdco.yml')
      .reply(404)
      .get('/repos/octocat/.github/contents/.github%2Fdco.yml')
      .reply(404)

      .get('/repos/octocat/Hello-World/compare/a10867b14bb761a232cd80139fbd4c0d33264240...34c5c7793cb3b279e22454cb6750c80560547b3a')
      .reply(200, compareSuccess)

      .post('/repos/octocat/Hello-World/check-runs', (body) => {
        body.started_at = '2018-07-14T18:18:54.156Z'
        body.completed_at = '2018-07-14T18:18:54.156Z'
        expect(body).toMatchSnapshot()

        return true
      })
      .reply(200)

    await probot.receive({ name: 'pull_request', payload: payloadSuccess })

    expect(mock.activeMocks()).toStrictEqual([])
  })

  test('creates a passing status if app has no access to checks', async () => {
    const mock = nock('https://api.github.com')
      .get('/repos/octocat/Hello-World/contents/.github%2Fdco.yml')
      .reply(404)
      .get('/repos/octocat/.github/contents/.github%2Fdco.yml')
      .reply(404)

      .get('/repos/octocat/Hello-World/compare/a10867b14bb761a232cd80139fbd4c0d33264240...34c5c7793cb3b279e22454cb6750c80560547b3a')
      .reply(200, compareSuccess)

      .post('/repos/octocat/Hello-World/check-runs')
      .reply(403)

      .post('/repos/octocat/Hello-World/statuses/34c5c7793cb3b279e22454cb6750c80560547b3a', body => {
        expect(body).toMatchSnapshot()

        return true
      })
      .reply(201)

    await probot.receive({ name: 'pull_request', payload: payloadSuccess })

    expect(mock.activeMocks()).toStrictEqual([])
  })

  test('creates a error status if app has no access to checks', async () => {
    const mock = nock('https://api.github.com')
      .get('/repos/robotland/test/contents/.github%2Fdco.yml')
      .reply(404)
      .get('/repos/robotland/.github/contents/.github%2Fdco.yml')
      .reply(404)

      .get('/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94')
      .reply(200, compare)

      .post('/repos/robotland/test/check-runs')
      .reply(403)

      .post('/repos/robotland/test/statuses/e76ed6025cec8879c75454a6efd6081d46de4c94', body => {
        expect(body).toMatchSnapshot()

        return true
      })
      .reply(201)

    await probot.receive({ name: 'pull_request', payload })

    expect(mock.activeMocks()).toStrictEqual([])
  })
})
