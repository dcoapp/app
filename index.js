const getDCOStatus = require('./lib/dco.js')
const requireMembers = require('./lib/requireMembers.js')
var enablePass = true

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.synchronize', 'check_run.rerequested'], check)

  async function check (context) {
    const timeStart = new Date()

    const config = await context.config('dco.yml', {
      require: {
        members: true
      },
      enable_pass: true
    })
    const requireForMembers = config.require.members
    var enablePass = config.enable_pass

    const pr = context.payload.pull_request

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }))

    const commits = compare.data.commits
    const dcoFailed = await getDCOStatus(commits, requireMembers(requireForMembers, context), context.payload.pull_request.html_url)

    if (!dcoFailed.length) {
      context.github.checks.create(context.repo({
        name: 'DCO',
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
        status: 'completed',
        started_at: timeStart,
        conclusion: 'success',
        completed_at: new Date(),
        output: {
          title: 'DCO',
          summary: 'All commits are signed off!'
        }
      }))
        .catch(function checkFails (error) {
          if (error.code === 403) {
            console.log('resource not accessible, creating status instead')
            // create status
            const params = {
              sha: pr.head.sha,
              context: 'DCO',
              state: 'success',
              description: 'All commits are signed off!',
              target_url: 'https://github.com/probot/dco#how-it-works'
            }
            return context.github.repos.createStatus(context.repo(params))
          }
        })
    } else {
      let summary = []
      dcoFailed.forEach(function (commit) {
        summary.push(`Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${commit.author}, Committer: ${commit.committer}; ${commit.message}`)
      })
      summary = summary.join('\n')
      if (dcoFailed.length === 1) summary = handleOneCommit(pr, dcoFailed) + `\n\n${summary}`
      else summary = handleMultipleCommits(pr, commits.length, dcoFailed) + `\n\n${summary}`

      if ( config.enable_pass ) {
        context.github.checks.create(context.repo({
          name: 'DCO',
          head_branch: pr.head.ref,
          head_sha: pr.head.sha,
          status: 'completed',
          started_at: timeStart,
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
          .catch(function checkFails (error) {
            if (error.code === 403) {
              console.log('resource not accessible, creating status instead')
              // create status
              const description = dcoFailed[(dcoFailed.length - 1)].message.substring(0, 140)
              const params = {
                sha: pr.head.sha,
                context: 'DCO',
                state: 'failure',
                description,
                target_url: 'https://github.com/probot/dco#how-it-works'
              }
              return context.github.repos.createStatus(context.repo(params))
            }
          })
      }
      else {
        context.github.checks.create(context.repo({
          name: 'DCO',
          head_branch: pr.head.ref,
          head_sha: pr.head.sha,
          status: 'completed',
          started_at: timeStart,
          conclusion: 'action_required',
          completed_at: new Date(),
          output: {
            title: 'DCO',
            summary
          }
        }))
          .catch(function checkFails (error) {
            if (error.code === 403) {
              console.log('resource not accessible, creating status instead')
              // create status
              const description = dcoFailed[(dcoFailed.length - 1)].message.substring(0, 140)
              const params = {
                sha: pr.head.sha,
                context: 'DCO',
                state: 'failure',
                description,
                target_url: 'https://github.com/probot/dco#how-it-works'
              }
              return context.github.repos.createStatus(context.repo(params))
            }
          })
      }

    }
  }

  // This option is only presented to users with Write Access to the repo and config.enable_pass set to true
  if ( enablePass ) {
    app.on('check_run.requested_action', setStatusPass)
    async function setStatusPass (context) {
      const timeStart = new Date()

      return context.github.checks.create(context.repo({
        name: 'DCO',
        head_branch: context.payload.check_run.check_suite.head_branch,
        head_sha: context.payload.check_run.head_sha,
        status: 'completed',
        started_at: timeStart,
        conclusion: 'success',
        completed_at: new Date(),
        output: {
          title: 'DCO',
          summary: 'Commit sign-off was manually approved.'
        }
      }))
    }
  }
}

function handleOneCommit (pr, dcoFailed) {
  return `You only have one commit incorrectly signed off! To fix, head to your local branch and run: \n\`\`\`bash\ngit commit --amend --signoff\n\`\`\`\nNow your commits will have your sign off. Next run \n\`\`\`bash\ngit push --force-with-lease origin ${pr.head.ref}\n\`\`\``
}

function handleMultipleCommits (pr, commitLength, dcoFailed) {
  return `You have ${dcoFailed.length} commits incorrectly signed off. To fix, head to your local branch and run: \n\`\`\`bash\ngit rebase HEAD~${commitLength} --signoff\n\`\`\`\n Now your commits will have your sign off. Next run \n\`\`\`bash\ngit push --force-with-lease origin ${pr.head.ref}\n\`\`\``
}

function loadConfigGlobal() {

}
