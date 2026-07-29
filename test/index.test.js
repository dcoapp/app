// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const nock = require("nock");

const dco = require("..");

const payload = require("./fixtures/pull_request.opened");
const payloadSuccess = require("./fixtures/pull_request.opened-success");
const checkRunRerequestedPayload = require("./fixtures/check_run.rerequested");
const pullRequestReviewPayload = require("./fixtures/pull_request_review.submitted");
const pullRequestReviewCommentPayload = require("./fixtures/pull_request_review_comment.created");
const mergeGroupPayload = require("./fixtures/merge_group.checks_requested");
const compare = require("./fixtures/compare");
const compareSuccess = require("./fixtures/compare-success");
const compareSuccessCommits = compareSuccess.commits.map((commit, index) =>
  index === compareSuccess.commits.length - 1
    ? { ...commit, sha: payloadSuccess.pull_request.head.sha }
    : commit
);
const belowRestLimitGraphQLTotalCounts = [249, 0];

function makeCommit(source, index) {
  return {
    ...source,
    sha: index.toString(16).padStart(40, "0"),
  };
}

function graphQLNode(restCommit, options = {}) {
  const authorUser =
    options.authorUser === undefined
      ? {
          login: restCommit.author.login,
          __typename: restCommit.author.type,
        }
      : options.authorUser;
  const committerUser =
    options.committerUser === undefined
      ? {
          login: restCommit.committer.login,
          __typename: restCommit.committer.type,
        }
      : options.committerUser;

  return {
    commit: {
      oid: restCommit.sha,
      url: restCommit.html_url,
      message: restCommit.commit.message,
      author: {
        ...restCommit.commit.author,
        user: authorUser,
      },
      committer: {
        ...restCommit.commit.committer,
        user: committerUser,
      },
      signature: options.signature || null,
      parents: {
        nodes: restCommit.parents.map((parent) => ({
          oid: parent.sha,
          url: parent.html_url,
        })),
      },
    },
  };
}

function graphQLCommits(commits, pageInfo, options = {}) {
  return {
    repository: {
      pullRequest: {
        commits: {
          totalCount: options.totalCount ?? commits.length,
          nodes: commits.map((commit, index) =>
            graphQLNode(commit, options[index])
          ),
          pageInfo,
        },
      },
    },
  };
}

function expectIncompleteCommitListCheck(body) {
  body.started_at = "2018-07-14T18:18:54.156Z";
  body.completed_at = "2018-07-14T18:18:54.156Z";
  expect(body).toMatchObject({
    conclusion: "failure",
    head_branch: "dco-test",
    head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
    name: "DCO",
    output: {
      title: "DCO",
    },
    status: "completed",
  });
  expect(body.output.summary).toContain(
    "complete pull request commit list could not be retrieved"
  );
  expect(body.output.summary).toContain("verdict is unknown");
  expect(body.output.summary).not.toContain("All commits are signed");
  return true;
}

nock.disableNetConnect();

describe("dco", () => {
  let probot;
  let Probot;
  let ProbotOctokit;

  beforeAll(async () => {
    ({ Probot, ProbotOctokit } = await import("probot"));
  });

  beforeEach(async () => {
    probot = new Probot({
      appId: 1,
      githubToken: "test",
      Octokit: ProbotOctokit,
    });
    await probot.load(dco);
  });

  describe("pull_request event", () => {
    test("creates a failing check", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compare.commits)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchSnapshot();
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a passing check", async () => {
      const mock = nock("https://api.github.com")
        // no config
        .get("/repos/octocat/Hello-World/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/octocat/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/octocat/Hello-World/pulls/1/commits")
        .query({ per_page: "100" })
        .reply(200, compareSuccessCommits)

        .post("/repos/octocat/Hello-World/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchSnapshot();

          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload: payloadSuccess });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a passing status if app has no access to checks", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/octocat/Hello-World/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/octocat/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/octocat/Hello-World/pulls/1/commits")
        .query({ per_page: "100" })
        .reply(200, compareSuccessCommits)

        .post("/repos/octocat/Hello-World/check-runs")
        .reply(403)

        .post(
          "/repos/octocat/Hello-World/statuses/34c5c7793cb3b279e22454cb6750c80560547b3a",
          (body) => {
            expect(body).toMatchSnapshot();

            return true;
          }
        )
        .reply(201);

      await probot.receive({ name: "pull_request", payload: payloadSuccess });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a failing check when commits cannot be listed", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(
          422,
          {
            message:
              "Server Error: Sorry, this diff is taking too long to generate.",
            errors: [
              {
                resource: "Comparison",
                field: "diff",
                code: "not_available",
              },
            ],
          },
          {
            "x-github-request-id": "ABC1:DEF2:123456:789ABC",
          }
        )

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "The DCO check could not be evaluated"
          );
          expect(body.output.summary).toContain("HTTP status: 422");
          expect(body.output.summary).toContain(
            "GitHub request ID: ABC1:DEF2:123456:789ABC"
          );
          expect(body.output.summary).not.toContain("Server Error");
          expect(body.output.summary).toContain("re-running the check");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a failing check when config cannot be fetched", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(422, { message: "Invalid request" })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("HTTP status: 422");
          expect(body.output.summary).toContain(
            "GitHub request ID: unavailable"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("escalates exactly 250 REST commits to GraphQL", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql", (body) => {
          expect(body.variables).toMatchObject({
            owner: "robotland",
            repo: "test",
            pullNumber: 113,
            cursor: null,
          });
          return true;
        })
        .reply(200, {
          data: graphQLCommits(
            restCommits,
            {
              hasNextPage: false,
              endCursor: null,
            },
            {
              0: {
                authorUser: null,
                committerUser: null,
                signature: {
                  isValid: true,
                  state: "VALID",
                  signature: "signature",
                  payload: "payload",
                },
              },
            }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("All commits are signed off!");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails when only GraphQL sees a missing sign-off", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const failingCommit = makeCommit(compare.commits[0], 250);
      const commits = [...restCommits, failingCommit];
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(commits, {
            hasNextPage: false,
            endCursor: null,
          }),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("The sign-off is missing.");
          expect(body.output.summary).toContain(failingCommit.sha);
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("preserves bot author handling from GraphQL commits", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const botCommit = makeCommit(compare.commits[0], 250);
      const commits = [...restCommits, botCommit];
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            commits,
            {
              hasNextPage: false,
              endCursor: null,
            },
            {
              250: {
                authorUser: {
                  login: "dependabot[bot]",
                  __typename: "User",
                },
              },
            }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("All commits are signed off!");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("paginates GraphQL commits after REST truncation", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const commits = Array.from({ length: 251 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql", (body) => {
          expect(body.variables.cursor).toBeNull();
          return true;
        })
        .reply(200, {
          data: graphQLCommits(
            commits.slice(0, 100),
            {
              hasNextPage: true,
              endCursor: "cursor-100",
            },
            { totalCount: commits.length }
          ),
        })

        .post("/graphql", (body) => {
          expect(body.variables.cursor).toBe("cursor-100");
          return true;
        })
        .reply(200, {
          data: graphQLCommits(
            commits.slice(100),
            {
              hasNextPage: false,
              endCursor: null,
            },
            { totalCount: commits.length }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("All commits are signed off!");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL commit fetching fails", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          errors: [{ message: "GraphQL unavailable" }],
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "complete pull request commit list could not be retrieved"
          );
          expect(body.output.summary).toContain("verdict is unknown");
          expect(body.output.summary).toContain("HTTP status:");
          expect(body.output.summary).toContain(
            "GitHub request ID: unavailable"
          );
          expect(body.output.summary).not.toContain("All commits are signed");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL returns partial data with errors", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(restCommits, {
            hasNextPage: false,
            endCursor: null,
          }),
          errors: [{ message: "GraphQL returned partial data" }],
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          expectIncompleteCommitListCheck(body);
          expect(body.output.summary).toContain("HTTP status:");
          expect(body.output.summary).toContain(
            "GitHub request ID: unavailable"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL pagination is incomplete", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: true,
              endCursor: null,
            },
            { totalCount: 250 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "complete pull request commit list could not be retrieved"
          );
          expect(body.output.summary).toContain("verdict is unknown");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL pagination exceeds expected pages", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            [],
            {
              hasNextPage: true,
              endCursor: "cursor-60",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            [],
            {
              hasNextPage: true,
              endCursor: "cursor-120",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            [],
            {
              hasNextPage: true,
              endCursor: "cursor-180",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            [],
            {
              hasNextPage: true,
              endCursor: "cursor-240",
            },
            { totalCount: 250 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          expectIncompleteCommitListCheck(body);
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    }, 10_000);

    for (const totalCount of belowRestLimitGraphQLTotalCounts) {
      test(`fails closed when GraphQL totalCount is ${totalCount}`, async () => {
        const restCommits = Array.from({ length: 250 }, (_, index) =>
          makeCommit(compareSuccess.commits[0], index)
        );
        const graphQLCommitsPage = restCommits.slice(0, totalCount);
        const mock = nock("https://api.github.com")
          .get("/repos/robotland/test/contents/.github%2Fdco.yml")
          .reply(404)
          .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
          .reply(404)

          .get("/repos/robotland/test/pulls/113/commits")
          .query({ per_page: "100" })
          .reply(200, restCommits)

          .post("/graphql")
          .reply(200, {
            data: graphQLCommits(
              graphQLCommitsPage,
              {
                hasNextPage: false,
                endCursor: null,
              },
              { totalCount }
            ),
          })

          .post("/repos/robotland/test/check-runs", (body) => {
            expectIncompleteCommitListCheck(body);
            return true;
          })
          .reply(200);

        await probot.receive({ name: "pull_request", payload });

        expect(mock.activeMocks()).toStrictEqual([]);
      });
    }

    test("fails closed when GraphQL totalCount changes between pages", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: true,
              endCursor: "cursor-100",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(100, 200),
            {
              hasNextPage: false,
              endCursor: null,
            },
            { totalCount: 251 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          expectIncompleteCommitListCheck(body);
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL returns too few commits", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: false,
              endCursor: null,
            },
            { totalCount: 251 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "complete pull request commit list could not be retrieved"
          );
          expect(body.output.summary).toContain("verdict is unknown");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL cursor does not advance", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: true,
              endCursor: "cursor-100",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(100, 200),
            {
              hasNextPage: true,
              endCursor: "cursor-100",
            },
            { totalCount: 250 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          expectIncompleteCommitListCheck(body);
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("fails closed when GraphQL returns duplicate commits", async () => {
      const restCommits = Array.from({ length: 250 }, (_, index) =>
        makeCommit(compareSuccess.commits[0], index)
      );
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, restCommits)

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: true,
              endCursor: "cursor-100",
            },
            { totalCount: 250 }
          ),
        })

        .post("/graphql")
        .reply(200, {
          data: graphQLCommits(
            restCommits.slice(0, 100),
            {
              hasNextPage: false,
              endCursor: null,
            },
            { totalCount: 250 }
          ),
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          expectIncompleteCommitListCheck(body);
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a neutral check when no commits are returned", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, [])

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "neutral",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("returned no commits");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("evaluates commits from paginated pull request commits", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compareSuccess.commits, {
          link: '<https://api.github.com/repos/robotland/test/pulls/113/commits?per_page=100&page=2>; rel="next"',
        })

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100", page: "2" })
        .reply(200, compare.commits)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("The sign-off is missing.");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a failing check when commit data cannot be evaluated", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, [{ sha: "e76ed6025cec8879c75454a6efd6081d46de4c94" }])

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("HTTP status: unknown");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("rethrows when the failure check cannot be created", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(422, {
          message:
            "Server Error: Sorry, this diff is taking too long to generate.",
        })

        .post("/repos/robotland/test/check-runs")
        .reply(404);

      await expect(
        probot.receive({ name: "pull_request", payload })
      ).rejects.toThrow();

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("rethrows when the failure status cannot be created", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(422, {
          message:
            "Server Error: Sorry, this diff is taking too long to generate.",
        })

        .post("/repos/robotland/test/check-runs")
        .reply(403)

        .post(
          "/repos/robotland/test/statuses/e76ed6025cec8879c75454a6efd6081d46de4c94"
        )
        .reply(403);

      await expect(
        probot.receive({ name: "pull_request", payload })
      ).rejects.toThrow();

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a error status if app has no access to checks", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compare.commits)

        .post("/repos/robotland/test/check-runs")
        .reply(403)

        .post(
          "/repos/robotland/test/statuses/e76ed6025cec8879c75454a6efd6081d46de4c94",
          (body) => {
            expect(body).toMatchSnapshot();

            return true;
          }
        )
        .reply(201);

      await probot.receive({ name: "pull_request", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    describe("with custom configuration", () => {
      describe("require.members: false", () => {
        test("commit author is org member but commit is not verified", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            .reply(200, compare.commits)

            .get("/orgs/robotland/members/bkeepers")
            .reply(204)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          await probot.receive({ name: "pull_request", payload });

          expect(mock.activeMocks()).toStrictEqual([]);
        });

        test("commit author is org member and commit is verified", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            // override verification status to true from fixtures, without mutating the fixtures
            .reply(
              200,
              compare.commits.map((commit) => ({
                ...commit,
                commit: { ...commit.commit, verification: { verified: true } },
              }))
            )

            .get("/orgs/robotland/members/bkeepers")
            .reply(204)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          await probot.receive({ name: "pull_request", payload });

          expect(mock.activeMocks()).toStrictEqual([]);
        });

        test("commit author is not an org member", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            .reply(200, compare.commits)

            .get("/orgs/robotland/members/bkeepers")
            .reply(404)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          await probot.receive({ name: "pull_request", payload });

          expect(mock.activeMocks()).toStrictEqual([]);
        });

        test("Org membership status is cached in case of multiple commits with same author", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            // duplicate commit without mutating the fixtures
            .reply(200, [compare.commits[0], compare.commits[0]])

            .get("/orgs/robotland/members/bkeepers")
            .reply(204)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          await probot.receive({ name: "pull_request", payload });

          expect(mock.activeMocks()).toStrictEqual([]);
        });

        test("Repository does not belong to an organization or the author", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            .reply(200, compare.commits)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          const { organization, ...payloadWithoutOrganization } = payload;
          await probot.receive({
            name: "pull_request",
            payload: payloadWithoutOrganization,
          });

          expect(mock.activeMocks()).toStrictEqual([]);
        });

        test("Repository belongs to author", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/bkeepers/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
  require:
    members: false`
            )

            .get("/repos/bkeepers/test/pulls/113/commits")
            .query({ per_page: "100" })
            .reply(200, compare.commits)

            .post("/repos/bkeepers/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          const { organization, ...payloadWithoutOrganization } = payload;
          const payloadWithChangedRepositoryOwner = {
            ...payloadWithoutOrganization,
            repository: {
              ...payload.repository,
              owner: {
                ...payload.repository.owner,
                login: "bkeepers",
              },
            },
          };
          await probot.receive({
            name: "pull_request",
            payload: payloadWithChangedRepositoryOwner,
          });

          expect(mock.activeMocks()).toStrictEqual([]);
        });
      });

      describe("allowRemediationCommits.individual: true", () => {
        test("creates a failing check with remidiation instructions", async () => {
          const mock = nock("https://api.github.com")
            .get("/repos/robotland/test/contents/.github%2Fdco.yml")
            // has config
            .reply(
              200,
              `
allowRemediationCommits:
  individual: true`
            )

            .get("/repos/robotland/test/pulls/113/commits")
            .query({ per_page: "100" })
            .reply(200, compare.commits)

            .post("/repos/robotland/test/check-runs", (body) => {
              body.started_at = "2018-07-14T18:18:54.156Z";
              body.completed_at = "2018-07-14T18:18:54.156Z";
              expect(body).toMatchSnapshot();
              return true;
            })
            .reply(200);

          await probot.receive({ name: "pull_request", payload });

          expect(mock.activeMocks()).toStrictEqual([]);
        });
      });
    });

    describe("allowRemediationCommits.thirdParty: true", () => {
      test("creates a failing check with remidiation instructions", async () => {
        const mock = nock("https://api.github.com")
          .get("/repos/robotland/test/contents/.github%2Fdco.yml")
          // has config
          .reply(
            200,
            `
allowRemediationCommits:
  thirdParty: true`
          )

          .get("/repos/robotland/test/pulls/113/commits")
          .query({ per_page: "100" })
          .reply(200, compare.commits)

          .post("/repos/robotland/test/check-runs", (body) => {
            body.started_at = "2018-07-14T18:18:54.156Z";
            body.completed_at = "2018-07-14T18:18:54.156Z";
            expect(body).toMatchSnapshot();
            return true;
          })
          .reply(200);

        await probot.receive({ name: "pull_request", payload });

        expect(mock.activeMocks()).toStrictEqual([]);
      });

      test("multiple commits: creates a failing check with remidiation instructions", async () => {
        const mock = nock("https://api.github.com")
          .get("/repos/robotland/test/contents/.github%2Fdco.yml")
          // has config
          .reply(
            200,
            `
allowRemediationCommits:
  thirdParty: true`
          )

          .get("/repos/robotland/test/pulls/113/commits")
          .query({ per_page: "100" })
          // add 2nd commit without mutating the fixtures
          .reply(200, [
            {
              sha: "<other sha>",
              commit: {
                author: {
                  name: "Not Brandon Keepers",
                  email: "not-bkeepers@github.com",
                  date: "2017-09-22T23:20:56Z",
                },
                committer: {
                  name: "Monalisa Octocat",
                  email: "support@github.com",
                  date: "2021-11-09T23:01:26.210Z",
                },
                message: "Other update README.md",
              },
            },
            compare.commits[0],
          ])

          .post("/repos/robotland/test/check-runs", (body) => {
            body.started_at = "2018-07-14T18:18:54.156Z";
            body.completed_at = "2018-07-14T18:18:54.156Z";
            expect(body).toMatchSnapshot();
            return true;
          })
          .reply(200);

        await probot.receive({ name: "pull_request", payload });

        expect(mock.activeMocks()).toStrictEqual([]);
      });

      test("multiple commits with same author: creates a failing check with remidiation instructions", async () => {
        const mock = nock("https://api.github.com")
          .get("/repos/robotland/test/contents/.github%2Fdco.yml")
          // has config
          .reply(
            200,
            `
allowRemediationCommits:
  thirdParty: true`
          )

          .get("/repos/robotland/test/pulls/113/commits")
          .query({ per_page: "100" })
          // add 2nd commit without mutating the fixtures
          .reply(200, [compare.commits[0], compare.commits[0]])

          .post("/repos/robotland/test/check-runs", (body) => {
            body.started_at = "2018-07-14T18:18:54.156Z";
            body.completed_at = "2018-07-14T18:18:54.156Z";
            expect(body).toMatchSnapshot();
            return true;
          })
          .reply(200);

        await probot.receive({ name: "pull_request", payload });

        expect(mock.activeMocks()).toStrictEqual([]);
      });
    });
  });

  describe("check_run.rerequested event", () => {
    test("creates a failing check for a rerequested DCO check run", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compare.commits)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("The sign-off is missing.");
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "check_run",
        payload: checkRunRerequestedPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a neutral check when the commit was superseded", async () => {
      const supersededPr = structuredClone(payload.pull_request);
      supersededPr.head.sha = "0000000000000000000000000000000000000000";

      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, supersededPr)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "neutral",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("has been superseded");
          expect(body.output.summary).toContain(supersededPr.head.sha);
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "check_run",
        payload: checkRunRerequestedPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check when no pull requests are associated", async () => {
      const payload = structuredClone(checkRunRerequestedPayload);
      payload.check_run.pull_requests = [];
      payload.check_run.check_suite.pull_requests = [];
      payload.check_run.check_suite.head_branch = null;

      const mock = nock("https://api.github.com")
        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body).not.toHaveProperty("head_branch");
          expect(body.output.summary).toContain(
            "not associated with a pull request"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "check_run", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check when pull request lookup fails", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(404)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "pull request #113 could not be fetched"
          );
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "check_run",
        payload: checkRunRerequestedPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("check_run.requested_action event", () => {
    test("creates a passing check", async () => {
      const mock = nock("https://api.github.com")
        .post("/repos/octocat/Hello-World/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchSnapshot();

          return true;
        })
        .reply(200);

      await probot.receive({
        name: "check_run",
        payload: {
          action: "requested_action",
          check_run: {
            head_sha: "<head_sha>",
            check_suite: {
              head_branch: "<head_branch>",
            },
          },
          repository: {
            owner: {
              login: "octocat",
            },
            name: "Hello-World",
          },
        },
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("pull_request_review.submitted event", () => {
    test("ignores reviews from bots", async () => {
      const payload = structuredClone(pullRequestReviewPayload);
      payload.review.user.type = "Bot";

      await probot.receive({ name: "pull_request_review", payload });
    });

    test("ignores reviews on closed pull requests", async () => {
      const payload = structuredClone(pullRequestReviewPayload);
      payload.pull_request.state = "closed";

      await probot.receive({ name: "pull_request_review", payload });
    });

    test("ignores reviews with empty bodies", async () => {
      const payload = structuredClone(pullRequestReviewPayload);
      payload.review.body = null;

      await probot.receive({ name: "pull_request_review", payload });
    });

    test("ignores reviews without the recheck command on its own line", async () => {
      const payload = structuredClone(pullRequestReviewPayload);
      payload.review.body = "please @dcoapp recheck";

      await probot.receive({ name: "pull_request_review", payload });
    });

    test("creates a passing check for recheck reviews", async () => {
      const payload = structuredClone(pullRequestReviewPayload);
      payload.review.body = "please run\n  @DCOApp Recheck  \nthanks";

      const mock = nock("https://api.github.com")
        // no config
        .get("/repos/octocat/Hello-World/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/octocat/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/octocat/Hello-World/pulls/1/commits")
        .query({ per_page: "100" })
        .reply(200, compareSuccessCommits)

        .post("/repos/octocat/Hello-World/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch: "changes",
            head_sha: "34c5c7793cb3b279e22454cb6750c80560547b3a",
            name: "DCO",
            output: {
              summary: "All commits are signed off!",
              title: "DCO",
            },
            status: "completed",
          });

          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request_review", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("pull_request_review_comment.created event", () => {
    test("ignores review comments from bots", async () => {
      const payload = structuredClone(pullRequestReviewCommentPayload);
      payload.comment.user.type = "Bot";

      await probot.receive({ name: "pull_request_review_comment", payload });
    });

    test("ignores review comments on closed pull requests", async () => {
      const payload = structuredClone(pullRequestReviewCommentPayload);
      payload.pull_request.state = "closed";

      await probot.receive({ name: "pull_request_review_comment", payload });
    });

    test("ignores review comments with empty bodies", async () => {
      const payload = structuredClone(pullRequestReviewCommentPayload);
      payload.comment.body = null;

      await probot.receive({ name: "pull_request_review_comment", payload });
    });

    test("ignores review comments without the recheck command on its own line", async () => {
      const payload = structuredClone(pullRequestReviewCommentPayload);
      payload.comment.body = "@dcoapp recheck please";

      await probot.receive({ name: "pull_request_review_comment", payload });
    });

    test("creates a failing check for recheck review comments", async () => {
      const payload = structuredClone(pullRequestReviewCommentPayload);
      payload.comment.body = "Please rerun.\r\n@dcoapp recheck\r\nThanks!";

      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compare.commits)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain("The sign-off is missing.");

          return true;
        })
        .reply(200);

      await probot.receive({ name: "pull_request_review_comment", payload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("checks org membership for require.members: false review comments", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(
          200,
          `
  require:
    members: false`
        )

        .get("/repos/robotland/test/pulls/113/commits")
        .query({ per_page: "100" })
        .reply(200, compare.commits)

        .get("/orgs/robotland/members/bkeepers")
        .reply(204)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch: "dco-test",
            head_sha: "e76ed6025cec8879c75454a6efd6081d46de4c94",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });

          return true;
        })
        .reply(200);

      await probot.receive({
        name: "pull_request_review_comment",
        payload: pullRequestReviewCommentPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("merge_group event", () => {
    test("creates a failing check on merge queue entry", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...abc123def456abc123def456abc123def456abc1"
        )
        .reply(200, compare)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "action_required",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a passing check on merge queue entry", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...abc123def456abc123def456abc123def456abc1"
        )
        .reply(200, compareSuccess)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("falls back to status API when check-runs returns 403", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...abc123def456abc123def456abc123def456abc1"
        )
        .reply(200, compare)

        .post("/repos/robotland/test/check-runs")
        .reply(403)

        .post(
          "/repos/robotland/test/statuses/abc123def456abc123def456abc123def456abc1",
          (body) => {
            expect(body).toMatchSnapshot();
            return true;
          }
        )
        .reply(201);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a failing check when compare commits fails", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...abc123def456abc123def456abc123def456abc1"
        )
        .reply(422, {
          message:
            "Server Error: Sorry, this diff is taking too long to generate.",
          errors: [
            {
              resource: "Comparison",
              field: "diff",
              code: "not_available",
            },
          ],
        })

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            output: {
              title: "DCO",
            },
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "The DCO check could not be evaluated"
          );
          expect(body.output.summary).toContain("HTTP status: 422");
          expect(body.output.summary).toContain(
            "GitHub request ID: unavailable"
          );
          expect(body.output.summary).not.toContain("Server Error");
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check when PR lookup returns 404", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(404)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "pull request #113 was not found"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check when PR lookup returns 403", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(403)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "pull request #113 could not be accessed"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check when PR lookup returns another error", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(422)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "pull request #113 could not be fetched"
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a passing check when head_ref has no refs/heads/ prefix", async () => {
      const bareRefPayload = {
        ...mergeGroupPayload,
        merge_group: {
          ...mergeGroupPayload.merge_group,
          head_ref:
            "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
        },
      };

      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(200, payload.pull_request)

        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...abc123def456abc123def456abc123def456abc1"
        )
        .reply(200, compareSuccess)

        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "success",
            head_branch:
              "gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "merge_group",
        payload: bareRefPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a diagnostic check for unrecognized head_ref format", async () => {
      const unknownRefPayload = {
        ...mergeGroupPayload,
        merge_group: {
          ...mergeGroupPayload.merge_group,
          head_ref: "some-feature-branch/pr-113-abc123",
        },
      };

      const mock = nock("https://api.github.com")
        .post("/repos/robotland/test/check-runs", (body) => {
          body.started_at = "2018-07-14T18:18:54.156Z";
          body.completed_at = "2018-07-14T18:18:54.156Z";
          expect(body).toMatchObject({
            conclusion: "failure",
            head_branch: "some-feature-branch/pr-113-abc123",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          expect(body.output.summary).toContain(
            "unrecognized format: some-feature-branch/pr-113-abc123"
          );
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "merge_group",
        payload: unknownRefPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });
});
