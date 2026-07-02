// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const mockMiddleware = jest.fn((req, res, next) => ({ req, res, next }));
const mockCreateNodeMiddleware = jest.fn();
const mockCreateProbot = jest.fn();
const mockProbot = {};

const mockProbotModuleFactory = jest.fn(() => ({
  createNodeMiddleware: mockCreateNodeMiddleware,
  createProbot: mockCreateProbot,
}));

jest.unstable_mockModule("probot", mockProbotModuleFactory);

function loadHandler() {
  jest.resetModules();
  return require("../api/github/webhooks/index.js");
}

describe("GitHub webhook serverless handler", () => {
  beforeEach(() => {
    mockMiddleware.mockClear();
    mockProbotModuleFactory.mockClear();
    mockCreateNodeMiddleware.mockReset();
    mockCreateProbot.mockReset();
    mockCreateProbot.mockReturnValue(mockProbot);
  });

  test("loads Probot lazily through dynamic import", async () => {
    mockCreateNodeMiddleware.mockResolvedValue(mockMiddleware);

    const handler = loadHandler();
    const req = {};
    const res = {};
    const next = jest.fn();

    expect(mockProbotModuleFactory).not.toHaveBeenCalled();
    expect(mockCreateProbot).not.toHaveBeenCalled();
    expect(mockCreateNodeMiddleware).not.toHaveBeenCalled();

    await expect(handler(req, res, next)).resolves.toStrictEqual({
      req,
      res,
      next,
    });

    expect(mockProbotModuleFactory).toHaveBeenCalledTimes(1);
    expect(mockCreateProbot).toHaveBeenCalledTimes(1);
    expect(mockCreateNodeMiddleware).toHaveBeenCalledTimes(1);
  });

  test("delegates requests to the Probot middleware", async () => {
    mockCreateNodeMiddleware.mockResolvedValue(mockMiddleware);

    const handler = loadHandler();
    expect(mockProbotModuleFactory).not.toHaveBeenCalled();
    expect(mockCreateProbot).not.toHaveBeenCalled();
    expect(mockCreateNodeMiddleware).not.toHaveBeenCalled();

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

  test("shares middleware initialization across concurrent requests", async () => {
    mockCreateNodeMiddleware.mockResolvedValue(mockMiddleware);

    const handler = loadHandler();
    const req1 = {};
    const res1 = {};
    const next1 = jest.fn();
    const req2 = {};
    const res2 = {};
    const next2 = jest.fn();

    await expect(
      Promise.all([handler(req1, res1, next1), handler(req2, res2, next2)])
    ).resolves.toStrictEqual([
      { req: req1, res: res1, next: next1 },
      { req: req2, res: res2, next: next2 },
    ]);

    expect(mockProbotModuleFactory).toHaveBeenCalledTimes(1);
    expect(mockCreateProbot).toHaveBeenCalledTimes(1);
    expect(mockCreateNodeMiddleware).toHaveBeenCalledTimes(1);
    expect(mockMiddleware).toHaveBeenCalledTimes(2);
    expect(mockMiddleware).toHaveBeenCalledWith(req1, res1, next1);
    expect(mockMiddleware).toHaveBeenCalledWith(req2, res2, next2);
  });

  test("retries middleware initialization after a failure", async () => {
    const error = new Error("middleware failed");
    mockCreateNodeMiddleware
      .mockImplementationOnce(() => {
        throw error;
      })
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
    expect(mockCreateProbot).toHaveBeenCalledTimes(2);
    expect(mockMiddleware).toHaveBeenCalledTimes(1);
  });
});
