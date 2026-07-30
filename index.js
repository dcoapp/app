// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const getDCOStatus = require("./lib/dco.js");
const requireMembers = require("./lib/requireMembers.js");

// GitHub documents a 250-commit cap on the pull request commits REST endpoint.
const PULL_REQUEST_COMMITS_REST_LIMIT = 250;
const PULL_REQUEST_COMMITS_GRAPHQL_PAGE_SIZE = 100;
const PULL_REQUEST_COMMITS_GRAPHQL_PAGE_MARGIN = 1;

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  app.on(["pull_request.opened", "pull_request.synchronize"], check);

  async function check(
    context,
    pr = context.payload.pull_request,
    { reportSha, reportRef, baseSha, headSha } = {}
  ) {
    const timeStart = new Date();
    const sha = reportSha || pr.head.sha;
    const ref = (reportRef || pr.head.ref).replace(/^refs\/heads\//, "");

    let commits;
    let dcoFailed;
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

      if (baseSha && headSha) {
        const compare = await context.octokit.rest.repos.compareCommits(
          context.repo({
            base: baseSha,
            head: headSha,
          })
        );
        commits = compare.data.commits;
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

    if (!dcoFailed.length) {
      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "success",
        summary: "All commits are signed off!",
      });
    } else {
      let summary = [];
      dcoFailed.forEach(function (commit) {
        summary.push(
          `Commit sha: [${commit.sha.substr(0, 7)}](${commit.url}), Author: ${
            commit.author
          }, Committer: ${commit.committer}; ${commit.message}`
        );
      });
      summary = summary.join("\n");

      summary =
        handleCommits(pr, commits.length, dcoFailed, allowRemediationCommits) +
        `\n\n### Summary\n\n${summary}`;

      await reportDCO(context, {
        sha,
        ref,
        timeStart,
        conclusion: "action_required",
        summary,
        actions: [
          {
            label: "Set DCO to pass",
            description: "would set status to passing",
            identifier: "override",
          },
        ],
      });
    }
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
      // Compare the full merge group range so all batched PRs are validated.
      // headSha equals reportSha: both target the merge group head commit.
      baseSha: mergeGroup.base_sha,
      headSha: mergeGroup.head_sha,
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
