// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const mockWebhookHandler = jest.fn();
const mockWebhookModuleFactory = jest.fn(() => mockWebhookHandler);
const mockProbotModuleFactory = jest.fn(() => ({}));

jest.mock("../api/github/webhooks/index.js", () => mockWebhookModuleFactory());
jest.unstable_mockModule("probot", mockProbotModuleFactory);

function loadHandler() {
  jest.resetModules();
  return require("../api/health.js");
}

function createResponse() {
  const res = {
    statusCode: undefined,
    setHeader: jest.fn(),
    end: jest.fn(),
  };

  return res;
}

describe("credential-free health endpoint", () => {
  beforeEach(() => {
    mockWebhookHandler.mockClear();
    mockWebhookModuleFactory.mockClear();
    mockWebhookModuleFactory.mockReturnValue(mockWebhookHandler);
    mockProbotModuleFactory.mockReset();
    mockProbotModuleFactory.mockReturnValue({});
  });

  test("reports ok when runtime modules load", async () => {
    const handler = loadHandler();
    const req = {};
    const res = createResponse();

    await handler(req, res);

    expect(mockWebhookModuleFactory).toHaveBeenCalledTimes(1);
    expect(mockProbotModuleFactory).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith(
      "content-type",
      "application/json"
    );
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ status: "ok" }));
  });

  test("reports errors when a runtime module fails to load", async () => {
    const error = new Error("probot import failed");
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockProbotModuleFactory.mockImplementation(() => {
      throw error;
    });

    try {
      const handler = loadHandler();
      const req = {};
      const res = createResponse();

      await handler(req, res);

      expect(consoleError).toHaveBeenCalledWith(error);
      expect(res.statusCode).toBe(500);
      expect(res.setHeader).toHaveBeenCalledWith(
        "content-type",
        "application/json"
      );
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ status: "error", error: "health check failed" })
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
