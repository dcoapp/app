// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const getDCOStatus = require("./lib/dco.js");
const hasSignoffTrailer = require("./lib/hasSignoffTrailer.js");
const requireMembers = require("./lib/requireMembers.js");

// GitHub documents a 250-commit cap on the pull request commits REST endpoint.
const PULL_REQUEST_COMMITS_REST_LIMIT = 250;
const PULL_REQUEST_COMMITS_GRAPHQL_PAGE_SIZE = 100;
const PULL_REQUEST_COMMITS_GRAPHQL_PAGE_MARGIN = 1;
// The compare endpoint returns at most 250 commits per page.
const COMPARE_COMMITS_PAGE_SIZE = 100;

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on(["pull_request.opened", "pull_request.synchronize"], check);

  async function check(
    context,
    pr = context.payload.pull_request,
    { reportSha, reportRef, mergeGroup } = {}
  ) {
    const timeStart = new Date();
    const sha = reportSha || pr.head.sha;
    const ref = (reportRef || pr.head.ref).replace(/^refs\/heads\//, "");

    let commits;
    let dcoFailed;
    let synthesizedFailed = [];
    let allowRemediationCommits;
    let noPullRequestCommits = false;
    try {
      const config = await context.config("dco.yml", {
        require: {
          members: true,
        },
        allowRemediationCommits: {
          individual: false,
          thirdParty: false,
        },
      });
      const requireForMembers = config.require.members;
      allowRemediationCommits = config.allowRemediationCommits;

      if (mergeGroup) {
        ({ commits, synthesizedFailed } = await inspectMergeGroup(
          context,
          pr,
          mergeGroup
        ));
      } else {
        commits = await listPullRequestCommits(context, pr);
        noPullRequestCommits = commits.length === 0;
      }

      if (!noPullRequestCommits) {
        dcoFailed = await getDCOStatus(
          commits,
          requireMembers(requireForMembers, context),
          pr.html_url,
          allowRemediationCommits
        );
      }
    } catch (error) {
      context.log.error(error, "failed to evaluate DCO check");
      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "failure",
        summary: evaluationErrorSummary(error),
      });
      return;
    }

    if (noPullRequestCommits) {
      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "neutral",
        summary:
          "The DCO check could not be evaluated because GitHub returned no commits for this pull request.\n\nPlease retry by re-running the check or pushing a new commit.",
      });
      return;
    }

    const allFailed = synthesizedFailed.concat(dcoFailed);

    if (!allFailed.length) {
      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "success",
        summary: "All commits are signed off!",
      });
    } else {
      let summary = [];
      allFailed.forEach(function (commit) {
        summary.push(
          `Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${
            commit.author
          }, Committer: ${commit.committer}; ${commit.message}`
        );
      });
      summary = summary.join("\n");

      // The remediation boilerplate is addressed to the contributor, so it is
      // only emitted for the failures the contributor can actually act on. A
      // merge queue commit missing its trailer is a repository configuration
      // problem and gets its own explanation instead.
      let guidance = "";
      if (dcoFailed.length) {
        guidance += handleCommits(
          pr,
          commits.length,
          dcoFailed,
          allowRemediationCommits
        );
      }
      if (synthesizedFailed.length) {
        guidance += mergeQueueSignoffSummary(dcoFailed.length > 0);
      }

      summary = `${guidance}\n\n### Summary\n\n${summary}`;

      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "action_required",
        summary,
        // The "Set DCO to pass" action resolves a check run back to its pull
        // request, and check_run.pull_requests is empty for merge group check
        // runs, so the override is offered on pull requests only.
        actions: mergeGroup
          ? undefined
          : [
              {
                label: "Set DCO to pass",
                description: "would set status to passing",
                identifier: "override",
              },
            ],
      });
    }
  }

  // Classifies the commits in a merge group's compare range.
  //
  // GitHub's merge queue does not merge the pull request's own commits: it
  // builds new ones. Under the squash strategy the synthesized commit's author
  // identity comes from the GitHub *account* (display name, and an
  // `<id>+<login>@users.noreply.github.com` address when email privacy is on),
  // while the `Signed-off-by` trailer is carried over verbatim from the
  // original commit and still holds the original *git* identity. Requiring
  // those to match is unsatisfiable, so the certification is evaluated against
  // the pull request's own commits and the synthesized commits are only
  // asserted to still carry a trailer.
  //
  // A range commit is SYNTHESIZED if and only if its sha is absent from the
  // resolved pull request's commit list. Committer shape is deliberately not
  // used: a commit made through the GitHub web editor is indistinguishable
  // from a squashed merge queue commit by that measure (one parent, committer
  // `GitHub <noreply@github.com>`, committer login `web-flow`) and would be
  // silently downgraded from identity matching to presence only.
  async function inspectMergeGroup(context, pr, mergeGroup) {
    const rangeCommits = await listMergeGroupRangeCommits(context, mergeGroup);

    const commits = await listPullRequestCommits(context, pr);
    if (commits.length === 0) {
      // Fail closed. The pull request commits are the only place the sign-off
      // certification can be verified, so without them there is no verdict.
      const error = new Error(
        `GitHub returned no commits for pull request #${pr.number}.`
      );
      error.emptyMergeGroupCommitList = true;
      throw error;
    }

    const prShas = new Set(commits.map((commit) => commit.sha));
    const synthesizedFailed = [];

    for (const commit of rangeCommits) {
      // A genuine pull request commit: evaluated with full identity matching.
      if (prShas.has(commit.sha)) continue;
      // The merge strategy's two-parent head, authored by whoever enqueued the
      // pull request and carrying no sign-off of its own.
      if (commit.parents.length > 1) continue;
      if (commit.author?.type === "Bot") continue;
      // The rebase strategy is assumed to produce one rewritten copy of each
      // original commit, each retaining its trailer. That shape is an
      // assumption: no public repository using a merge queue with the rebase
      // strategy was found to verify it against.
      if (hasSignoffTrailer(commit.commit.message)) continue;

      synthesizedFailed.push({
        sha: commit.sha,
        // A synthesized commit is by definition absent from the pull request's
        // commit list, so the /pull/<n>/commits/<sha> form lib/dco.js uses for
        // genuine pull request commits would 404. The compare payload already
        // carries the authoritative /commit/<sha> link.
        url: commit.html_url,
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        committer: commit.commit.committer.name,
        message:
          "The merge queue built this commit without a Signed-off-by trailer.",
      });
    }

    return { commits, synthesizedFailed };
  }

  // The compare endpoint caps its `commits` array, so under the merge strategy
  // a large pull request truncates the range. Every commit in the range has to
  // be seen for the "no synthesized commit lost its trailer" invariant to hold,
  // so page until the whole range is collected.
  //
  // octokit's paginate() cannot be used here: this endpoint returns an object
  // rather than an array, and normalizePaginatedListResponse mangles it (it
  // mistakes `status: "ahead"` for the namespaced list key and throws). Page
  // manually instead.
  async function listMergeGroupRangeCommits(context, mergeGroup) {
    // Keyed on sha: dedupes and preserves insertion order in one structure.
    // Counting raw entries instead would let a compare endpoint that ignored
    // the `page` parameter satisfy the completeness check with duplicates of
    // page 1, defeating the fail-closed backstop with the same inflated count
    // the backstop relies on.
    const commits = new Map();
    let totalCommits = 0;
    let page = 1;

    for (;;) {
      const response = await context.octokit.rest.repos.compareCommits(
        context.repo({
          base: mergeGroup.base_sha,
          head: mergeGroup.head_sha,
          per_page: COMPARE_COMMITS_PAGE_SIZE,
          page,
        })
      );

      totalCommits = response.data.total_commits;
      const seenBefore = commits.size;
      for (const commit of response.data.commits) {
        commits.set(commit.sha, commit);
      }

      if (commits.size >= totalCommits) break;
      // An iteration that adds no new commit would otherwise loop forever.
      // This covers both an empty page and a page repeated verbatim; the
      // shortfall check below then fails the group closed.
      if (commits.size === seenBefore) break;

      page += 1;
    }

    if (commits.size < totalCommits) {
      const error = new Error(
        `GitHub returned ${commits.size} of ${totalCommits} merge group commits.`
      );
      error.truncatedMergeGroupRange = true;
      throw error;
    }

    return [...commits.values()];
  }

  async function listPullRequestCommits(context, pr) {
    const commits = await context.octokit.paginate(
      context.octokit.rest.pulls.listCommits,
      context.repo({ pull_number: pr.number, per_page: 100 })
    );

    if (commits.length !== PULL_REQUEST_COMMITS_REST_LIMIT) {
      return commits;
    }

    return fetchCompletePullRequestCommits(context, pr);
  }

  async function fetchCompletePullRequestCommits(context, pr) {
    try {
      const commits = [];
      const commitShas = new Set();
      let cursor = null;
      let hasNextPage = true;
      let expectedCommitCount;
      let maxPages;
      let pageCount = 0;

      while (hasNextPage) {
        const response = await context.octokit.graphql(
          `query PullRequestCommits(
            $owner: String!
            $repo: String!
            $pullNumber: Int!
            $cursor: String
            $pageSize: Int!
          ) {
            repository(owner: $owner, name: $repo) {
              pullRequest(number: $pullNumber) {
                commits(first: $pageSize, after: $cursor) {
                  totalCount
                  nodes {
                    commit {
                      oid
                      url
                      message
                      author {
                        name
                        email
                        date
                        user {
                          login
                          __typename
                        }
                      }
                      committer {
                        name
                        email
                        date
                        user {
                          login
                          __typename
                        }
                      }
                      signature {
                        isValid
                        state
                        signature
                        payload
                      }
                      parents(first: 100) {
                        nodes {
                          oid
                          url
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }`,
          context.repo({
            pullNumber: pr.number,
            cursor,
            pageSize: PULL_REQUEST_COMMITS_GRAPHQL_PAGE_SIZE,
          })
        );
        const connection = response.repository.pullRequest.commits;
        pageCount += 1;
        if (connection.totalCount < PULL_REQUEST_COMMITS_REST_LIMIT) {
          throw new Error(
            `GraphQL reported only ${connection.totalCount} pull request commits.`
          );
        }
        if (expectedCommitCount === undefined) {
          expectedCommitCount = connection.totalCount;
          maxPages =
            Math.ceil(
              expectedCommitCount / PULL_REQUEST_COMMITS_GRAPHQL_PAGE_SIZE
            ) + PULL_REQUEST_COMMITS_GRAPHQL_PAGE_MARGIN;
        } else if (connection.totalCount !== expectedCommitCount) {
          throw new Error(
            `GraphQL totalCount changed from ${expectedCommitCount} to ${connection.totalCount}.`
          );
        }

        for (const node of connection.nodes) {
          const commit = mapGraphQLCommit(node);
          if (commitShas.has(commit.sha)) {
            throw new Error(
              `GraphQL returned duplicate pull request commit ${commit.sha}.`
            );
          }
          commitShas.add(commit.sha);
          commits.push(commit);
        }

        hasNextPage = connection.pageInfo.hasNextPage;
        const previousCursor = cursor;
        cursor = connection.pageInfo.endCursor;

        if (hasNextPage && !cursor) {
          throw new Error("GraphQL pagination ended without a cursor.");
        }
        if (hasNextPage && cursor === previousCursor) {
          throw new Error("GraphQL pagination cursor did not advance.");
        }
        if (hasNextPage && pageCount >= maxPages) {
          throw new Error("GraphQL commit pagination exceeded expected pages.");
        }
      }

      if (commitShas.size !== expectedCommitCount) {
        throw new Error(
          `GraphQL returned ${commitShas.size} of ${expectedCommitCount} pull request commits.`
        );
      }

      return commits;
    } catch (error) {
      error.incompleteCommitList = true;
      throw error;
    }
  }

  function mapGraphQLCommit(node) {
    const commit = node.commit;
    const signature = commit.signature || {
      isValid: false,
      state: "unsigned",
      signature: null,
      payload: null,
    };

    return {
      sha: commit.oid,
      html_url: commit.url,
      author: mapGraphQLUser(commit.author.user),
      committer: mapGraphQLUser(commit.committer.user),
      parents: commit.parents.nodes.map((parent) => ({
        sha: parent.oid,
        html_url: parent.url,
      })),
      commit: {
        author: {
          name: commit.author.name,
          email: commit.author.email,
          date: commit.author.date,
        },
        committer: {
          name: commit.committer.name,
          email: commit.committer.email,
          date: commit.committer.date,
        },
        message: commit.message,
        verification: {
          verified: signature.isValid,
          reason: signature.state,
          signature: signature.signature,
          payload: signature.payload,
          verified_at: null,
        },
      },
    };
  }

  function mapGraphQLUser(user) {
    if (!user) {
      return null;
    }

    return {
      login: user.login,
      type: user.login.endsWith("[bot]") ? "Bot" : user.__typename,
    };
  }

  async function reportDCO(
    context,
    { sha, ref, timeStart, conclusion, summary, actions }
  ) {
    const params = {
      name: "DCO",
      head_sha: sha,
      status: "completed",
      started_at: timeStart,
      conclusion,
      completed_at: new Date(),
      output: {
        title: "DCO",
        summary,
      },
    };
    if (ref) params.head_branch = ref;
    if (actions) params.actions = actions;

    try {
      await context.octokit.rest.checks.create(context.repo(params));
    } catch (error) {
      context.log.error(error, "failed to create DCO check");
      throw error;
    }
  }

  function evaluationErrorSummary(error) {
    const requestId =
      error.response?.headers?.["x-github-request-id"] || "unavailable";
    if (error.emptyMergeGroupCommitList) {
      return `The DCO check could not be evaluated because GitHub returned no commits for the pull request in this merge group.

The sign-off certification is verified against the pull request's own commits, so without them there is no verdict to report.

Please retry by re-running the check or removing and re-adding the pull request to the merge queue.`;
    }
    if (error.truncatedMergeGroupRange) {
      // Internally detected: every compare request can have succeeded, so
      // there is no meaningful HTTP status or request ID to report here.
      return `The DCO check could not be evaluated because the complete merge group commit range could not be retrieved.

Every commit in the range has to be examined before the merge group can be certified, so a partial range gives no verdict.

Please retry by re-running the check, or by removing and re-adding the pull request to the merge queue.`;
    }
    if (error.incompleteCommitList) {
      return `The DCO check could not be evaluated because the complete pull request commit list could not be retrieved.

GitHub returned 250 commits from the REST API, so the app attempted to retrieve the full list through GraphQL before evaluating the pull request. That fallback did not complete, so the DCO verdict is unknown.

HTTP status: ${error.status || "unknown"}
GitHub request ID: ${requestId}

Please retry by re-running the check or pushing a new commit.`;
    }

    return `The DCO check could not be evaluated because an error occurred while gathering or evaluating commits.

HTTP status: ${error.status || "unknown"}
GitHub request ID: ${requestId}

Please retry by re-running the check or pushing a new commit.`;
  }

  app.on("merge_group.checks_requested", async (context) => {
    const mergeGroup = context.payload.merge_group;
    const reportSha = mergeGroup.head_sha;
    const reportRef = mergeGroup.head_ref.replace(/^refs\/heads\//, "");
    const match = mergeGroup.head_ref.match(
      /(?:^|\/)gh-readonly-queue\/.+\/pr-(\d+)-/
    );
    if (!match) {
      await reportDCO(context, {
        sha: reportSha,
        ref: reportRef,
        timeStart: new Date(),
        conclusion: "failure",
        summary: `The DCO check could not be evaluated because the merge group head ref has an unrecognized format: ${mergeGroup.head_ref}.

A maintainer can retry the merge queue entry. If this keeps happening, please report the merge group payload to the DCO app maintainers.`,
      });
      return;
    }
    const prNumber = parseInt(match[1], 10);

    let pr;
    try {
      ({ data: pr } = await context.octokit.rest.pulls.get(
        context.repo({ pull_number: prNumber })
      ));
    } catch (error) {
      context.log.error(error, `merge_group: could not fetch PR #${prNumber}`);
      const reason =
        error.status === 404
          ? `pull request #${prNumber} was not found`
          : error.status === 403
            ? `pull request #${prNumber} could not be accessed`
            : `pull request #${prNumber} could not be fetched`;
      await reportDCO(context, {
        sha: reportSha,
        ref: reportRef,
        timeStart: new Date(),
        conclusion: "failure",
        summary: `The DCO check could not be evaluated because ${reason}.

A maintainer can retry the merge queue entry after confirming the pull request still exists and the DCO app can access it.`,
      });
      return;
    }

    await check(context, pr, {
      // Report the check result on the merge group's temporary merge commit.
      reportSha,
      reportRef,
      // merge_group.base_sha is the PARENT of the merge group head, so the
      // compare range always covers exactly one pull request. Batching does
      // not put several pull requests in one group: GitHub chains one group
      // per pull request, each based on the previous group's head. Sampled
      // across five live merge queues, all 251 distinct gh-readonly-queue
      // refs carried exactly one pr-<number>-<sha> segment.
      //
      // Range cardinality still varies by the queue's merge method: squash
      // yields a single synthesized commit, merge yields the pull request's
      // own commits plus a two-parent head, and rebase yields one rewritten
      // copy per original commit.
      mergeGroup,
    });
  });

  app.on("check_run.rerequested", onCheckRunRerequested);
  async function onCheckRunRerequested(context) {
    const checkRun = context.payload.check_run;
    const ref = checkRun.check_suite.head_branch;
    const pullRequest = checkRun.pull_requests[0];

    if (!pullRequest) {
      await reportDCO(context, {
        sha: checkRun.head_sha,
        ref,
        timeStart: new Date(),
        conclusion: "failure",
        summary:
          "The DCO check could not be evaluated because this check run is not associated with a pull request.\n\nPlease retry by pushing a new commit or opening a pull request with this commit.",
      });
      return;
    }

    let pr;
    try {
      ({ data: pr } = await context.octokit.rest.pulls.get(
        context.repo({ pull_number: pullRequest.number })
      ));
    } catch (error) {
      context.log.error(
        error,
        `check_run: could not fetch PR #${pullRequest.number}`
      );
      await reportDCO(context, {
        sha: checkRun.head_sha,
        ref,
        timeStart: new Date(),
        conclusion: "failure",
        summary: `The DCO check could not be evaluated because pull request #${pullRequest.number} could not be fetched.

Please retry by re-running the check or pushing a new commit.`,
      });
      return;
    }

    if (pr.head.sha !== checkRun.head_sha) {
      await reportDCO(context, {
        sha: checkRun.head_sha,
        ref,
        timeStart: new Date(),
        conclusion: "neutral",
        summary: `This DCO check was re-run for a commit that has been superseded by the current pull request head.

Current pull request head: ${pr.head.sha}

Please use the DCO check on the current pull request head, or push a new commit to trigger a fresh check.`,
      });
      return;
    }

    await check(context, pr, {
      reportSha: checkRun.head_sha,
      reportRef: ref,
    });
  }

  function isRecheckCommand(body) {
    if (!body) return false;
    return body
      .split(/\r?\n/)
      .some((line) => line.trim().toLowerCase() === "@dcoapp recheck");
  }

  app.on("pull_request_review.submitted", onRecheckReview);
  async function onRecheckReview(context) {
    const { review, pull_request: pr } = context.payload;
    if (review.user.type === "Bot") return;
    if (pr.state !== "open") return;
    if (!isRecheckCommand(review.body)) return;
    await check(context, pr);
  }

  app.on("pull_request_review_comment.created", onRecheckReviewComment);
  async function onRecheckReviewComment(context) {
    const { comment, pull_request: pr } = context.payload;
    if (comment.user.type === "Bot") return;
    if (pr.state !== "open") return;
    if (!isRecheckCommand(comment.body)) return;
    await check(context, pr);
  }

  // This option is only presented to users with Write Access to the repo
  app.on("check_run.requested_action", setStatusPass);
  async function setStatusPass(context) {
    const timeStart = new Date();

    await context.octokit.rest.checks.create(
      context.repo({
        name: "DCO",
        head_branch: context.payload.check_run.check_suite.head_branch,
        head_sha: context.payload.check_run.head_sha,
        status: "completed",
        started_at: timeStart,
        conclusion: "success",
        completed_at: new Date(),
        output: {
          title: "DCO",
          summary: "Commit sign-off was manually approved.",
        },
      })
    );
  }
};

// The reassurance that contributors need do nothing is only true when the
// merge queue commit is the *sole* failure. When the pull request's own
// commits also failed, that line would contradict the remediation
// instructions rendered directly above it and tell a contributor with
// genuinely unsigned commits to ignore a real problem, so a variant that
// names both problems separately is emitted instead.
function mergeQueueSignoffSummary(prCommitsAlsoFailed) {
  const preamble = prCommitsAlsoFailed
    ? `There are **two separate problems** here, and fixing either one alone is not enough.

**1. The contributor** must sign off the pull request commits listed above, following the instructions in that section.

**2. Separately, a maintainer** should check the repository's configuration: GitHub's merge queue does not merge the pull request's commits, it builds a new one, and the commit it built does not carry a \`Signed-off-by\` trailer either. Even once the pull request commits are signed off, the trailer would be dropped again unless this is also corrected.`
    : `**Contributors do not need to change anything.** This is a repository configuration problem, not a problem with the contribution.

The pull request's own commits are signed off, but GitHub's merge queue does not merge those commits: it builds a new one. The commit the merge queue built does not carry a \`Signed-off-by\` trailer, so the sign-off certification could not be carried through to what would actually be merged.`;

  return `---

### The merge queue commit is missing a \`Signed-off-by\` trailer

${preamble}

Most commonly this is caused by the repository's squash commit message setting, so a maintainer should check that first:

1. Open **Settings → General → Pull Requests** for this repository.
1. Under **Allow squash merging**, look at the default commit message. *Pull request title and description* (\`squash_merge_commit_message: PR_BODY\`) and *Default to pull request title* (\`squash_merge_commit_message: BLANK\`) both discard the original commit messages, and with them every \`Signed-off-by\` trailer.
1. Set it to **Default to pull request title and commit details** (\`squash_merge_commit_message: COMMIT_MESSAGES\`), then remove this pull request from the merge queue and re-queue it.

If that setting already looks right, something else is rewriting the commit message on the way into the queue. Any merge method or automation that replaces the message rather than preserving it will drop the trailer the same way.

---

`;
}

function handleCommits(pr, commitLength, dcoFailed, allowRemediationCommits) {
  let returnMessage = "";

  if (dcoFailed.length === 1) {
    returnMessage =
      "There is one commit incorrectly signed off.  This means that the author of this commit failed to include a Signed-off-by line in the commit message.\n\n";
  } else {
    returnMessage = `There are ${dcoFailed.length} commits incorrectly signed off.  This means that the author(s) of these commits failed to include a Signed-off-by line in their commit message.\n\n`;
  }

  returnMessage =
    returnMessage +
    `To avoid having PRs blocked in the future, always include \`Signed-off-by: Author Name <authoremail@example.com>\` in *every* commit message. You can also do this automatically by using the -s flag (i.e., \`git commit -s\`).

Here is how to fix the problem so that this code can be merged.\n\n`;

  let rebaseWarning = "";

  if (
    allowRemediationCommits.individual ||
    allowRemediationCommits.thirdParty
  ) {
    returnMessage =
      returnMessage +
      `---\n\n### Preferred method: Commit author adds a DCO remediation commit

A *DCO Remediation Commit* contains special text in the commit message that applies a missing Signed-off-by line in a subsequent commit.  The primary benefit of this method is that the project’s history does not change, and there is no risk of breaking someone else’s work.

These authors can unblock this PR by adding a new commit to this branch with the following text in their commit message:\n`;

    let currentAuthor = "";
    dcoFailed.forEach(function (commit, index, dcoFailed) {
      // If the author has changed, we need to write a new section and close any old sections
      if (currentAuthor !== commit.author + " <" + commit.email + ">") {
        // If currentAuthor was already defined it's the end of a section, so write the Signed-off-by
        if (currentAuthor) {
          returnMessage =
            returnMessage + `\nSigned-off-by: ${currentAuthor}\n\`\`\`\n`;
        }
        // Update the currentAuthor and write a new section
        currentAuthor = commit.author + " <" + commit.email + ">";
        returnMessage =
          returnMessage +
          `#### ${commit.author} &lt;${commit.email}&gt;\n\`\`\`\nDCO Remediation Commit for ${commit.author} <${commit.email}>\n\n`;
      }
      // Draft the magic DCO remediation commit text for the author
      // returnMessage = returnMessage + `I, ${commit.author} <${commit.email}> ${commit.sha}\n`
      returnMessage =
        returnMessage +
        `I, ${currentAuthor}, hereby add my Signed-off-by to this commit: ${commit.sha}\n`;

      if (index === dcoFailed.length - 1) {
        returnMessage =
          returnMessage + `\nSigned-off-by: ${currentAuthor}\n\`\`\`\n`;
      }
    });

    returnMessage =
      returnMessage +
      "\n\nPlease note: You should avoid adding empty commits (i.e., `git commit -s --allow-empty`), because these will be discarded if someone rebases the branch / repo.\n";

    if (allowRemediationCommits.thirdParty) {
      returnMessage =
        returnMessage +
        `\n---\n\n### Alternate method: An employer adds a DCO Remediation Commit

If the contents of this commit were contributed on behalf of a third party (generally, the author’s employer), an authorized individual may add a Third-Party DCO Remediation Commit.  This may be necessary if the original author is unavailable to add their own DCO Remediation Commit to this branch.

If you are about to add a Third-Party DCO Remediation Commit under DCO section (b) or (c), be sure you are authorized by your employer to take this action.  Generally speaking, maintainers and other project contributors cannot sign off on behalf of project contributors, unless there is some relationship which permits this action.  It is your responsibility to verify this.

This PR can be unblocked by an authorized third party adding one or more new commits to this branch with the following text in the commit message.  Replace YOUR_COMPANY with your company name, YOUR_NAME with the name of the authorized representative, and YOUR_EMAIL with the representative’s email address.

For the sake of clarity, please use a separate commit per author:\n`;

      currentAuthor = "";
      dcoFailed.forEach(function (commit, index, dcoFailed) {
        // If the author has changed, we need to write a new section and close any old sections
        if (currentAuthor !== commit.author + " <" + commit.email + ">") {
          // If currentAuthor was already defined it's the end of a section, so write the Signed-off-by
          if (currentAuthor) {
            returnMessage =
              returnMessage + "\nSigned-off-by: YOUR_NAME <YOUR_EMAIL>\n```\n";
          }
          // Update the currentAuthor and write a new section
          currentAuthor = commit.author + " <" + commit.email + ">";
          returnMessage =
            returnMessage +
            `#### On behalf of ${commit.author} &lt;${commit.email}&gt;\n\`\`\`\nThird-Party DCO Remediation Commit for ${commit.author} <${commit.email}>\n\n`;
        }
        // Draft the magic DCO remediation commit text for the author
        // returnMessage = returnMessage + `Retroactive-signed-off-by: ${commit.author} <${commit.email}> ${commit.sha}\n`
        returnMessage =
          returnMessage +
          `On behalf of ${commit.author} <${commit.email}>, I, YOUR_NAME <YOUR_EMAIL>, hereby add my Signed-off-by to this commit: ${commit.sha}\n`;

        if (index === dcoFailed.length - 1) {
          returnMessage =
            returnMessage + "\nSigned-off-by: YOUR_NAME <YOUR_EMAIL>\n```\n";
        }
      });
    }
    rebaseWarning = "Least preferred method: ";
  }

  returnMessage =
    returnMessage +
    "\n---\n\n### " +
    rebaseWarning +
    `Rebase the branch

If you have a local git environment and meet the criteria below, one option is to rebase the branch and add your Signed-off-by lines in the new commits.  Please note that if others have already begun work based upon the commits in this branch, this solution will rewrite history and may cause serious issues for collaborators ([described in the git documentation](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) under "The Perils of Rebasing").

You should only do this if:

* You are the only author of the commits in this branch
* You are absolutely certain nobody else is doing any work based upon this branch
* There are no empty commits in the branch (for example, a DCO Remediation Commit which was added using \`--allow-empty\`)

To add your Signed-off-by line to every commit in this branch:

1. Ensure you have a local copy of your branch by [checking out the pull request locally via command line](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/checking-out-pull-requests-locally).
1. In your local branch, run: \`git rebase HEAD~${commitLength} --signoff\`
1. Force push your changes to overwrite the branch: \`git push --force-with-lease origin ${pr.head.ref}\`\n\n---\n\n`;

  return returnMessage;
}
