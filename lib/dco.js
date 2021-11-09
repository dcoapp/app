const validator = require('email-validator')

// Returns a list containing failed commit error messages
// If commits aren't properly signed signed off
// Otherwise returns an empty list
module.exports = async function (commits, isRequiredFor, prURL, allowRemediationCommits) {
  const failed = []

  for (const { commit, author, parents, sha } of commits) {
    const isMerge = parents && parents.length > 1

    const signoffRequired = !author || await isRequiredFor(author.login)
    if (isMerge || (!signoffRequired && commit.verification.verified)) {
      continue
    } else if (author && author.type === 'Bot') {
      continue
    }

    const commitInfo = {
      sha,
      url: `${prURL}/commits/${sha}`,
      author: commit.author.name,
      email: commit.author.email,
      committer: commit.committer.name,
      message: ''
    }

    const signoffs = getSignoffs(commit, sha, commits, allowRemediationCommits)

    if (signoffs.length === 0) {
      // no signoffs found
      if (signoffRequired) {
        commitInfo.message = 'The sign-off is missing.'
        failed.push(commitInfo)
      } else {
        commitInfo.message = 'Commit by organization member is not verified.'
        failed.push(commitInfo)
      }

      continue
    }

    // Check to be sure the author and committer emails are actual valid email addresses
    const email = commit.author.email || commit.committer.email
    if (!(validator.validate(email))) {
      commitInfo.message = `${email} is not a valid email address.`
      failed.push(commitInfo)
      continue
    }

    const authors = [commit.author.name.toLowerCase(), commit.committer.name.toLowerCase()]
    const emails = [commit.author.email.toLowerCase(), commit.committer.email.toLowerCase()]
    if (signoffs.length === 1) {
      // commit contains one signoff
      const sig = signoffs[0]
      // if the signoff is an explicit match or an individual remediation, check if signoff name and email match the commit
      // if the signoff is from a third-party remediation and passed the tests in getSignoffs, it is valid
      if ((['explicit', 'individualRemediation'].includes(sig.type)) &&
        (!(authors.includes(sig.name.toLowerCase())) ||
        !(emails.includes(sig.email.toLowerCase())))) {
        commitInfo.message = `Expected "${commit.author.name} <${commit.author.email}>", but got "${sig.name} <${sig.email}>".`
        failed.push(commitInfo)
      }
    } else {
      // commit contains multiple signoffs
      // first, find explicit signoffs which match the author exactly
      const valid = signoffs.filter(
        signoff => authors.includes(signoff.name.toLowerCase()) && emails.includes(signoff.email.toLowerCase()) && (signoff.type === 'explicit')
      )
      // next, find individual remediations which match the author exactly
      const validIndividualRemediation = signoffs.filter(
        signoff => authors.includes(signoff.name.toLowerCase()) && emails.includes(signoff.email.toLowerCase()) && (signoff.type === 'individualRemediation')
      )
      // if the signoff is from a third-party remediation and passed the tests in getSignoffs, it is valid
      const validThirdPartyRemediation = signoffs.filter(
        signoff => signoff.type === 'thirdPartyRemediation')

      // fail if no signoffs of any type match author's name and email
      if ((valid.length === 0) && (validIndividualRemediation.length === 0) && (validThirdPartyRemediation.length === 0)) {
        const got = signoffs.map(sig => `"${sig.name} <${sig.email}>"`).join(', ')
        commitInfo.message = `Can not find "${commit.author.name} <${commit.author.email}>", in [${got}].`
        failed.push(commitInfo)
      }
    } // end if
  } // end for

  return failed.sort((a, b) => a.author.localeCompare(b.author))
}

function getSignoffs (comparisonCommit, comparisonSha, allCommits, allowRemediationCommits) {
  const regex = /^Signed-off-by: (.*) <(.*)>\s*$/img
  const matches = []
  let match
  while ((match = regex.exec(comparisonCommit.message)) !== null) {
    matches.push({
      name: match[1],
      email: match[2],
      type: 'explicit'
    })
  }

  if (allowRemediationCommits.individual) {
    // if individual remediation commits are allowed, look for one in the PR with a matching sha

    for (const { commit } of allCommits) {
      let remediationMatch

      // if individual commits are allowed, look for one in the PR with a matching sha
      const remediationRegexIndividual = /^I, (.*) <(.*)>, hereby add my Signed-off-by to this commit: (.*)\s*$/img
      while ((remediationMatch = remediationRegexIndividual.exec(commit.message)) !== null) {
        // make sure the commit author matches the author being Signed-off-by for
        if ((remediationMatch[3] === comparisonSha) &&
           (comparisonCommit.author.name.toLowerCase() === commit.author.name.toLowerCase()) &&
           (comparisonCommit.author.name.toLowerCase() === remediationMatch[1].toLowerCase()) &&
           (comparisonCommit.author.email.toLowerCase() === commit.author.email.toLowerCase()) &&
           (comparisonCommit.author.email.toLowerCase() === remediationMatch[2].toLowerCase())) {
          matches.push({
            name: remediationMatch[1],
            email: remediationMatch[2],
            type: 'individualRemediation'
          })
        } // end if
      } // end while

      if (allowRemediationCommits.thirdParty) {
        // if 3rd party commits are allowed, look for one in the PR with a matching sha
        const remediationRegexThirdParty = /^On behalf of (.*) <(.*)>, I, (.*) <(.*)>, hereby add my Signed-off-by to this commit: (.*)\s*$/img
        while ((remediationMatch = remediationRegexThirdParty.exec(commit.message)) !== null) {
          // make sure the commit author or committer matches the person claiming to do the third-party remediation, and that the signoff matches the original failing commit

          if ((remediationMatch[5] === comparisonSha) &&
             (comparisonCommit.author.name.toLowerCase() === remediationMatch[1].toLowerCase()) &&
             (comparisonCommit.author.email.toLowerCase() === remediationMatch[2].toLowerCase()) &&
             (((commit.author.name.toLowerCase() === remediationMatch[3].toLowerCase()) &&
             (commit.author.email.toLowerCase() === remediationMatch[4].toLowerCase())) ||
             ((commit.committer.name.toLowerCase() === remediationMatch[3].toLowerCase()) &&
             (commit.committer.email.toLowerCase() === remediationMatch[4].toLowerCase())))) {
            matches.push({
              name: remediationMatch[1],
              email: remediationMatch[2],
              type: 'thirdPartyRemediation'
            })
          } // end if
        } // end while
      } // end if
    } // end if
  } // end if

  return matches
}
