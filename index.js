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
    compare.data.commits.forEach(comm => {
      const {commit, parents} = comm;
      const isMerge = parents && parents.length > 1;
      const regex = /^Signed-off-by: (.*) <(.*)>$/m;
      let match;

      if (!isMerge) {
        if ((match = regex.exec(commit.message)) === null) {
          signedOff = false;
          if (!defaults.failure.description.includes(`The sign-off is missing.`)) {
            defaults.failure.description += `The sign-off is missing. `;
          }
        } else {
          match = regex.exec(commit.message);
          if (commit.author.name !== match[1] || commit.author.email !== match[2]) {
            signedOff = false;
            if (!defaults.failure.description.includes(`Expected`)) {
              defaults.failure.description += `Expected "${commit.author.name} <${commit.author.email}>", but got "${match[1]} <${match[2]}>" `;
            }
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
