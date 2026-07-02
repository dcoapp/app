// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

const app = require("../../../");

let middlewareReady;

function getMiddleware() {
  if (!middlewareReady) {
    middlewareReady = import("probot")
      .then(({ createNodeMiddleware, createProbot }) =>
        createNodeMiddleware(app, {
          probot: createProbot(),
          webhooksPath: "/api/github/webhooks",
        })
      )
      .catch((error) => {
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
