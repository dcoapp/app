const validator = require('email-validator')

// Returns the DCO object containing state and description
// Also returns target_url (in case of failure) in object
module.exports = function (commits) {
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
  }
  let signedOff = true

  commits.forEach(comm => {
    const {commit, parents} = comm
    const isMerge = parents && parents.length > 1
    const regex = /^Signed-off-by: (.*) <(.*)>$/im
    let match

    if (!isMerge) {
      if ((match = regex.exec(commit.message)) === null) {
        signedOff = false
        defaults.failure.description = `The sign-off is missing.`
      } else {
        if (!validator.validate(commit.author.email)) {
          signedOff = false
          defaults.failure.description = `${commit.author.email} is not a valid email address.`
        }
        match = regex.exec(commit.message)
        if (commit.author.name !== match[1] || commit.author.email !== match[2]) {
          signedOff = false
          defaults.failure.description = `Expected "${commit.author.name} <${commit.author.email}>", but got "${match[1]} <${match[2]}>" `
        }
      }
    }
  })
  if (signedOff) {
    return defaults.success
  } else {
    defaults.failure.description = defaults.failure.description.substring(0, 140)
    return defaults.failure
  }
}
