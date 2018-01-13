const getDCOStatus = require('./lib/dco.js')

module.exports = robot => {
  robot.on(['pull_request.opened', 'pull_request.synchronize'], check)

  async function check (context) {
    const config = await context.config('dco.yml', {'require_signoff_for_members': true})
    const requireSignoffForMembers = config.require_signoff_for_members

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

      let result
      try {
        await context.github.orgs.checkMembership({
          org: organization,
          username: login
        })
        result = true
      } catch (err) {
        if (err.code === 404) {
          result = false
        } else {
          throw err
        }
      }
      members[login] = result
      return result
    }

    const dcoParams = await getDCOStatus(compare.data.commits, requireSignoffForMembers
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
