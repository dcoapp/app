// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const cleanCommitMessage = require("../lib/commitMessage.js");

describe("cleanCommitMessage", () => {
  test("keeps the message and drops comment lines", () => {
    const raw = [
      "Feat: Add a thing",
      "",
      "Body line.",
      "# Please enter the commit message for your changes.",
      "# On branch main",
      "",
      "Signed-off-by: A <a@b.co>",
      "",
    ].join("\n");

    expect(cleanCommitMessage(raw)).toBe(
      "Feat: Add a thing\n\nBody line.\n\nSigned-off-by: A <a@b.co>"
    );
  });

  test("drops everything below the scissors line", () => {
    // The verbose diff is the reason this module exists: without the cut,
    // a diff touching a line that contains a trailer would satisfy the
    // check and pass a commit the app will reject.
    const raw = [
      "Feat: Add a thing",
      "",
      "# ------------------------ >8 ------------------------",
      "# Do not modify or remove the line above.",
      "diff --git a/CONTRIBUTING.md b/CONTRIBUTING.md",
      "+Signed-off-by: Someone Else <other@example.com>",
    ].join("\n");

    expect(cleanCommitMessage(raw)).toBe("Feat: Add a thing");
  });

  test("does not treat an ordinary comment mentioning >8 as scissors", () => {
    // A comment that merely contains the marker must not cut the message,
    // or a real trailer below it would be discarded and a commit git
    // records as signed off would be rejected.
    const raw = [
      "Feat: Add a thing",
      "# the protocol supports >8 bytes per frame",
      "",
      "Signed-off-by: A <a@b.co>",
    ].join("\n");

    expect(cleanCommitMessage(raw)).toBe(
      "Feat: Add a thing\n\nSigned-off-by: A <a@b.co>"
    );
  });

  test("honours a custom core.commentChar", () => {
    const raw = [
      "Feat: Add a thing",
      "; a semicolon comment",
      "# not a comment when commentChar is ;",
    ].join("\n");

    expect(cleanCommitMessage(raw, ";")).toBe(
      "Feat: Add a thing\n# not a comment when commentChar is ;"
    );
  });

  test("cuts at the scissors line with a custom commentChar", () => {
    const raw = [
      "Feat: Add a thing",
      "; ------------------------ >8 ------------------------",
      "Signed-off-by: Someone Else <other@example.com>",
    ].join("\n");

    expect(cleanCommitMessage(raw, ";")).toBe("Feat: Add a thing");
  });

  test("cuts at the scissors line even when commentChar is misread", () => {
    // core.commentChar=auto can resolve to a character that cannot be
    // re-derived from the finished file, so the cut must not depend on
    // having guessed it correctly.
    const raw = [
      "Feat: Add a thing",
      "@ ------------------------ >8 ------------------------",
      "+Signed-off-by: Someone Else <other@example.com>",
    ].join("\n");

    expect(cleanCommitMessage(raw)).toBe("Feat: Add a thing");
  });

  test("a bare rule of dashes does not truncate the message", () => {
    // Without a punctuation prefix this is body text, not git's scissors,
    // and truncating here would discard the trailer below it.
    const raw = [
      "Feat: Add a thing",
      "------------------------ >8 ------------------------",
      "Signed-off-by: A <a@b.co>",
    ].join("\n");

    expect(cleanCommitMessage(raw)).toBe(
      "Feat: Add a thing\n------------------------ >8 ------------------------\nSigned-off-by: A <a@b.co>"
    );
  });

  test("handles CRLF line endings", () => {
    const raw = "Feat: Add a thing\r\n\r\n# comment\r\nBody.\r\n";

    expect(cleanCommitMessage(raw)).toBe("Feat: Add a thing\n\nBody.");
  });

  test("returns an empty string for a comment-only file", () => {
    expect(cleanCommitMessage("# only\n# comments\n")).toBe("");
  });
});
