const dco = require('./lib/dco');

const defaults = {
  success: {
    state: 'success',
    description: 'All commits have a DCO sign-off from the author'
  },
  failure: {
    state: 'failure',
    description: 'All commits must have a DCO sign-off from the author',
    target_url: 'https://developercertificate.org/'
  }
};

module.exports = robot => {
  robot.route('/dco').use(require('./lib/app')(robot));

  robot.on('pull_request.opened', check);
  robot.on('pull_request.synchronize', check);

  async function check(context) {
    const pr = context.payload.pull_request;

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }));

    const signedOff = compare.data.commits.every(dco);

    const params = Object.assign({
      sha: pr.head.sha,
      context: 'DCO'
    }, signedOff ? defaults.success : defaults.failure);

    return context.github.repos.createStatus(context.repo(params));
  }
};
