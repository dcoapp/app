// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const nock = require("nock");

const dco = require("..");

const payload = require("./fixtures/pull_request.opened");
const payloadSuccess = require("./fixtures/pull_request.opened-success");
const pullRequestReviewPayload = require("./fixtures/pull_request_review.submitted");
const pullRequestReviewCommentPayload = require("./fixtures/pull_request_review_comment.created");
const mergeGroupPayload = require("./fixtures/merge_group.checks_requested");
const compare = require("./fixtures/compare");
const compareSuccess = require("./fixtures/compare-success");

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

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
        )
        .reply(200, compare)

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

        .get(
          "/repos/octocat/Hello-World/compare/a10867b14bb761a232cd80139fbd4c0d33264240...34c5c7793cb3b279e22454cb6750c80560547b3a"
        )
        .reply(200, compareSuccess)

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

        .get(
          "/repos/octocat/Hello-World/compare/a10867b14bb761a232cd80139fbd4c0d33264240...34c5c7793cb3b279e22454cb6750c80560547b3a"
        )
        .reply(200, compareSuccess)

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

    test("creates a error status if app has no access to checks", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/contents/.github%2Fdco.yml")
        .reply(404)
        .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
        .reply(404)

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
        )
        .reply(200, compare)

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            .reply(200, compare)

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            // override verification status to true from fixtures, without mutating the fixtures
            .reply(200, {
              ...compare,
              commits: compare.commits.map((commit) => ({
                ...commit,
                commit: { ...commit.commit, verification: { verified: true } },
              })),
            })

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            .reply(200, compare)

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            // duplicate commit without mutating the fixtures
            .reply(200, {
              ...compare,
              commits: [compare.commits[0], compare.commits[0]],
            })

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            .reply(200, compare)

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

            .get(
              "/repos/bkeepers/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            .reply(200, compare)

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

            .get(
              "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
            )
            .reply(200, compare)

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

          .get(
            "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
          )
          .reply(200, compare)

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

          .get(
            "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
          )
          // add 2nd commit without mutating the fixtures
          .reply(200, {
            ...compare,
            commits: [
              compare.commits[0],
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
            ],
          })

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

          .get(
            "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
          )
          // add 2nd commit without mutating the fixtures
          .reply(200, {
            ...compare,
            commits: [compare.commits[0], compare.commits[0]],
          })

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

        .get(
          "/repos/octocat/Hello-World/compare/a10867b14bb761a232cd80139fbd4c0d33264240...34c5c7793cb3b279e22454cb6750c80560547b3a"
        )
        .reply(200, compareSuccess)

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

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
        )
        .reply(200, compare)

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

        .get(
          "/repos/robotland/test/compare/607c64cd8e37eb2db939f99a17bee5c7d1a90a31...e76ed6025cec8879c75454a6efd6081d46de4c94"
        )
        .reply(200, compare)

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

    test("skips check when PR lookup fails", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/robotland/test/pulls/113")
        .reply(404);

      await probot.receive({ name: "merge_group", payload: mergeGroupPayload });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("creates a passing check when head_ref has refs/heads/ prefix", async () => {
      const prefixedRefPayload = {
        ...mergeGroupPayload,
        merge_group: {
          ...mergeGroupPayload.merge_group,
          head_ref:
            "refs/heads/gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
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
              "refs/heads/gh-readonly-queue/master/pr-113-e76ed6025cec8879c75454a6efd6081d46de4c94",
            head_sha: "abc123def456abc123def456abc123def456abc1",
            name: "DCO",
            status: "completed",
          });
          return true;
        })
        .reply(200);

      await probot.receive({
        name: "merge_group",
        payload: prefixedRefPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    test("ignores merge_group with unrecognized head_ref format", async () => {
      const unknownRefPayload = {
        ...mergeGroupPayload,
        merge_group: {
          ...mergeGroupPayload.merge_group,
          head_ref: "some-feature-branch/pr-113-abc123",
        },
      };

      const mock = nock("https://api.github.com");

      await probot.receive({
        name: "merge_group",
        payload: unknownRefPayload,
      });

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });
});
