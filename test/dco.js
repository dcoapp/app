const expect = require('expect');
const dco = require('../lib/dco');

describe('dco', () => {
  it('returns true if message contains signoff', () => {
    const commit = {
      message: 'Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    };

    expect(dco({commit})).toBe(true);
  });

  it('returns true for merge commit', () => {
    const commit = {
      message: 'mergin stuff',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    };

    expect(dco({commit, parents: [1, 2]})).toBe(true);
  });

  it('returns false if message does not have signoff', () => {
    const commit = {
      message: 'yolo',
      author: {
        name: 'Brandon Keepers',
        email: 'bkeepers@github.com'
      }
    };

    expect(dco({commit})).toBe(false);
  });

  it('returns false if the signoff does not match the author', () => {
    const commit = {
      message: 'signed off by wrong author\n\nSigned-off-by: Donald Duck <donald@disney.com>',
      author: {
        name: 'Mickey Mouse',
        email: 'mickey@disney.com'
      }
    };

    expect(dco({commit})).toBe(false);
  });

  describe('integration tests', () => {
    const signedOff = require('./fixtures/push.signed-off');
    const notSignedOff = require('./fixtures/push.not-signed-off');

    it('passes for commits with signoff', () => {
      signedOff.commits.forEach(commit => {
        expect(dco({commit})).toBe(true);
      });
    });

    it('fails for commits without signoff', () => {
      notSignedOff.commits.forEach(commit => {
        expect(dco({commit})).toBe(false);
      });
    });
  });
});
