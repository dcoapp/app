const getDCOStatus = require('./lib/dco.js')
const requireMembers = require('./lib/requireMembers.js')

module.exports = robot => {
  robot.on(['pull_request.opened', 'pull_request.synchronize'], check)

  async function check (context) {
    const config = await context.config('dco.yml', {
      require: {
        members: true
      }
    })
    const requireForMembers = config.require.members

    const pr = context.payload.pull_request

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }))

    const dcoParams = await getDCOStatus(compare.data.commits, requireMembers(requireForMembers, context))

    const params = Object.assign({
      sha: pr.head.sha,
      context: 'DCO'
    }, dcoParams)

    return context.github.repos.createStatus(context.repo(params))
  }
}
