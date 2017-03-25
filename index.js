const dco = require('./lib/dco');

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.synchronize', check);

  async function check(event, context) {
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
      context: 'DCO',
      description: 'git commit --signoff'
    }));
  }
};
