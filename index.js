const getDCOStatus = require('./lib/dco.js')

const createRequireFunction = (requireForMembers, context) => {
  // If members are required to sign-off, then always require sign-off
  if (requireForMembers) {
    return async () => true
  }

  // If repository belongs to an organization, check if user is a member
  if (context.payload.organization) {
    const members = {}
    const organization = context.payload.organization.login

    return async (login) => {
      let member
      if (members.hasOwnProperty(login)) {
        member = members[login]
      } else {
        member = await context.github.orgs.checkMembership({
          org: organization,
          username: login
        }).catch(err => {
          if (err.code !== 404) {
            throw err
          }
          return false
        })
        members[login] = member
      }

      // Sign-off is required for non-members only
      return !member
    }
  }

  // If repository does not belong to an organization, check if user is the owner of the repository
  const owner = context.payload.repository.owner.login
  return async (login) => {
    return login !== owner
  }
}

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

    const dcoParams = await getDCOStatus(compare.data.commits, createRequireFunction(requireForMembers, context))

    if (!dcoParams.state == 'failure') {
      // Find previous comment from app to update
      let comment = await findComment(context);
      const template = renderFailures(dcoParams);

      if(comment) {
        // Update the existing comment to reflect any new errors
        await context.github.issues.updateComment(context.issue({
          id: comment.data.id,
          body: template
        }))
      } else {
        // Create a comment to show the errors and how to fix them
        comment = await context.github.issues.createComment(context.issue({
          body: template
        }))
      }

      // Set the status url to the url of the comment
      dcoParams.target_url = comment.data.html_url
    }

    const params = Object.assign({
      sha: pr.head.sha,
      context: 'DCO'
    }, dcoParams)

    return context.github.repos.createStatus(context.repo(params))
  }
}
