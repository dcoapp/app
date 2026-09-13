// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Reduces a raw commit-message file to the text git will actually record.
//
// The commit-msg hook runs before git applies its own cleanup, so the file
// still holds the comment block, and under `git commit --verbose` it also
// holds the diff below a scissors line. Both must go before the message is
// scanned for a `Signed-off-by` trailer: a diff that happens to touch a line
// containing one would otherwise satisfy the check, passing a commit that the
// DCO app will later reject.

// Git writes the scissors line as the comment character followed by
// "------------------------ >8 ------------------------". Matching on the
// ">8" marker alone keeps this independent of the rule width, which git has
// changed before.
const SCISSORS_MARKER = ">8";

/**
 * @param {string} raw contents of the commit message file
 * @param {string} commentChar git's core.commentChar, defaulting to "#"
 * @returns {string} the message with comments and any diff removed
 */
module.exports = function cleanCommitMessage(raw, commentChar = "#") {
  const kept = [];

  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith(commentChar)) {
      kept.push(line);
      continue;
    }
    // Everything below the scissors is the verbose diff, not the message.
    if (line.includes(SCISSORS_MARKER)) break;
  }

  return kept.join("\n").trim();
};
