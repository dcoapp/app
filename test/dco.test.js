const getDCOStatus = require('../lib/dco.js')

const success = []
const sha = '18aebfa67dde85da0f5099ad70ef647685a05205'
const alwaysRequireSignoff = async () => true
const dontRequireSignoffFor = (allowedLogin) => async (login) => { return login !== allowedLogin }
const prInfo = 'https://github.com/hiimbex/testing-things/pull/1'

describe('dco', () => {
  test('returns true if message contains signoff', async () => {
    const commit = {
      message: 'Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual(success)
  })

  test('returns true for merge commit', async () => {
    const commit = {
      message: 'mergin stuff',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: [1, 2], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual(success)
  })

  test('returns error message if message does not have signoff', async () => {
    const commit = {
      message: 'yolo',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'bkeepers' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual([{
      url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
      author: 'Brandon Keepers',
      committer: 'Bex Warner',
      message: 'The sign-off is missing.',
      sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
    }])
  })

  test(
    'returns error message if the signoff does not match the author',
    async () => {
      const commit = {
        message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'hiimbex',
          email: 'bex@disney.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'hiimbex',
        committer: 'Bex Warner',
        message: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>".',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
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
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'bex',
        committer: 'Bex Warner',
        message: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>".',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
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
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'bex',
        committer: 'Bex Warner',
        message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
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
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const commitB = {
        message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: [], sha}, {commit: commitB, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'bex',
        committer: 'Bex Warner',
        message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
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
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const commitB = {
        message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'bex',
          email: 'bex@disney.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: []}, {commit: commitB, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'bex',
        committer: 'Bex Warner',
        message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
    }
  )

  test('returns success if all commits have sign off', async () => {
    const commitA = {
      message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const commitB = {
      message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
      author: {
        name: 'bex',
        email: 'bex@disney.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit: commitA, author: { login: 'hiimbex' }, parents: []}, {commit: commitB, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual(success)
  })

  test(
    'returns success when casing in sign of message is different',
    async () => {
      const commit = {
        message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@disney.com>',
        author: {
          name: 'hiimbex',
          email: 'hiimbex@disney.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual(success)
    }
  )

  test('returns failure when email is invalid', async () => {
    const commit = {
      message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex@bexo>',
      author: {
        name: 'hiimbex',
        email: 'hiimbex@bexo'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual([{
      url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
      author: 'hiimbex',
      committer: 'Bex Warner',
      message: 'hiimbex@bexo is not a valid email address.',
      sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
    }])
  })

  test('returns success when email and name are differently cased (case-insensitivity)', async () => {
    const commit = {
      message: 'cAsInG iS fUn\n\nsigned-off-by: HiImBeXo <HiImBeX@bExO.cOm>',
      author: {
        name: 'hiimbexo',
        email: 'hiimbex@bexo.com'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual(success)
  })

  test('returns success when committer is bot', async () => {
    const commit = {
      message: 'I aM rObOt I dO wHaT i PlEaSe.',
      author: {
        name: 'bexobot [bot]',
        email: 'wut'
      },
      committer: {
        name: 'Bex Warner',
        email: 'bexmwarner@gmail.com'
      }
    }
    const author = {
      login: 'bexobot [bot]',
      type: 'Bot'
    }
    const dcoObject = await getDCOStatus([{commit, author, parents: [], sha}], alwaysRequireSignoff, prInfo)

    expect(dcoObject).toEqual(success)
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
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        },
        verification: {
          verified: true
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'lptr' }, parents: [], sha}], dontRequireSignoffFor('lptr'), prInfo)

      expect(dcoObject).toEqual(success)
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
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        },
        verification: {
          verified: false
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'lptr' }, parents: [], sha}], dontRequireSignoffFor('lptr'), prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'Lorant Pinter',
        committer: 'Bex Warner',
        message: 'Commit by organization member is not verified.',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
    }
  )

  test(
    'returns success if commit.author is different but commit.committer matches',
    async () => {
      const commit = {
        message: 'What a nice day!\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
        author: {
          name: 'Bexo',
          email: 'bexo@gmail.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const dcoObject = await getDCOStatus([{commit, author: { login: 'hiimbex' }, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual(success)
    }
  )

  test(
    'returns success if author does not exist but everything else is ok',
    async () => {
      const commit = {
        message: 'What a nice day!\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
        author: {
          name: 'Bexo',
          email: 'bexo@gmail.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const author = null
      const dcoObject = await getDCOStatus([{commit, author, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual(success)
    }
  )

  test('returns failure if author does not exist and there is no sign off',
    async () => {
      const commit = {
        message: 'What a nice day!',
        author: {
          name: 'Bexo',
          email: 'bexo@gmail.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const author = null
      const dcoObject = await getDCOStatus([{commit, author, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'Bexo',
        committer: 'Bex Warner',
        message: 'The sign-off is missing.',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
    }
  )

  test(
    'returns failure if author does not exist and there is no sign off',
    async () => {
      const commit = {
        message: 'What a nice day!',
        author: {
          name: 'Bexo',
          email: 'bexo@gmail.com'
        },
        committer: {
          name: 'Bex Warner',
          email: 'bexmwarner@gmail.com'
        }
      }
      const author = null
      const dcoObject = await getDCOStatus([{commit, author, parents: [], sha}], alwaysRequireSignoff, prInfo)

      expect(dcoObject).toEqual([{
        url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
        author: 'Bexo',
        committer: 'Bex Warner',
        message: 'The sign-off is missing.',
        sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
      }])
    }
  )
})
