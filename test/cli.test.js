// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));

const { execFileSync } = require("node:child_process");
const main = require("../cli.js");

const { readCommentChar, formatFailure, defaultMergeInProgress } = main;

const IDENTITY = {
  author: { name: "A Name", email: "a@b.co" },
  committer: { name: "A Name", email: "a@b.co" },
};

function deps(overrides = {}) {
  return {
    readFile: () => "Feat: Thing\n\nSigned-off-by: A Name <a@b.co>",
    identity: () => IDENTITY,
    commentChar: () => "#",
    mergeInProgress: () => false,
    error: jest.fn(),
    ...overrides,
  };
}

describe("readCommentChar", () => {
  test("falls back to # when the key is unset", () => {
    expect(readCommentChar(() => "")).toBe("#");
  });

  test('falls back to # when set to "auto"', () => {
    expect(readCommentChar(() => "auto")).toBe("#");
  });

  test("uses a configured character", () => {
    expect(readCommentChar(() => ";")).toBe(";");
  });

  describe("default git config reader", () => {
    beforeEach(() => {
      execFileSync.mockReset();
    });

    test("returns the configured value", () => {
      execFileSync.mockReturnValue(";\n");
      expect(readCommentChar()).toBe(";");
      expect(execFileSync).toHaveBeenCalledWith(
        "git",
        ["config", "--get", "core.commentChar"],
        expect.objectContaining({ encoding: "utf8" })
      );
    });

    test("treats a non-zero exit as unset", () => {
      execFileSync.mockImplementation(() => {
        throw new Error("exit status 1");
      });
      expect(readCommentChar()).toBe("#");
    });
  });
});

describe("formatFailure", () => {
  test("names the problem and shows the trailer to add", () => {
    const text = formatFailure({
      author: "A Name",
      email: "a@b.co",
      committer: "A Name",
      message: "The sign-off is missing.",
    });

    expect(text).toContain("The sign-off is missing.");
    expect(text).toContain("Signed-off-by: A Name <a@b.co>");
    expect(text).toContain("git commit -s");
  });
});

describe("defaultMergeInProgress", () => {
  const fs = require("node:fs");

  beforeEach(() => {
    execFileSync.mockReset();
  });

  test("is true while a merge is in progress", () => {
    execFileSync.mockReturnValue(".git/MERGE_HEAD\n");
    const spy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
    try {
      expect(defaultMergeInProgress()).toBe(true);
      expect(spy).toHaveBeenCalledWith(".git/MERGE_HEAD");
    } finally {
      spy.mockRestore();
    }
  });

  test("is false for an ordinary commit", () => {
    execFileSync.mockReturnValue(".git/MERGE_HEAD\n");
    const spy = jest.spyOn(fs, "existsSync").mockReturnValue(false);
    try {
      expect(defaultMergeInProgress()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("main", () => {
  test("skips a merge commit, as the app does", async () => {
    // git runs the commit-msg hook during a merge, but the app exempts
    // commits with more than one parent. Blocking here would disagree
    // with the server.
    const d = deps({
      mergeInProgress: () => true,
      readFile: () => "Merge branch side",
    });
    await expect(main(["/tmp/MERGE_MSG"], d)).resolves.toBe(0);
    expect(d.error).not.toHaveBeenCalled();
  });

  test("exits 0 when the commit is signed off", async () => {
    const d = deps();
    await expect(main(["/tmp/COMMIT_EDITMSG"], d)).resolves.toBe(0);
    expect(d.error).not.toHaveBeenCalled();
  });

  test("exits 1 and explains when the sign-off is missing", async () => {
    const d = deps({ readFile: () => "Feat: Thing\n\nNo trailer." });
    await expect(main(["/tmp/COMMIT_EDITMSG"], d)).resolves.toBe(1);
    expect(d.error.mock.calls[0][0]).toContain("The sign-off is missing.");
  });

  test("strips comments before checking", async () => {
    // A trailer that exists only inside the verbose diff must not count.
    const d = deps({
      readFile: () =>
        [
          "Feat: Thing",
          "# ------------------------ >8 ------------------------",
          "+Signed-off-by: A Name <a@b.co>",
        ].join("\n"),
    });
    await expect(main(["/tmp/COMMIT_EDITMSG"], d)).resolves.toBe(1);
  });

  test("exits 2 with usage when given no argument", async () => {
    const d = deps();
    await expect(main([], d)).resolves.toBe(2);
    expect(d.error.mock.calls[0][0]).toContain("Usage: dco-check");
  });

  test("exits 2 with usage when given too many arguments", async () => {
    const d = deps();
    await expect(main(["a", "b"], d)).resolves.toBe(2);
  });

  test("exits 2 when the message file cannot be read", async () => {
    const d = deps({
      readFile: () => {
        throw new Error("ENOENT: no such file");
      },
    });
    await expect(main(["/nope"], d)).resolves.toBe(2);
    expect(d.error.mock.calls[0][0]).toContain(
      "Could not read commit message file"
    );
  });

  test("uses the real defaults when none are injected", async () => {
    // Exercises the default parameter values for deps itself, readFile,
    // identity, commentChar and error in a single pass.
    execFileSync.mockReturnValue("A Name <a@b.co> 1700000000 +0000\n");
    const fs = require("node:fs");
    const os = require("node:os");
    const path = require("node:path");
    const file = path.join(os.tmpdir(), `dco-cli-${process.pid}.txt`);
    fs.writeFileSync(file, "Feat: Thing\n\nSigned-off-by: A Name <a@b.co>\n");

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(main([file])).resolves.toBe(0);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      fs.unlinkSync(file);
    }
  });
});
