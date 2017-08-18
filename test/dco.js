// Const expect = require('expect');
// const {createRobot} = require('probot');
// const plugin = require('..');
//
// describe('dco', () => {
//   let robot;
//   let github;
//
//   beforeEach(() => {
//       robot = createRobot();
//       plugin(robot);
//
//       github = {
//           repos: {
//               compareCommits: expect.createSpy().andReturn(Promise.resolve({
//                   data: {
//                       commits: Buffer.from(`whiteList:\n  - bug\n  - chore`).toString('base64')
//                   }
//               }))
//           },
//           issues: {
//               createComment: expect.createSpy()
//           },
//           pullRequests: {
//               getFiles: expect.createSpy().andReturn(Promise.resolve({
//                   data: [{filename: 'help.yml'}, {filename: 'index.js'}]
//               }))
//           }
//       };
//       robot.auth = () => Promise.resolve(github);
//       payload = {'pull_request': 'woot'};
//   });
//
//   await robot.receive(payload);
//   it('returns true if message contains signoff', () => {
//     const commit = {
//       message: 'Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>',
//       author: {
//         name: 'Brandon Keepers',
//         email: 'bkeepers@github.com'
//       }
//     };
//
//     expect(dco({commit})).toBe(true);
//   });
//
//   it('returns true for merge commit', () => {
//     const commit = {
//       message: 'mergin stuff',
//       author: {
//         name: 'Brandon Keepers',
//         email: 'bkeepers@github.com'
//       }
//     };
//
//     expect(dco({commit, parents: [1, 2]})).toBe(true);
//   });
//
//   it('returns error message if message does not have signoff', () => {
//     const commit = {
//       message: 'yolo',
//       author: {
//         name: 'Brandon Keepers',
//         email: 'bkeepers@github.com'
//       }
//     };
//
//     expect(dco({commit})).toBe('The sign-off is missing. ');
//   });
//
//   it('returns error message if the signoff does not match the author', () => {
//     const commit = {
//       message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
//       author: {
//         name: 'hiimbex',
//         email: 'bex@disney.com'
//       }
//     };
//
//     expect(dco({commit})).toBe('Expected "hiimbex <bex@disney.com>", but got "bex <bex@disney.com>" ');
//   });
//
//   it('returns error message if the signoff does not match the email', () => {
//     const commit = {
//       message: 'signed off by wrong author\n\nSigned-off-by: bex <bex@disney.com>',
//       author: {
//         name: 'bex',
//         email: 'hiimbex@disney.com'
//       }
//     };
//
//     expect(dco({commit})).toBe('Expected "bex <hiimbex@disney.com>", but got "bex <bex@disney.com>" ');
//   });
//
//   it('returns error message if the signoff does not match the author or email', () => {
//     const commit = {
//       message: 'signed off by wrong author\n\nSigned-off-by: hiimbex <hiimbex@disney.com>',
//       author: {
//         name: 'bex',
//         email: 'bex@disney.com'
//       }
//     };
//
//     expect(dco({commit})).toBe('Expected "bex <bex@disney.com>", but got "hiimbex <hiimbex@disney.com>" ');
//   });
//
//   describe('integration tests', () => {
//     const signedOff = require('./fixtures/push.signed-off');
//     const notSignedOff = require('./fixtures/push.not-signed-off');
//
//     it('true for commits with signoff', () => {
//       signedOff.commits.forEach(commit => {
//         expect(dco({commit})).toBe(true);
//       });
//     });
//
//     it('fails for commits without signoff', () => {
//       notSignedOff.commits.forEach(commit => {
//         expect(dco({commit})).toBe('The sign-off is missing. ');
//       });
//     });
//   });
// });
