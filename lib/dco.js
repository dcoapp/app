const validator = require('email-validator')

// Returns a list containing failed commit error messages
// If commits aren't properly signed signed off
// Otherwise returns an empty list
module.exports = async function (commits, isRequiredFor, prInfo) {
  const regex = /^Signed-off-by: (.*) <(.*)>$/im
  let failed = []

  for (const {commit, author, parents, sha} of commits) {
    const isMerge = parents && parents.length > 1
    const signoffRequired = !author || await isRequiredFor(author.login)
    if (isMerge || (!signoffRequired && commit.verification.verified)) {
      continue
    } else if (!author || author.type === 'Bot') {
      continue
    }
    const match = regex.exec(commit.message)

    const commitInfo = {
      sha,
      url: `https://github.com/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.number}/commits/${sha}`,
      author: commit.author.name,
      committer: commit.committer.name,
      message: ''
    }

    if (match === null) {
      if (signoffRequired) {
        commitInfo['message'] = `The sign-off is missing.`
        failed.push(commitInfo)
      }
      if (!commit.verification.verified) {
        commitInfo['message'] = `Commit by organization member is not verified.`
        failed.push(commitInfo)
      }
    } else {
      if (!(validator.validate(commit.author.email || commit.committer.email))) {
        commitInfo['message'] = `${commit.author.email} is not a valid email address.`
        failed.push(commitInfo)
      }
      const authors = [commit.author.name.toLowerCase(), commit.committer.name.toLowerCase()]
      const emails = [commit.author.email.toLowerCase(), commit.committer.email.toLowerCase()]
      if (!(authors.includes(match[1].toLowerCase())) || !(emails.includes(match[2].toLowerCase()))) {
        commitInfo['message'] = `Expected "${commit.author.name} <${commit.author.email}>", but got "${match[1]} <${match[2]}>".`
        failed.push(commitInfo)
      }
    }
  }
  return failed
}
