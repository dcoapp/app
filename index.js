const getDCOStatus = require('./lib/dco.js')

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
    const organization = context.payload.organization.login

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }))

    const members = {}

    const isOrgMember = async function (login) {
      if (members.hasOwnProperty(login)) {
        return members[login]
      }

      const result = await context.github.orgs.checkMembership({
        org: organization,
        username: login
      }).catch(err => {
        if (err.code !== 404) {
          throw err
        }
        return false
      })
      members[login] = result
      return result
    }

    const dcoParams = await getDCOStatus(compare.data.commits, requireForMembers
      ? async () => true
      : async (author) => {
        const member = await isOrgMember(author)
        return !member
      }
    )

    const params = Object.assign({
      sha: pr.head.sha,
      context: 'DCO'
    }, dcoParams)

    return context.github.repos.createStatus(context.repo(params))
  }
}
