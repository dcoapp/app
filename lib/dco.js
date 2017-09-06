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

// Returns the DCO object containing state and dsecription
// Also returns target_url (in case of failure) in object
module.exports = function (commits) {
    let signedOff = true;
    commits.forEach(comm => {
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
    if (signedOff) {
        return defaults.success;
    } else {
        return defaults.failure;
    }
}