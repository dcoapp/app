const dco = require('./lib/dco');

module.exports = robot => {
  robot.on('push', async (event, context) => {
    const github = await robot.auth(event.payload.installation.id);

    return event.payload.commits.map(commit => {
      const signedOff = dco(commit);
      return github.repos.createStatus(context.repo({
        sha: commit.id,
        state: signedOff ? 'success' : 'failure',
        target_url: 'https://developercertificate.org/',
        context: 'DCO/commit',
        description: 'git commit --signoff'
      }));
    });
  });

  robot.on('pull_request.opened', sync);
  robot.on('pull_request.synchronize', sync);

  async function sync(event, context) {
    const github = await robot.auth(event.payload.installation.id);
    const pr = event.payload.pull_request;

    const compare = await github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }));

    const signedOff = compare.commits.every(data => dco(data.commit));

    return github.repos.createStatus(context.repo({
      sha: pr.head.sha,
      state: signedOff ? 'success' : 'failure',
      target_url: 'https://developercertificate.org/',
      context: 'DCO/pr',
      description: 'git commit --signoff'
    }));
  }
};
