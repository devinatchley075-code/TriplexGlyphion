#!/usr/bin/env tsx
/**
 * tools/metrics-lock.ts
 *
 * Example/placeholder metrics lock checker. Adapt to your metrics json structure.
 *
 * Usage:
 *  pnpm run metrics:check
 *  pnpm run metrics:update
 */
import fs from "fs";
import { createHash } from "crypto";
import path from "path";

const metricsLockPath = "metrics.lock.json";
const metricsPath = path.join("artifacts", "metrics.json"); // adjust path to where CI writes metrics

function sha256Of(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

function check() {
  if (!fs.existsSync(metricsLockPath)) {
    console.error("TG_0004: metrics.lock.json missing. Run 'pnpm run metrics:update' to create it.");
    process.exit(1);
  }
  if (!fs.existsSync(metricsPath)) {
    console.error("TG_0004: metrics artifact not found:", metricsPath);
    process.exit(1);
  }
  const metrics = fs.readFileSync(metricsPath);
  const current = sha256Of(metrics);
  const locked = JSON.parse(fs.readFileSync(metricsLockPath, "utf-8"));
  if (locked.sha256 !== current) {
    console.error("TG_0004: Metrics hash mismatch. Run 'pnpm run metrics:update' to update lockfile.");
    process.exit(1);
  }
  // Example numeric peak checks (tweak keys/paths to your metrics JSON)
  const m = JSON.parse(metrics.toString());
  const ers = m.ERS ?? null;
  const sis = m.SIS ?? null;
  const glpi = m.GLPI ?? null;
  function withinPeak(actual: number | null, peak: number) {
    if (actual === null || typeof actual !== "number") return false;
    return Math.abs(actual - peak) <= 0.002 || actual >= peak;
  }
  const peaks = {
    ers: 0.31,
    sis: 0.86,
    glpi: 0.78
  };
  if (!withinPeak(ers, peaks.ers) || !withinPeak(sis, peaks.sis) || !withinPeak(glpi, peaks.glpi)) {
    console.error("TG_0004: One or more metric peaks failed (ERS/SIS/GLPI).");
    process.exit(1);
  }
  console.log("Metrics verified OK.");
  process.exit(0);
}

function update() {
  if (!fs.existsSync(metricsPath)) {
    console.error("metrics artifact not found:", metricsPath);
    process.exit(1);
  }
  const metrics = fs.readFileSync(metricsPath);
  const lock = {
    file: metricsPath,
    sha256: sha256Of(metrics),
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(metricsLockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log("metrics.lock.json updated.");
  process.exit(0);
}

const arg = process.argv[2] || "check";
if (arg === "update") update();
else check();