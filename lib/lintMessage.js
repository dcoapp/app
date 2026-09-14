// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Evaluates a single, not-yet-created commit with the same logic the app
// applies to pull request commits.
//
// lib/dco.js is reused verbatim rather than reimplemented. It is a pure
// function over GitHub's commit shape, so the only thing needed locally is an
// adapter that presents the pending commit in that shape. Keeping one
// implementation is the whole point: a second one would drift, and a local
// check that disagrees with the app is worse than no local check, because it
// tells contributors their commit is fine when it will be rejected.

const getDCOStatus = require("./dco.js");

// The commit does not exist yet, so there is no sha to report. lib/dco.js only
// ever interpolates this into a URL, which the local reporter does not print.
const PENDING_SHA = "HEAD";

// Remediation commits certify a *different* commit, identified by sha, so they
// are only meaningful when a range is being evaluated. A single pending commit
// has no range, so both forms are off here.
const NO_REMEDIATION = { individual: false, thirdParty: false };

/**
 * Builds the GitHub commit shape lib/dco.js consumes.
 *
 * `author` is deliberately null: it carries the GitHub *account*, which does
 * not exist for a local commit. lib/dco.js reads a null account as
 * "sign-off required", which is the correct default locally — the member
 * exemption is a server-side policy decision that needs the org membership
 * API to evaluate.
 *
 * A null account also forgoes the app's `author.type === "Bot"` exemption,
 * so a bot-authored commit with no trailer is rejected here although the app
 * would accept it. The divergence goes one step further than it first
 * appears: GitHub bot noreply addresses contain square brackets, which the
 * email validator in lib/dco.js refuses, so a bot commit is rejected even
 * when its trailer matches. The app never reaches that check, because it
 * skips on account type first.
 *
 * Both are deliberate and conservative: account type is not knowable
 * locally, and the case is largely theoretical because bots commit through
 * the API and never run a commit-msg hook. They fail safe, rejecting a
 * commit the app allows rather than passing one it blocks.
 *
 * `parents` is empty so the commit is not classed as a merge. Merge commits
 * are exempt in the app, and git *does* run the commit-msg hook during a
 * merge, so that exemption is applied earlier, in cli.js, by detecting
 * MERGE_HEAD. By the time a commit reaches here it is never a merge.
 */
function toCommitShape({ message, author, committer }) {
  return {
    sha: PENDING_SHA,
    parents: [],
    author: null,
    commit: {
      message,
      author: { name: author.name, email: author.email },
      committer: { name: committer.name, email: committer.email },
      // Only consulted when sign-off is not required, which cannot happen
      // with a null account. Present so the shape stays complete.
      verification: { verified: false },
    },
  };
}

/**
 * @param {{message: string,
 *          author: {name: string, email: string},
 *          committer: {name: string, email: string}}} pending
 * @returns {Promise<Array<object>>} failures, empty when the commit passes
 */
module.exports = async function lintCommitMessage(pending) {
  return getDCOStatus(
    [toCommitShape(pending)],
    // Never invoked: lib/dco.js short-circuits on the null GitHub account
    // set by toCommitShape, so sign-off is already required and the
    // predicate is unreachable. Supplied because the signature demands it.
    /* istanbul ignore next - unreachable, see above */
    async () => true,
    "",
    NO_REMEDIATION
  );
};

module.exports.toCommitShape = toCommitShape;
