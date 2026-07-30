const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const entrypoint = resolve(__dirname, "../dist/index.js");

if (existsSync(entrypoint)) {
  process.exit(0);
}

console.warn(
  "[startup] dist/index.js is missing. Building the workspace server before start.",
);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build"], {
  cwd: resolve(__dirname, ".."),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(
    "[startup] Failed to launch the workspace server build.",
    result.error,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
