const dco = require('./lib/dco');

const defaults = {
  success: {
    state: 'success',
    description: 'All commits have a DCO sign-off from the author'
  },
  failure: {
    state: 'failure',
    description: '',
    target_url: 'https://github.com/probot/dco#how-it-works'
  }
};

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.synchronize', check);

  async function check(context) {
    const pr = context.payload.pull_request;

    const compare = await context.github.repos.compareCommits(context.repo({
      base: pr.base.sha,
      head: pr.head.sha
    }));

    let signedOff = true;
    compare.data.commits.forEach(commit => {
      const res = dco(commit);
      if (typeof res === 'string') {
        signedOff = false;
        if (!defaults.failure.description.includes(res)) {
          if (res.includes(`The sign-off is missing.`)) {
            defaults.failure.description += res;
          } else if (res.includes(`Expected`) && !defaults.failure.description.includes(`Expected`)) {
            // Prevents build up of several incorrect error messages
            // Only returns the first incorrect error message
            defaults.failure.description += res;
          }
        }
      }
    });

    const params = Object.assign({
      sha: pr.head.sha,
      context: 'DCO'
    }, signedOff ? defaults.success : defaults.failure);

    return context.github.repos.createStatus(context.repo(params));
  }
};
