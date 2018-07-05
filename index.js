const getDCOStatus = require('./lib/dco.js')
const requireMembers = require('./lib/requireMembers.js')

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.synchronize', 'check_run.rerequested'], check)

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

    const commits = compare.data.commits
    const dcoFailed = await getDCOStatus(commits, requireMembers(requireForMembers, context), context.issue())

    if (!dcoFailed.length) {
      return context.github.checks.create(context.repo({
        name: 'DCO',
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
        status: 'completed',
        conclusion: 'success',
        completed_at: new Date(),
        output: {
          title: 'DCO',
          summary: 'All commits are signed off!'
        }
      }))
    } else {
      let summary = []
      dcoFailed.forEach(function(commit) {
        summary.push(`Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${commit.author}, Committer: ${commit.committer}; ${commit.message}`)
      })
      summary = summary.join('\n')
      if (dcoFailed.length === 1) summary = handleOneCommit(pr, dcoFailed) + `\n\n${summary}`
      else summary = handleMultipleCommits(pr, commits.length, dcoFailed) + `\n\n${summary}`

      return context.github.checks.create(context.repo({
        name: 'DCO',
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
        status: 'completed',
        conclusion: 'action_required',
        completed_at: new Date(),
        output: {
          title: 'DCO',
          summary
        },
        actions: [{
          label: 'Set DCO to pass',
          description: 'would set status to passing',
          identifier: `override`
        }]
      }))
    }
  }

  // This option is only presented to users with Write Access to the repo
  app.on('check_run.requested_action', setStatusPass)
  async function setStatusPass (context) {
    return context.github.checks.create(context.repo({
      name: 'DCO',
      head_branch: context.payload.check_run.check_suite.head_branch,
      head_sha: context.payload.check_run.head_sha,
      status: 'completed',
      conclusion: 'success',
      completed_at: new Date(),
      output: {
        title: 'DCO',
        summary: 'Commit sign-off was manually approved.'
      }
    }))
  }
}

function handleOneCommit (pr, dcoFailed) {
  return `You only have one commit incorrectly signed off! To fix, head to your local branch and run: \n\`\`\`bash\ngit commit --amend --signoff\n\`\`\`\nNow your commits will have your sign off. Next run \n\`\`\`bash\ngit push --force origin ${pr.head.ref}\n\`\`\``
}

function handleMultipleCommits (pr, commitLength, dcoFailed) {
  return `You only have ${dcoFailed.length} commits incorrectly signed off! To fix, head to your local branch and run: \n\`\`\`bash\ngit rebase HEAD~${commitLength} --signoff\n\`\`\`\n Now your commits will have your sign off. Next run \n\`\`\`bash\ngit push --force origin ${pr.head.ref}\n\`\`\``
}
