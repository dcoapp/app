// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));

const { execFileSync } = require("node:child_process");
const readLocalIdentity = require("../lib/localIdentity.js");

const { parseIdent } = readLocalIdentity;

describe("parseIdent", () => {
  test("splits a git ident into name and email", () => {
    expect(
      parseIdent("GIT_AUTHOR_IDENT", "A Name <a@b.co> 1700000000 +0000")
    ).toEqual({ name: "A Name", email: "a@b.co" });
  });

  test("tolerates angle brackets and spaces in the name", () => {
    expect(
      parseIdent("GIT_AUTHOR_IDENT", "Jo <Bloggs> X <jo@b.co> 1700000000 -0500")
    ).toEqual({ name: "Jo <Bloggs> X", email: "jo@b.co" });
  });

  test("throws when the ident cannot be parsed", () => {
    expect(() => parseIdent("GIT_AUTHOR_IDENT", "nonsense")).toThrow(
      "Could not parse GIT_AUTHOR_IDENT: nonsense"
    );
  });
});

describe("readLocalIdentity", () => {
  beforeEach(() => {
    execFileSync.mockReset();
  });

  test("reads author and committer through the injected runner", () => {
    const run = jest.fn((variable) =>
      variable === "GIT_AUTHOR_IDENT"
        ? "Author <author@b.co> 1700000000 +0000\n"
        : "Committer <committer@b.co> 1700000000 +0000\n"
    );

    expect(readLocalIdentity(run)).toEqual({
      author: { name: "Author", email: "author@b.co" },
      committer: { name: "Committer", email: "committer@b.co" },
    });
    expect(run).toHaveBeenCalledWith("GIT_AUTHOR_IDENT");
    expect(run).toHaveBeenCalledWith("GIT_COMMITTER_IDENT");
  });

  test("defaults to invoking git var", () => {
    execFileSync.mockReturnValue("A Name <a@b.co> 1700000000 +0000\n");

    expect(readLocalIdentity()).toEqual({
      author: { name: "A Name", email: "a@b.co" },
      committer: { name: "A Name", email: "a@b.co" },
    });
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["var", "GIT_AUTHOR_IDENT"],
      expect.objectContaining({ encoding: "utf8" })
    );
  });
});
