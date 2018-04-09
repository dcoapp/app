const getDCOStatus = require('../lib/dco.js')

const success = JSON.stringify({
  state: 'success',
  description: 'All commits have a DCO sign-off from the author',
  target_url: 'https://github.com/probot/dco#how-it-works'
})
const alwaysRequireSignoff = async () => true
const dontRequireSignoffFor = (allowedLogin) => async (login) => { return login !== allowedLogin }

describe('dco', () => {
  test('returns true if message contains signoff', async () => {
    const commit = {
      message: 'Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: []}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  test('returns true for merge commit', async () => {
    const commit = {
      message: 'mergin stuff',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: [1, 2]}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  test('returns error message if message does not have signoff', async () => {
    const commit = {
      message: 'yolo',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: []}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'The sign-off is missing.',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  test(
    'returns error message if the signoff does not match the author',
    async () => {
      const commit = {
        message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'hiimbex',
          email: 'bex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>".',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test(
    'returns error message if the signoff does not match the email',
    async () => {
      const commit = {
        message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'bex',
          email: 'hiimbex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>".',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test(
    'returns error message if the signoff does not match the author or email',
    async () => {
      const commit = {
        message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test(
    'returns error message if the first commit has no sign off but the second commit has a sign off',
    async () => {
      const commitA = {
        message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        }
      }
      const commitB = {
        message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: []}, {commit: commitB, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test(
    'returns error message if the first commit has a sign off but the second commit does not have a sign off',
    async () => {
      const commitA = {
        message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        }
      }
      const commitB = {
        message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: []}, {commit: commitB, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test('returns success if all commits have sign off', async () => {
    const commitA = {
      message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const commitB = {
      message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: []}, {commit: commitB, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  test(
    'returns a 140 character description if the message is more than 140 characters',
    async () => {
      const commit = {
        message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'bex is the best name ever and is also very long',
          email: 'bexMyVeryLongAlsoButImportantEmail@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Expected "bex is the best name ever and is also very long <bexMyVeryLongAlsoButImportantEmail@disney.com>", but got "hiimbex <hiimbex@disney',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )

  test(
    'returns success when casing in sign of message is different',
    async () => {
      const commit = {
        message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'hiimbex',
          email: 'hiimbex@disney.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

      expect(JSON.stringify(dcoObject)).toBe(success)
    }
  )

  test('returns failure when email is invalid', async () => {
    const commit = {
      message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex@bexo>',
      author: {
        name: 'hiimbex',
        email: 'hiimbex@bexo'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: []}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
      state: 'failure',
      description: 'hiimbex@bexo is not a valid email address.',
      target_url: 'https://github.com/probot/dco#how-it-works'
    }))
  })

  test('returns success when committer is bot', async () => {
    const commit = {
      message: 'I aM rObOt I dO wHaT i PlEaSe.',
      author: {
        name: 'bexobot [bot]',
        email: 'wut'
      }
    }
    const author = {
      login: 'bexobot [bot]',
      type: 'Bot'
    }
    const dcoObject = await getDCOStatus([{commit, author, parents: []}], alwaysRequireSignoff)

    expect(JSON.stringify(dcoObject)).toBe(success)
  })

  test(
    'returns success if verified commit without sign off is from org member',
    async () => {
      const commit = {
        message: 'yolo',
        author: {
          name: 'Lorant Pinter',
          email: 'lorant.pinter@gmail.com'
        },
        verification: {
          verified: true
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'lptr' }, parents: []}], dontRequireSignoffFor('lptr'))

      expect(JSON.stringify(dcoObject)).toBe(success)
    }
  )

  test(
    'returns failure if unverified commit without sign off is from org member',
    async () => {
      const commit = {
        message: 'yolo',
        author: {
          name: 'Lorant Pinter',
          email: 'lorant.pinter@gmail.com'
        },
        verification: {
          verified: false
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'lptr' }, parents: []}], dontRequireSignoffFor('lptr'))

      expect(JSON.stringify(dcoObject)).toBe(JSON.stringify({
        state: 'failure',
        description: 'Commit by organization member is not verified.',
        target_url: 'https://github.com/probot/dco#how-it-works'
      }))
    }
  )
})
