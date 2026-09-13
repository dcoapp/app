// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const lintCommitMessage = require("../lib/lintMessage.js");

const { toCommitShape } = lintCommitMessage;

const AUTHOR = { name: "A Name", email: "a@b.co" };
const COMMITTER = { name: "A Name", email: "a@b.co" };

function lint(message, author = AUTHOR, committer = COMMITTER) {
  return lintCommitMessage({ message, author, committer });
}

describe("toCommitShape", () => {
  test("presents the pending commit the way lib/dco.js expects", () => {
    const shape = toCommitShape({
      message: "Feat: Thing",
      author: AUTHOR,
      committer: COMMITTER,
    });

    // A null GitHub account is what makes sign-off unconditionally
    // required; an empty parents array is what stops it being read as a
    // merge. Both are load-bearing, so both are asserted.
    expect(shape.author).toBeNull();
    expect(shape.parents).toEqual([]);
    expect(shape.commit.message).toBe("Feat: Thing");
    expect(shape.commit.author).toEqual(AUTHOR);
    expect(shape.commit.committer).toEqual(COMMITTER);
  });
});

describe("lintCommitMessage", () => {
  test("passes when the trailer matches the author", async () => {
    const failures = await lint(
      "Feat: Thing\n\nBody.\n\nSigned-off-by: A Name <a@b.co>"
    );
    expect(failures).toEqual([]);
  });

  test("matching is case-insensitive, as on the server", async () => {
    const failures = await lint(
      "Feat: Thing\n\nBody.\n\nSigned-off-by: a name <A@B.CO>"
    );
    expect(failures).toEqual([]);
  });

  test("accepts a trailer matching the committer rather than the author", async () => {
    const failures = await lint(
      "Feat: Thing\n\nSigned-off-by: Committer <committer@b.co>",
      AUTHOR,
      { name: "Committer", email: "committer@b.co" }
    );
    expect(failures).toEqual([]);
  });

  test("reports a missing trailer", async () => {
    const [failure] = await lint("Feat: Thing\n\nNo trailer here.");
    expect(failure.message).toBe("The sign-off is missing.");
    expect(failure.author).toBe("A Name");
    expect(failure.email).toBe("a@b.co");
  });

  test("reports a trailer that does not match the identity", async () => {
    const [failure] = await lint(
      "Feat: Thing\n\nSigned-off-by: Someone Else <other@example.com>"
    );
    expect(failure.message).toBe(
      'Expected "A Name <a@b.co>", but got "Someone Else <other@example.com>".'
    );
  });

  test("accepts one matching trailer among several", async () => {
    const failures = await lint(
      [
        "Feat: Thing",
        "",
        "Signed-off-by: Someone Else <other@example.com>",
        "Signed-off-by: A Name <a@b.co>",
      ].join("\n")
    );
    expect(failures).toEqual([]);
  });

  test("reports when no trailer among several matches", async () => {
    const [failure] = await lint(
      [
        "Feat: Thing",
        "",
        "Signed-off-by: Someone Else <other@example.com>",
        "Signed-off-by: Another One <another@example.com>",
      ].join("\n")
    );
    expect(failure.message).toContain('Can not find "A Name <a@b.co>"');
  });

  test("rejects an invalid author email", async () => {
    const [failure] = await lint(
      "Feat: Thing\n\nSigned-off-by: A Name <not-an-email>",
      { name: "A Name", email: "not-an-email" },
      { name: "A Name", email: "not-an-email" }
    );
    expect(failure.message).toBe("not-an-email is not a valid email address.");
  });

  test("does not honour remediation trailers for a single pending commit", async () => {
    // Remediation certifies another commit by sha, which cannot exist for a
    // commit that has not been written yet.
    const [failure] = await lint(
      [
        "Feat: Thing",
        "",
        "I, A Name <a@b.co>, hereby add my Signed-off-by to this commit: abc123",
      ].join("\n")
    );
    expect(failure.message).toBe("The sign-off is missing.");
  });
});
