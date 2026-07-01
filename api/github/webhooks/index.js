// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const { createNodeMiddleware, createProbot } = require("probot");

const app = require("../../../");

let middlewareReady;

function getMiddleware() {
  if (!middlewareReady) {
    middlewareReady = createNodeMiddleware(app, {
      probot: createProbot(),
      webhooksPath: "/api/github/webhooks",
    }).catch((error) => {
      middlewareReady = undefined;
      throw error;
    });
  }

  return middlewareReady;
}

module.exports = async (req, res, next) => {
  const middleware = await getMiddleware();
  return middleware(req, res, next);
};
