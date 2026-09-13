// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Reduces a raw commit-message file to the text git will actually record.
//
// The commit-msg hook runs before git applies its own cleanup, so the file
// still holds the comment block, and under `git commit --verbose` it also
// holds the diff below a scissors line.
//
// This step cannot change the verdict, and is kept as defence in depth rather
// than as load-bearing logic. A `Signed-off-by` trailer is only recognised at
// column 0, and neither kind of removed text can present one there: a comment
// line begins with the comment character, and every content line of a unified
// diff is prefixed with "+", "-" or a space. Verified by inspecting a real
// `git commit --verbose` message file, where a file consisting solely of a
// valid trailer appears as "+Signed-off-by: ...", never at column 0.
//
// That property is what makes core.commentChar=auto harmless here. git may
// resolve `auto` to a character other than "#", which cannot be re-derived
// from the finished file — the chosen character is picked before the comment
// block is appended, so by then every candidate appears used. Guessing wrong
// only means a comment line is kept or a body line starting with "#" is
// dropped, and neither can be a valid trailer.

// Scissors detection is deliberately independent of the comment character, so
// the cut still happens when core.commentChar has resolved to something other
// than the configured default.
//
// The leading character must be present and must be punctuation: matching a
// bare rule of dashes would let a line typed in the message body truncate it,
// discarding a genuine trailer below. Matching the delimiter structure rather
// than the ">8" marker alone likewise stops an ordinary comment such as
// "# supports >8 bytes" being read as the cut point.
const SCISSORS = /^[^-A-Za-z0-9\s]\s*-{2,}\s*>8\s*-{2,}/;

/**
 * @param {string} raw contents of the commit message file
 * @param {string} commentChar git's core.commentChar, defaulting to "#"
 * @returns {string} the message with comments and any diff removed
 */
module.exports = function cleanCommitMessage(raw, commentChar = "#") {
  const kept = [];

  for (const line of raw.split(/\r?\n/)) {
    // Everything below the scissors is the verbose diff, not the message.
    if (SCISSORS.test(line)) break;
    if (line.startsWith(commentChar)) continue;
    kept.push(line);
  }

  return kept.join("\n").trim();
};
