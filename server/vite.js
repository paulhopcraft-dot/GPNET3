const path = require("path");
const express = require("express");

function setupVite(app, server) {
  console.log("[vite] mock setup called");
  return Promise.resolve();
}

function serveStatic(app) {
  app.use(express.static(path.join(__dirname, "public")));
}

function log(message) {
  console.log(message);
}

exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
exports.log = log;
