const getDCOStatus = require('./lib/dco.js')

module.exports = robot => {
  robot.on(['pull_request.opened', 'pull_request.synchronize'], check)

  async function check (context) {
    const pr = context.payload.pull_request

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }))

    const dcoParams = getDCOStatus(compare.data.commits)

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
