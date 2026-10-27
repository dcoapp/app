// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const nock = require("nock");
const dco = require("..");

const payload = require("./fixtures/pull_request.opened");
const compareSuccess = require("./fixtures/compare-success");

nock.disableNetConnect();

describe("GraphQL fallback for pull requests over 250 commits", () => {
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

  test("uses only two parent nodes in the GraphQL fallback query", async () => {
    const restCommits = Array.from({ length: 250 }, (_, index) => ({
      ...compareSuccess.commits[0],
      sha: index.toString(16).padStart(40, "0"),
    }));

    const graphqlCommits = restCommits.map((commit) => ({
      commit: {
        oid: commit.sha,
        url: commit.html_url,
        message: commit.commit.message,
        author: {
          ...commit.commit.author,
          user: {
            login: commit.author.login,
            __typename: commit.author.type,
          },
        },
        committer: {
          ...commit.commit.committer,
          user: {
            login: commit.committer.login,
            __typename: commit.committer.type,
          },
        },
        signature: null,
        parents: {
          nodes: commit.parents.slice(0, 2).map((parent) => ({
            oid: parent.sha,
            url: parent.html_url,
          })),
        },
      },
    }));

    const mock = nock("https://api.github.com")
      .get("/repos/robotland/test/contents/.github%2Fdco.yml")
      .reply(404)
      .get("/repos/robotland/.github/contents/.github%2Fdco.yml")
      .reply(404)
      .get("/repos/robotland/test/pulls/113/commits")
      .query({ per_page: "100" })
      .reply(200, restCommits)
      .post("/graphql", (body) => {
        expect(body.query).toContain("parents(first: 2)");
        expect(body.query).not.toContain("parents(first: 100)");
        return true;
      })
      .reply(200, {
        data: {
          repository: {
            pullRequest: {
              commits: {
                totalCount: 250,
                nodes: graphqlCommits,
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        },
      })
      .post("/repos/robotland/test/check-runs", (body) => {
        expect(body.conclusion).toBe("success");
        return true;
      })
      .reply(200);

    await probot.receive({ name: "pull_request", payload });

    expect(mock.isDone()).toBe(true);
  });
});

