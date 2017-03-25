
const SignedOff = /^Signed-off-by: ([^<]+) <([^>]+)>$/m

module.exports = function(message) {
  return SignedOff.test(message);
};
