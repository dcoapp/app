// SPDX-FileCopyrightText: 2018 - 2026 DCO App Contributors
// SPDX-License-Identifier: ISC

module.exports = async (req, res) => {
  try {
    require("./github/webhooks/index.js");
    await import("probot");

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ status: "ok" }));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ status: "error", error: "health check failed" }));
  }
};
