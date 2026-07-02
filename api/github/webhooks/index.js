// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

// Ensure @vercel/nft bundles @sentry/node for the serverless function.
// @probot/pino loads it lazily via a dynamic import the tracer cannot
// follow. This guarded static import() is intended only for build-time
// tracing/tests; normal deployments leave the env var unset. The literal
// specifier makes the tracer include @sentry/node's ESM build — the one
// probot imports when SENTRY_DSN is set.
if (process.env.__NFT_TRACE_SENTRY__ === "1") {
  import("@sentry/node").catch(() => {});
}

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
