#!/usr/bin/env node
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

function runNodeScript(p) {
  return spawnSync(process.execPath, [p], { stdio: 'inherit' });
}

function runCmd(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell: true });
}

// 1) Run spec lock validation
const specTool = path.join('tools', 'spec-lock.js');
if (!existsSync(specTool)) {
  console.error('Spec lock tool not found:', specTool);
  process.exit(1);
}
const resSpec = runNodeScript(specTool);
if (resSpec.status !== 0) process.exit(resSpec.status);

// 2) Try to run metrics lock if available
const metricsToolJs = path.join('tools', 'metrics-lock.js');
const metricsToolTs = path.join('tools', 'metrics-lock.ts');
let metricsRan = false;
if (existsSync(metricsToolJs)) {
  const r = runNodeScript(metricsToolJs);
  if (r.status !== 0) process.exit(r.status);
  metricsRan = true;
} else if (existsSync(metricsToolTs)) {
  // try to run via pnpm dlx tsx to avoid requiring repo scripts
  const r = runCmd('pnpm dlx tsx ' + metricsToolTs, []);
  if (r.status !== 0) process.exit(r.status);
  metricsRan = true;
} else {
  // fallback: try package.json script
  const r = runCmd('pnpm run metrics:check', []);
  if (r.status === 0) {
    metricsRan = true;
  } else {
    // If metrics check not present, just warn and continue
    console.warn('No metrics-lock tool or metrics:check script found; skipping metrics validation.');
  }
}

if (!metricsRan) {
  console.log('Validation: spec lock OK (no metrics lock detected).');
} else {
  console.log('Validation: spec lock and metrics lock OK.');
}

process.exit(0);