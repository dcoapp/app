const expect = require('expect');
const dco = require('../lib/dco');

describe('dco', () => {
  it('returns true if message contains signoff', () => {
    const message = "Hello world\n\nSigned-off-by: Brandon Keepers <bkeepers@github.com>"
    expect(dco(message)).toBe(true);
  });

  it('returns false if message does not have signoff', () => {
    const message = "yolo"
    expect(dco(message)).toBe(false);
  });

});
