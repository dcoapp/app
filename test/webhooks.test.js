// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const mockMiddleware = jest.fn((req, res, next) => ({ req, res, next }));
const mockCreateNodeMiddleware = jest.fn();
const mockCreateProbot = jest.fn();
const mockProbot = {};

jest.mock("probot", () => ({
  createNodeMiddleware: mockCreateNodeMiddleware,
  createProbot: mockCreateProbot,
}));

function loadHandler() {
  jest.resetModules();
  return require("../api/github/webhooks/index.js");
}

describe("GitHub webhook serverless handler", () => {
  beforeEach(() => {
    mockMiddleware.mockClear();
    mockCreateNodeMiddleware.mockReset();
    mockCreateProbot.mockReset();
    mockCreateProbot.mockReturnValue(mockProbot);
  });

  test("delegates requests to the Probot middleware", async () => {
    mockCreateNodeMiddleware.mockResolvedValue(mockMiddleware);

    const handler = loadHandler();
    const app = require("..");
    const req = {};
    const res = {};
    const next = jest.fn();

    await expect(handler(req, res, next)).resolves.toStrictEqual({
      req,
      res,
      next,
    });
    await handler(req, res, next);

    expect(mockCreateProbot).toHaveBeenCalledTimes(1);
    expect(mockCreateNodeMiddleware).toHaveBeenCalledTimes(1);
    expect(mockCreateNodeMiddleware).toHaveBeenCalledWith(app, {
      probot: mockProbot,
      webhooksPath: "/api/github/webhooks",
    });
    expect(mockMiddleware).toHaveBeenCalledTimes(2);
    expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
  });

  test("retries middleware initialization after a failure", async () => {
    const error = new Error("middleware failed");
    mockCreateNodeMiddleware
      .mockReturnValueOnce(Promise.reject(error))
      .mockResolvedValueOnce(mockMiddleware);

    const handler = loadHandler();
    const req = {};
    const res = {};
    const next = jest.fn();

    await expect(handler(req, res, next)).rejects.toBe(error);
    await expect(handler(req, res, next)).resolves.toStrictEqual({
      req,
      res,
      next,
    });

    expect(mockCreateNodeMiddleware).toHaveBeenCalledTimes(2);
    expect(mockMiddleware).toHaveBeenCalledTimes(1);
  });
});
