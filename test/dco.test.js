/*
* The tests in this file verify the functionality of Probot DCO. Because there are many ways to
* write a signoff and many ways to misconfigure git, the goal is to flush out as many corner cases
* as possible.
*
* If you are adding a new feature, please note that you might need to repeat your test a few times
* to verify that functionality is unchanged when various config options are enabled.
*
* Usage (from root directory): npx jest
* To see a list of tests: npx jest --verbose
*/

const getDCOStatus = require('../lib/dco.js')

const success = []
const shaA = '18aebfa67dde85da0f5099ad70ef647685a05205'
const shaB = 'd5f3e2be498459554b6465224b7b6f7c0682295e'
const shaC = '966587f0902920ed656950b0766e1073f8a532c0'
const alwaysRequireSignoff = async () => true
const dontRequireSignoffFor = (allowedLogin) => async (login) => { return login !== allowedLogin }
const prInfo = 'https://github.com/hiimbex/testing-things/pull/1'

describe('EXPLICIT DCO SIGN-OFFS', () => {
/*
* The tests in this section verify Probot DCO's default behavior, whereby an author or
* committer signs off explicitly on each commit. Merge commits and commits from bots and
* verified org members are ignored.
*/

  describe('Single commit', () => {
    describe('Success patterns', () => {
      test('Single commit is correctly signed-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off first)', async () => {
        const commit = {
          message: 'Hello world\n\n' +
            'Signed-off-by: Brandon Keepers <bkeepers@github.com>\n' +
            'Signed-off-by: Unknown <tester@github.com>',
          author: {
            name: 'Brandon Keepers',
            email: 'bkeepers@github.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off second)', async () => {
        const commit = {
          message: 'Hello world\n\n' +
            'Signed-off-by: Unknown <tester@github.com>\n' +
            'Signed-off-by: Brandon Keepers <bkeepers@github.com>',
          author: {
            name: 'Brandon Keepers',
            email: 'bkeepers@github.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with case-insensitive "signed-off-by:"', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with case-insensitive author and email', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with multiple trailing newlines', async () => {
        const commit = {
          message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>\n\n',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with trailing whitespace', async () => {
        const commit = {
          message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>  ',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with email containing subdomains', async () => {
        const commit = {
          message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@sub.disney.com>\n\n',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@sub.disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off with email containing plus aliasing', async () => {
        const commit = {
          message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
          author: {
            name: 'hiimbex',
            email: 'hiimbex+alias@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit has valid sign-off from committer, not author', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit has valid sign-off from committer, author has no email', async () => {
        const commit = {
          message: 'What a nice day!\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
          author: {
            name: 'Bexo',
            email: ''
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off by committer, author does not exist', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is correctly signed-off, author does not exist', async () => {
        const commit = {
          message: 'What a nice day!\n\nSigned-off-by: Bexo <bexo@gmail.com>',
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
        const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is a merge commit, no sign-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [1, 2], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single commit is from a bot, no sign-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('Single verified commit is from an org member, no sign-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })
    })

    describe('Failure patterns:', () => {
      test('Single commit does not contain a sign-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'Brandon Keepers',
          email: 'bkeepers@github.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit does not contain a sign-off, author does not exist', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'Bexo',
          email: 'bexo@gmail.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit contains multiple sign-offs, and none are correct', async () => {
        const commit = {
          message: 'Hello world\n\n' +
            'Signed-off-by: Tester1 <tester1@github.com>\n' +
            'Signed-off-by: Tester2 <tester2@github.com>',
          author: {
            name: 'Author Name',
            email: 'author@email.com'
          },
          committer: {
            name: 'Committer Name',
            email: 'committer@email.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          author: 'Author Name',
          email: 'author@email.com',
          committer: 'Committer Name',
          message: 'Can not find "Author Name <author@email.com>", in ["Tester1 <tester1@github.com>", "Tester2 <tester2@github.com>"].',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205',
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit contains a sign-off with incorrect name.', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit contains a sign-off with incorrect email', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit contains a sign-off with incorrect name and email', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit is correctly signed-off with whitespace around name', async () => {
        const commit = {
          message: 'Hello world\n\nSigned-off-by:   Brandon Keepers  <bkeepers@github.com>',
          author: {
            name: 'Brandon Keepers',
            email: 'bkeepers@github.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'Brandon Keepers',
          email: 'bkeepers@github.com',
          committer: 'Bex Warner',
          message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "  Brandon Keepers  <bkeepers@github.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit is correctly signed-off with whitespace around email', async () => {
        const commit = {
          message: 'Hello world\n\nSigned-off-by: Brandon Keepers < bkeepers@github.com >',
          author: {
            name: 'Brandon Keepers',
            email: 'bkeepers@github.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'Brandon Keepers',
          email: 'bkeepers@github.com',
          committer: 'Bex Warner',
          message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "Brandon Keepers < bkeepers@github.com >".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but name is missing', async () => {
        const commit = {
          message: 'bad signoff\n\nsigned-off-by: <hiimbex@disney.com>',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but email is missing', async () => {
        const commit = {
          message: 'bad signoff\n\nsigned-off-by: hiimbex',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but email is missing angle brackets', async () => {
        const commit = {
          message: 'bad signoff\n\nsigned-off-by: hiimbex hiimbex@disney.com',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but name and email are missing', async () => {
        const commit = {
          message: 'bad signoff\n\nsigned-off-by: ',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but name and email are swapped', async () => {
        const commit = {
          message: 'bad signoff\n\nsigned-off-by: hiimbex@disney.com <hiimbex>',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex@disney.com <hiimbex>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but email is invalid (missing @)', async () => {
        const commit = {
          message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex(at)disney.com>',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex(at)disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit has "Signed-off-by:" text but email is invalid (missing TLD)', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@bexo',
          committer: 'Bex Warner',
          message: 'hiimbex@bexo is not a valid email address.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single commit is signed-off with email containing plus aliasing, but author does not use plus aliasing', async () => {
        const commit = {
          message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'hiimbex',
          email: 'hiimbex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex+alias@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('Single unverified commit is from an org member, no sign-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'Lorant Pinter',
          email: 'lorant.pinter@gmail.com',
          committer: 'Bex Warner',
          message: 'Commit by organization member is not verified.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })
    })
  })

  describe('Two commits', () => {
    describe('Success patterns', () => {
      test('First commit is correctly signed-off; second commit is correctly signed-off', async () => {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off', async () => {
        const commitA = {
          message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs', async () => {
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
          message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off by one of multiple sign-offs', async () => {
        const commitA = {
          message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
          message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })
    })

    describe('Failure patterns', () => {
      test('First commit does not contain a sign-off; second commit is correctly signed-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('First commit is correctly signed-off, second commit does not contain a sign-off', async () => {
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }])
      })

      test('First commit is incorrectly signed-off, second commit does not contain a sign-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }])
      })
    })
  })

  describe('Three commits', () => {
    describe('Success patterns', () => {
      test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
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
        const commitC = {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })

      test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs; third commit is correctly signed-off', async () => {
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
          message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const commitC = {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual(success)
      })
    })

    describe('Failure patterns', () => {
      test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
        const commitC = {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const commitC = {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }])
      })

      test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
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
        const commitC = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '966587f0902920ed656950b0766e1073f8a532c0'
        }])
      })

      test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const commitC = {
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
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }])
      })

      test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const commitC = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '966587f0902920ed656950b0766e1073f8a532c0'
        }])
      })

      test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
        const commitC = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '966587f0902920ed656950b0766e1073f8a532c0'
        }])
      })

      test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
        const commitA = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const commitC = {
          message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
        }, {
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
          sha: '966587f0902920ed656950b0766e1073f8a532c0'
        }])
      })
    })
  })
})

describe('INDIVIDUAL REMEDIATION COMMITS', () => {
/*
* The tests in this section verify Probot DCO's behavior when configured to allow individual
* remediation commits. In order to be valid, an individual remediation commit must contain
* specific text and be provided by the original author of the commit.

* Individual remediation commits must be ignored when not configured. Because third-party
* remediation commits are a special kind of remediation, these must also be ignored when
* individual remediation commits are not configured.
*/

  describe('Disabled (default)', () => {
    describe('Failure patterns', () => {
      test('First commit does not contain a sign-off; second commit contains sign-off and correct individual remediation', async () => {
        const commitA = {
          message: 'No signoff',
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
          message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
          author: {
            name: 'bex',
            email: 'bex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })
    })
  })

  describe('Enabled via config option', () => {
    describe('Verify default functionality is unchanged', () => {
      /*
      * The tests in this section mirror the explicit sign-off tests exactly, except individual
      * remediation is enabled. This first sequence of tests ensures that no functionality
      * changes when individual remediation commits are enabled.
      */

      describe('Single commit', () => {
        describe('Success patterns', () => {
          test('Single commit is correctly signed-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off first)', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Brandon Keepers <bkeepers@github.com>\n' +
                'Signed-off-by: Unknown <tester@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off second)', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Unknown <tester@github.com>\n' +
                'Signed-off-by: Brandon Keepers <bkeepers@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with case-insensitive "signed-off-by:"', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with case-insensitive author and email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with multiple trailing newlines', async () => {
            const commit = {
              message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with trailing whitespace', async () => {
            const commit = {
              message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>  ',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with email containing subdomains', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@sub.disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@sub.disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with email containing plus aliasing', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex+alias@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit has valid sign-off from committer, not author', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by committer, author does not exist', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off, author does not exist', async () => {
            const commit = {
              message: 'What a nice day!\n\nSigned-off-by: Bexo <bexo@gmail.com>',
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is a merge commit, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [1, 2], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is from a bot, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('Single verified commit is from an org member, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns', () => {
          test('Single commit does not contain a sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit does not contain a sign-off, author does not exist', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Bexo',
              email: 'bexo@gmail.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains multiple sign-offs, and none are correct', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Tester1 <tester1@github.com>\n' +
                'Signed-off-by: Tester2 <tester2@github.com>',
              author: {
                name: 'Author Name',
                email: 'author@email.com'
              },
              committer: {
                name: 'Committer Name',
                email: 'committer@email.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              author: 'Author Name',
              email: 'author@email.com',
              committer: 'Committer Name',
              message: 'Can not find "Author Name <author@email.com>", in ["Tester1 <tester1@github.com>", "Tester2 <tester2@github.com>"].',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205',
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect name.', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect name and email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is correctly signed-off with whitespace around name', async () => {
            const commit = {
              message: 'Hello world\n\nSigned-off-by:   Brandon Keepers  <bkeepers@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "  Brandon Keepers  <bkeepers@github.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is correctly signed-off with whitespace around email', async () => {
            const commit = {
              message: 'Hello world\n\nSigned-off-by: Brandon Keepers < bkeepers@github.com >',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "Brandon Keepers < bkeepers@github.com >".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name is missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is missing angle brackets', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex hiimbex@disney.com',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name and email are missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: ',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name and email are swapped', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex@disney.com <hiimbex>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex@disney.com <hiimbex>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is invalid (missing @)', async () => {
            const commit = {
              message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex(at)disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex(at)disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is invalid (missing TLD)', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@bexo',
              committer: 'Bex Warner',
              message: 'hiimbex@bexo is not a valid email address.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is signed-off with email containing plus aliasing, but author does not use plus aliasing', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex+alias@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single unverified commit is from an org member, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Lorant Pinter',
              email: 'lorant.pinter@gmail.com',
              committer: 'Bex Warner',
              message: 'Commit by organization member is not verified.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })
        })
      })

      describe('Two commits', () => {
        describe('Success patterns', () => {
          test('First commit is correctly signed-off; second commit is correctly signed-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs', async () => {
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off by one of multiple sign-offs', async () => {
            const commitA = {
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns:', () => {
          test('First commit does not contain a sign-off; second commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('First commit is correctly signed-off, second commit does not contain a sign-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is incorrectly signed-off, second commit does not contain a sign-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })
        })
      })

      describe('Three commits', () => {
        describe('Success patterns', () => {
          test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
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
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs; third commit is correctly signed-off', async () => {
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns', () => {
          test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
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
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })
        })
      })
    })

    describe('Verify individual remediations', () => {
      /*
      * The tests in this section verify the behavior of individual remediation.
      */

      describe('Success patterns', () => {
        test('First commit does not contain a sign-off; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has a sign-off, name incorrect; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: hiimbex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has a sign-off, email incorrect; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <hiimbex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit contains a sign-off; second commit has redundant individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit contains a sign-off; second commit has individual remediation for a non-existent sha and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 2222222222222222222222222222222222222222\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has individual remediation, no sign-off; third commit has individual remediation and is correctly signed-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has no sign-off; third commit has individual remediations for both and is correctly signed-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'No signoff',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\nI, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })
      })

      describe('Failure patterns', () => {
        test('First commit has no sign-off; second commit has remediation text but no sign-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <bex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <hiimbex@disney.com>',
            author: {
              name: 'bex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <bex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <hiimbex@disney.com>',
            author: {
              name: 'bex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation for a different sha', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 2222222222222222222222222222222222222222\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })
      })
    })
  })
})

describe('THIRD PARTY REMEDIATION COMMITS', () => {
/*
* The tests in this section verify Probot DCO's behavior when configured to allow
* third-party remediation commits. In order to be valid, a third-party remediation commit
* must contain specific text that matches the failing commit.
*
* Third party remediation commits must be ignored when not configured.
*/

  describe('Disabled (default)', () => {
    describe('Failure patterns', () => {
      test('First commit does not contain a sign-off; second commit contains sign-off and correct third-party remediation', async () => {
        const commitA = {
          message: 'No signoff',
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
          message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com> hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })

      test('First commit does not contain a sign-off; second commit contains sign-off and correct third-party remediation; individual remediation enabled', async () => {
        const commitA = {
          message: 'No signoff',
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
          message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com> hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
          author: {
            name: 'hiimbex',
            email: 'hiimbex@disney.com'
          },
          committer: {
            name: 'Bex Warner',
            email: 'bexmwarner@gmail.com'
          }
        }
        const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

        expect(dcoObject).toEqual([{
          url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
          author: 'bex',
          email: 'bex@disney.com',
          committer: 'Bex Warner',
          message: 'The sign-off is missing.',
          sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
        }])
      })
    })
  })

  describe('Enabled via config option', () => {
    describe('Verify default functionality is unchanged', () => {
      /*
      * The tests in this section mirror the explicit sign-off tests exactly, except individual
      * remediation is enabled. This first sequence of tests ensures that no functionality
      * changes when individual remediation commits are enabled.
      */

      describe('Single commit', () => {
        describe('Success patterns', () => {
          test('Single commit is correctly signed-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off first)', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Brandon Keepers <bkeepers@github.com>\n' +
                'Signed-off-by: Unknown <tester@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by one of multiple sign-offs (correct sign-off second)', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Unknown <tester@github.com>\n' +
                'Signed-off-by: Brandon Keepers <bkeepers@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with case-insensitive "signed-off-by:"', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with case-insensitive author and email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with multiple trailing newlines', async () => {
            const commit = {
              message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with trailing whitespace', async () => {
            const commit = {
              message: 'signed off correctly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>  ',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with email containing subdomains', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex@sub.disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@sub.disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off with email containing plus aliasing', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex+alias@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit has valid sign-off from committer, not author', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off by committer, author does not exist', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is correctly signed-off, author does not exist', async () => {
            const commit = {
              message: 'What a nice day!\n\nSigned-off-by: Bexo <bexo@gmail.com>',
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is a merge commit, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [1, 2], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single commit is from a bot, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('Single verified commit is from an org member, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns', () => {
          test('Single commit does not contain a sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit does not contain a sign-off, author does not exist', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Bexo',
              email: 'bexo@gmail.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains multiple sign-offs, and none are correct', async () => {
            const commit = {
              message: 'Hello world\n\n' +
                'Signed-off-by: Tester1 <tester1@github.com>\n' +
                'Signed-off-by: Tester2 <tester2@github.com>',
              author: {
                name: 'Author Name',
                email: 'author@email.com'
              },
              committer: {
                name: 'Committer Name',
                email: 'committer@email.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              author: 'Author Name',
              email: 'author@email.com',
              committer: 'Committer Name',
              message: 'Can not find "Author Name <author@email.com>", in ["Tester1 <tester1@github.com>", "Tester2 <tester2@github.com>"].',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205',
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect name.', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit contains a sign-off with incorrect name and email', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is correctly signed-off with whitespace around name', async () => {
            const commit = {
              message: 'Hello world\n\nSigned-off-by:   Brandon Keepers  <bkeepers@github.com>',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "  Brandon Keepers  <bkeepers@github.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is correctly signed-off with whitespace around email', async () => {
            const commit = {
              message: 'Hello world\n\nSigned-off-by: Brandon Keepers < bkeepers@github.com >',
              author: {
                name: 'Brandon Keepers',
                email: 'bkeepers@github.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'bkeepers' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Brandon Keepers',
              email: 'bkeepers@github.com',
              committer: 'Bex Warner',
              message: 'Expected "Brandon Keepers <bkeepers@github.com>", but got "Brandon Keepers < bkeepers@github.com >".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name is missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is missing angle brackets', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex hiimbex@disney.com',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name and email are missing', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: ',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but name and email are swapped', async () => {
            const commit = {
              message: 'bad signoff\n\nsigned-off-by: hiimbex@disney.com <hiimbex>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex@disney.com <hiimbex>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is invalid (missing @)', async () => {
            const commit = {
              message: 'bad email\n\nsigned-off-by: hiimbex <hiimbex(at)disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex(at)disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit has "Signed-off-by:" text but email is invalid (missing TLD)', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@bexo',
              committer: 'Bex Warner',
              message: 'hiimbex@bexo is not a valid email address.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single commit is signed-off with email containing plus aliasing, but author does not use plus aliasing', async () => {
            const commit = {
              message: 'signed off correctly\n\nsigned-off-by: hiimbex <hiimbex+alias@disney.com>\n\n',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'hiimbex' }, parents: [], sha: shaA }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "hiimbex <hiimbex@disney.com>", but got "hiimbex <hiimbex+alias@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('Single unverified commit is from an org member, no sign-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit, author: { login: 'lptr' }, parents: [], sha: shaA }], dontRequireSignoffFor('lptr'), prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'Lorant Pinter',
              email: 'lorant.pinter@gmail.com',
              committer: 'Bex Warner',
              message: 'Commit by organization member is not verified.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })
        })
      })

      describe('Two commits', () => {
        describe('Success patterns', () => {
          test('First commit is correctly signed-off; second commit is correctly signed-off', async () => {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs', async () => {
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off by one of multiple sign-offs; second commit is correctly signed-off by one of multiple sign-offs', async () => {
            const commitA = {
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns:', () => {
          test('First commit does not contain a sign-off; second commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('First commit is correctly signed-off, second commit does not contain a sign-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [] }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is incorrectly signed-off, second commit does not contain a sign-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })
        })
      })

      describe('Three commits', () => {
        describe('Success patterns', () => {
          test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
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
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off by one of multiple sign-offs; third commit is correctly signed-off', async () => {
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
              message: 'signed off correctly\n\nSigned-off-by: bex <bex@disney.com>\nSigned-off-by: Brian Warner <brian@bdwarner.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })
        })

        describe('Failure patterns', () => {
          test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

          test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is correctly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
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
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is correctly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
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
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

          test('First commit is correctly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is correctly signed-off; third commit is incorrectly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })

          test('First commit is incorrectly signed-off; second commit is incorrectly signed-off; third commit is incorrectly signed-off', async () => {
            const commitA = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
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
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'signed off incorrectly\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }, {
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>".',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })
        })
      })
    })

    describe('Verify individual remediation with third-party remediations enabled', () => {
      /*
      * The tests in this section verify the behavior of third-party remediation.
      */
      describe('Success patterns', () => {
        test('First commit does not contain a sign-off; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has a sign-off, name incorrect; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: hiimbex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has a sign-off, email incorrect; second commit has individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <hiimbex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit contains a sign-off; second commit has redundant individual remediation and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit contains a sign-off; second commit has individual remediation for a non-existent sha and sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 2222222222222222222222222222222222222222\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has individual remediation, no sign-off; third commit has individual remediation and is correctly signed-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has no sign-off; third commit has individual remediations for both and is correctly signed-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'No signoff',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\nI, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual(success)
        })
      })

      describe('Failure patterns', () => {
        test('First commit has no sign-off; second commit has remediation text but no sign-off', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <bex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <hiimbex@disney.com>',
            author: {
              name: 'bex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has remediation and sign-off from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <bex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <hiimbex@disney.com>',
            author: {
              name: 'bex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct remediation but sign-off from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author name', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation from a different author name and email', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })

        test('First commit has no sign-off; second commit has correct sign-off but remediation for a different sha', async () => {
          const commitA = {
            message: 'No signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 2222222222222222222222222222222222222222\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: false })

          expect(dcoObject).toEqual([{
            url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
            author: 'bex',
            email: 'bex@disney.com',
            committer: 'Bex Warner',
            message: 'The sign-off is missing.',
            sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
          }])
        })
      })
    })

    describe('Verify third-party remediations', () => {
      describe('Success patterns', () => {
        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation from same author, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
              author: {
                name: 'bex',
                email: 'bex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation from different author, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation from committer, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, Bex Warner <bexmwarner@gmail.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation from verified org member, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              },
              verification: {
                verified: true
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'bex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], dontRequireSignoffFor('hiimbex'), prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })

        test('First commit has sign-off; second commit has redundant individual remediation, has sign-off; third commit has redundant third-party remediation, has sign-off', async () => {
          const commitA = {
            message: 'Signed-off-by: bex <bex@disney.com>',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has individual remediation, has sign-off; third commit has redundant third-party remediation, has sign-off', async () => {
          const commitA = {
            message: 'no signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: bex <bex@disney.com>',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has individual remediation, no sign-off; third commit has third-party remediation, has sign-off', async () => {
          const commitA = {
            message: 'no signoff',
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
            message: 'I, bex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'bex',
              email: 'bex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has third-party remediation, no sign-off; third commit has individual remediation of second commit, has sign-off', async () => {
          const commitA = {
            message: 'no signoff',
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
            message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

          expect(dcoObject).toEqual(success)
        })

        test('First commit has no sign-off; second commit has third-party remediation, no sign-off; third commit has third-party remediation of second commit, has sign-off', async () => {
          const commitA = {
            message: 'no signoff',
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
            message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
            author: {
              name: 'hiimbex',
              email: 'hiimbex@disney.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const commitC = {
            message: 'On behalf of hiimbex <hiimbex@disney.com>, I, Bex Warner <bexmwarner@gmail.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
            author: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            },
            committer: {
              name: 'Bex Warner',
              email: 'bexmwarner@gmail.com'
            }
          }
          const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

          expect(dcoObject).toEqual(success)
        })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation text for first commit, no sign-off; third commit from committer has correct 3rd party remediation text for second commit, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'On behalf of hiimbex <hiimbex@disney.com>, I, Bex Warner <bexmwarner@gmail.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e\n\nSigned-off-by: Bex Warner <bexmwarner@gmail.com>',
              author: {
                name: 'Not Bex',
                email: 'notbex@gmail.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual(success)
          })
      })

      describe('Failure patterns', () => {
        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation; individual remediations disabled',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: false, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has 3rd party remediation for wrong email, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <hiimbex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has 3rd party remediation for wrong name, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of Bex Warner <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has 3rd party remediation for wrong sha, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 2222222222222222222222222222222222222222\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has mangled 3rd party remediation text, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'For bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation text but wrong remediator email, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <bex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation text but wrong remediator name, has sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, bex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/18aebfa67dde85da0f5099ad70ef647685a05205',
              author: 'bex',
              email: 'bex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '18aebfa67dde85da0f5099ad70ef647685a05205'
            }])
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation text, no sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: 'hiimbex',
              email: 'hiimbex@disney.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: 'd5f3e2be498459554b6465224b7b6f7c0682295e'
            }])
          })

        test(
          'First commit has no sign-off; second commit has correct 3rd party remediation text for first commit, no sign-off; third commit from committer has correct 3rd party remediation text for second commit, no sign-off',
          async () => {
            const commitA = {
              message: 'No signoff',
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
              message: 'On behalf of bex <bex@disney.com>, I, hiimbex <hiimbex@disney.com>, hereby add my Signed-off-by to this commit: 18aebfa67dde85da0f5099ad70ef647685a05205',
              author: {
                name: 'hiimbex',
                email: 'hiimbex@disney.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const commitC = {
              message: 'On behalf of hiimbex <hiimbex@disney.com>, I, Bex Warner <bexmwarner@gmail.com>, hereby add my Signed-off-by to this commit: d5f3e2be498459554b6465224b7b6f7c0682295e',
              author: {
                name: 'Not Bex',
                email: 'notbex@gmail.com'
              },
              committer: {
                name: 'Bex Warner',
                email: 'bexmwarner@gmail.com'
              }
            }
            const dcoObject = await getDCOStatus([{ commit: commitA, author: { login: 'hiimbex' }, parents: [], sha: shaA }, { commit: commitB, author: { login: 'hiimbex' }, parents: [], sha: shaB }, { commit: commitC, author: { login: 'hiimbex' }, parents: [], sha: shaC }], alwaysRequireSignoff, prInfo, { individual: true, thirdParty: true })

            expect(dcoObject).toEqual([{
              url: 'https://github.com/hiimbex/testing-things/pull/1/commits/966587f0902920ed656950b0766e1073f8a532c0',
              author: 'Not Bex',
              email: 'notbex@gmail.com',
              committer: 'Bex Warner',
              message: 'The sign-off is missing.',
              sha: '966587f0902920ed656950b0766e1073f8a532c0'
            }])
          })
      })
    })
  })
})
