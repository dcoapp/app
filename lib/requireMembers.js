module.exports = function (requireForMembers, context) {
  // If members are required to sign-off, then always require sign-off
  if (requireForMembers) {
    return async () => true
  }

  // If repository belongs to an organization, check if user is a member
  if (context.payload.organization) {
    const members = {}

    return async (login) => {
      let member
      if (login in members) member = members[login]
      else {
        // https://docs.github.com/en/rest/reference/orgs#check-organization-membership-for-a-user
        member = await context.octokit.orgs
          .checkMembershipForUser({
            org: context.payload.organization.login,
            username: login
          })
          .catch((err) => {
            /* istanbul ignore next - unexpected error */
            if (err.status !== 404) throw err
            return false
          })
        members[login] = member
      }

      return !member
    }
  }

  // If repository does not belong to an organization, check if user is the owner of the repository
  const owner = context.payload.repository.owner.login
  return async (login) => {
    return login !== owner
  }
}
