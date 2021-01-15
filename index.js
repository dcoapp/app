const getDCOStatus = require('./lib/dco.js')
const requireMembers = require('./lib/requireMembers.js')

/**
 * @param { {app: import('probot').Probot}} app
 */
module.exports = ({ app }) => {
  app.on(
    [
      'pull_request.opened',
      'pull_request.synchronize',
      'check_run.rerequested'
    ],
    check
  )

  async function check (context) {
    const timeStart = new Date()

    const config = await context.config('dco.yml', {
      require: {
        members: true
      },
      allowRemediationCommits: {
        individual: false,
        thirdParty: false
      }
    })
    const requireForMembers = config.require.members
    const allowRemediationCommits = config.allowRemediationCommits

    const pr = context.payload.pull_request

    const compare = await context.octokit.repos.compareCommits(
      context.repo({
        base: pr.base.sha,
        head: pr.head.sha
      })
    )

    const commits = compare.data.commits
    const dcoFailed = await getDCOStatus(
      commits,
      requireMembers(requireForMembers, context),
      context.payload.pull_request.html_url,
      allowRemediationCommits
    )

    if (!dcoFailed.length) {
      await context.octokit.checks
        .create(
          context.repo({
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
          })
        )
        .catch(function checkFails (error) {
          if (error.status === 403) {
            context.log.info(
              'resource not accessible, creating status instead'
            )
            // create status
            const params = {
              sha: pr.head.sha,
              context: 'DCO',
              state: 'success',
              description: 'All commits are signed off!',
              target_url: 'https://github.com/probot/dco#how-it-works'
            }
            return context.octokit.repos.createCommitStatus(
              context.repo(params)
            )
          }

          throw error
        })
    } else {
      let summary = []
      dcoFailed.forEach(function (commit) {
        summary.push(
          `Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${
            commit.author
          }, Committer: ${commit.committer}; ${commit.message}`
        )
      })
      summary = summary.join('\n')

      summary = handleCommits(pr, commits.length, dcoFailed, allowRemediationCommits) + `\n\n### Summary\n\n${summary}`

      await context.octokit.checks
        .create(
          context.repo({
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
            actions: [
              {
                label: 'Set DCO to pass',
                description: 'would set status to passing',
                identifier: 'override'
              }
            ]
          })
        )
        .catch(function checkFails (error) {
          if (error.status === 403) {
            context.log.info(
              'resource not accessible, creating status instead'
            )
            // create status
            const description = dcoFailed[
              dcoFailed.length - 1
            ].message.substring(0, 140)
            const params = {
              sha: pr.head.sha,
              context: 'DCO',
              state: 'failure',
              description,
              target_url: 'https://github.com/probot/dco#how-it-works'
            }
            return context.octokit.repos.createCommitStatus(
              context.repo(params)
            )
          }

          throw error
        })
    }
  }

  // This option is only presented to users with Write Access to the repo
  app.on('check_run.requested_action', setStatusPass)
  async function setStatusPass (context) {
    const timeStart = new Date()

    await context.octokit.checks.create(
      context.repo({
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
      })
    )
  }
}

function handleCommits (pr, commitLength, dcoFailed, allowRemediationCommits) {

  let returnMessage = ''

  if (dcoFailed.length == 1) {
    returnMessage = `There is one commit incorrectly signed off.  This means that the author of this commit failed to include a Signed-off-by line in the commit message.\n\n`
  } else {
    returnMessage = `There are ${dcoFailed.length} commits incorrectly signed off.  This means that the author(s) of these commits failed to include a Signed-off-by line in their commit message.\n\n`
  }

  returnMessage = returnMessage + `To avoid having PRs blocked in the future, always include \`Signed-off-by: Author Name <authoremail@example.com>\` in *every* commit message. You can also do this automatically by using the -s flag (i.e., \`git commit -s\`).

Here is how to fix the problem so that this code can be merged.\n\n`

  returnMessage = returnMessage + `\n---\n\n### Rebase the branch

If you have a local git environment and meet the criteria below, one option is to rebase the branch and add your Signed-off-by lines in the new commits.  Please note that if others have already begun work based upon the commits in this branch, this solution will rewrite history and may cause serious issues for collaborators ([described in the git documentation](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) under "The Perils of Rebasing").

You should only do this if:

* You are the only author of the commits in this branch
* You are absolutely certain nobody else is doing any work based upon this branch
* There are no empty commits in the branch (for example, a DCO Remediation Commit which was added using \`--allow-empty\`)

To add your Signed-off-by line to every commit in this branch:

1. Ensure you have a local copy of your branch by [checking out the pull request locally via command line](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/checking-out-pull-requests-locally).
1. In your local branch, run: \`git rebase HEAD~${commitLength} --signoff\`
1. Force push your changes to overwrite the branch: \`git push --force-with-lease origin ${pr.head.ref}\`\n\n---\n\n`

  return returnMessage
}