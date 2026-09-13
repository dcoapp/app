// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Resolves the identity git would record for the commit being created.
//
// `git var` is used rather than `git config user.name`/`user.email` because it
// reports the identity git has actually resolved, honouring the GIT_AUTHOR_*
// and GIT_COMMITTER_* environment variables and the usual config precedence.
// Reading the config keys directly would disagree with the commit whenever
// either is set, and would then disagree with the DCO app's verdict too.
//
// Author and committer are read separately because lib/dco.js accepts a
// trailer matching either one, exactly as the app does on a pull request.

const { execFileSync } = require("node:child_process");

// "Name <email> 1700000000 +0000". The name may contain anything, so the
// trailing timestamp is what anchors the split.
const IDENT = /^(.*) <([^>]*)> \d+ [+-]\d{4}$/;

function runGitVar(variable) {
  return execFileSync("git", ["var", variable], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseIdent(variable, value) {
  const match = IDENT.exec(value.trim());
  if (!match) {
    throw new Error(`Could not parse ${variable}: ${value.trim()}`);
  }
  return { name: match[1], email: match[2] };
}

/**
 * @param {(variable: string) => string} [run] injection point for tests
 * @returns {{author: {name: string, email: string},
 *            committer: {name: string, email: string}}}
 */
module.exports = function readLocalIdentity(run = runGitVar) {
  return {
    author: parseIdent("GIT_AUTHOR_IDENT", run("GIT_AUTHOR_IDENT")),
    committer: parseIdent("GIT_COMMITTER_IDENT", run("GIT_COMMITTER_IDENT")),
  };
};

module.exports.parseIdent = parseIdent;
