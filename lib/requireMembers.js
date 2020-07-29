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
      if (members.hasOwnProperty(login)) member = members[login]
      else {
        member = await context.github.orgs.checkMembershipForUser({
          org: context.payload.organization.login,
          username: login
        }).catch(err => {
          if (err.code !== 404) throw err
          return false
        })
        members[login] = member
      }
      // Sign-off is required for non-members only
      return !member
    }
  }

  // If repository does not belong to an organization, check if user is the owner of the repository
  const owner = context.payload.repository.owner.login
  return async (login) => {
    return login !== owner
  }
}
