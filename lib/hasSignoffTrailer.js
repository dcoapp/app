// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Presence-only `Signed-off-by` detection.
//
// This deliberately does NOT match the trailer identity against the commit
// author or committer. It exists for commits that GitHub's merge queue
// synthesises: those commits take their author identity from the GitHub
// account rather than from git, while the trailer is carried over verbatim
// from the human-authored pull request commit and therefore still holds the
// original git identity. The two can never be required to agree.
//
// The certification itself is still evaluated with full identity matching, but
// against the pull request's own commits (see lib/dco.js). All that is asserted
// here is that the merge queue did not strip the trailer.
//
// The pattern is the same one getSignoffs() in lib/dco.js uses, minus the `g`
// flag: a global regex carries `lastIndex` state across `.test()` calls and
// would return alternating results for the same input.
const SIGNOFF_TRAILER = /^Signed-off-by: (.*) <(.*)>\s*$/im;

module.exports = function hasSignoffTrailer(message) {
  return SIGNOFF_TRAILER.test(message);
};
