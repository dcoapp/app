#!/usr/bin/env node
// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Command-line entry point: checks the commit being written, before it exists.
//
// Intended for git's commit-msg hook, which passes the path of the message
// file as the only argument. The verdict uses lib/dco.js, the same module the
// GitHub App uses, so a commit that passes here passes the app's check too.

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const cleanCommitMessage = require("./lib/commitMessage.js");
const readLocalIdentity = require("./lib/localIdentity.js");
const lintCommitMessage = require("./lib/lintMessage.js");

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_USAGE = 2;

const USAGE = `Usage: dco-check <commit-message-file>

Checks that the commit message carries a Signed-off-by trailer matching the
git author or committer. Intended to run from git's commit-msg hook.`;

// core.commentChar may be unset, or set to "auto", in which case git picks a
// character that does not begin any line of the message. Resolving "auto"
// would mean reimplementing that search; "#" is git's own starting point and
// the overwhelmingly common case, so it is the fallback for both.
function readCommentChar(run = defaultGitConfig) {
  const value = run();
  if (!value || value === "auto") return "#";
  return value;
}

function defaultGitConfig() {
  try {
    return execFileSync("git", ["config", "--get", "core.commentChar"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // Exit status 1 simply means the key is unset.
    return "";
  }
}

// The app exempts merge commits, because a merge carries no certification of
// its own. git does run the commit-msg hook while merging, so without this the
// linter would block ordinary merges that the app accepts -- the exact
// local/server disagreement this tool exists to avoid.
//
// MERGE_HEAD is present only for a true merge. `git merge --squash`,
// cherry-pick and revert all produce ordinary single-parent commits, which the
// app does evaluate, so they are deliberately not exempted here.
function defaultMergeInProgress() {
  try {
    const path = execFileSync(
      "git",
      ["rev-parse", "--git-path", "MERGE_HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return fs.existsSync(path);
  } catch {
    /* istanbul ignore next - only reachable outside a git repository */
    return false;
  }
}

function formatFailure(failure) {
  return [
    "DCO check failed for the commit being created.",
    "",
    `  Author:    ${failure.author} <${failure.email}>`,
    `  Committer: ${failure.committer}`,
    `  Problem:   ${failure.message}`,
    "",
    "Every commit needs a Signed-off-by line matching its author, for",
    "example:",
    "",
    `  Signed-off-by: ${failure.author} <${failure.email}>`,
    "",
    "Adding it by hand is rarely necessary: git writes the trailer for you",
    "when you pass -s, as in `git commit -s`. To fix the commit you are",
    "writing now, abort, then commit again with -s.",
  ].join("\n");
}

async function main(argv, deps = {}) {
  const {
    readFile = (path) => fs.readFileSync(path, "utf8"),
    identity = readLocalIdentity,
    commentChar = readCommentChar,
    mergeInProgress = defaultMergeInProgress,
    error = console.error,
  } = deps;

  if (argv.length !== 1) {
    error(USAGE);
    return EXIT_USAGE;
  }

  // Matches the app, which skips commits with more than one parent.
  if (mergeInProgress()) return EXIT_OK;

  let raw;
  try {
    raw = readFile(argv[0]);
  } catch (err) {
    error(`Could not read commit message file: ${err.message}`);
    return EXIT_USAGE;
  }

  const message = cleanCommitMessage(raw, commentChar());
  const { author, committer } = identity();
  const failures = await lintCommitMessage({ message, author, committer });

  if (failures.length === 0) return EXIT_OK;

  error(formatFailure(failures[0]));
  return EXIT_FAILED;
}

module.exports = main;
module.exports.readCommentChar = readCommentChar;
module.exports.defaultMergeInProgress = defaultMergeInProgress;
module.exports.formatFailure = formatFailure;

/* istanbul ignore next - process wiring, exercised by the hook itself */
if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`dco-check: ${err.message}`);
      process.exit(EXIT_USAGE);
    });
}
