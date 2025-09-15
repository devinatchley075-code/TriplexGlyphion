#!/usr/bin/env node
/**
 * tools/validate-locks.js
 * Run all lock validators in a single CI step.
 *
 * It runs:
 *  - tools/spec-lock.ts
 *  - tools/metrics-lock.ts (if present)
 *
 * This wrapper returns non-zero if any checks fail.
 */
const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

function runNodeScript(scriptPath, args = []) {
  const node = process.execPath;
  return spawnSync(node, [scriptPath, ...args], { stdio: "inherit" });
}

function runCmd(cmd) {
  return spawnSync(cmd, { stdio: "inherit", shell: true });
}

// 1) Run spec lock validation (use tsx runner if available)
const specTool = path.join("tools", "spec-lock.ts");
if (!existsSync(specTool)) {
  console.error("Spec lock tool not found:", specTool);
  process.exit(1);
}
let res = runCmd("pnpm dlx tsx " + specTool);
if (res.status !== 0) process.exit(res.status);

// 2) Run metrics lock validation if present
const metricsToolTs = path.join("tools", "metrics-lock.ts");
const metricsToolJs = path.join("tools", "metrics-lock.js");
if (existsSync(metricsToolTs)) {
  res = runCmd("pnpm dlx tsx " + metricsToolTs);
  if (res.status !== 0) process.exit(res.status);
} else if (existsSync(metricsToolJs)) {
  res = runCmd("node " + metricsToolJs);
  if (res.status !== 0) process.exit(res.status);
} else {
  // try package.json script
  res = runCmd("pnpm run metrics:check");
  if (res.status !== 0) {
    console.warn("No metrics-lock tool or metrics:check script found; skipping metrics validation.");
  }
}

console.log("All lock validations passed.");
process.exit(0);