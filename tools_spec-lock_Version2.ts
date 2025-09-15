#!/usr/bin/env tsx
/**
 * tools/spec-lock.ts
 *
 * Verify or update spec.lock.json against the canonical PDF.
 *
 * Usage:
 *   pnpm run spec:check       # verify
 *   pnpm run spec:update      # update lockfile
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import path from "path";

const file = path.join("docs", "triplexglyphion_math_spec.pdf");
const lockPath = "spec.lock.json";

function sha256Of(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

function readPdfSha(): string {
  if (!existsSync(file)) {
    console.error("TG_0010: PDF not found:", file);
    process.exit(1);
  }
  const data = readFileSync(file);
  return sha256Of(data);
}

function updateLock() {
  const sha = readPdfSha();
  const lock = {
    file,
    sha256: sha,
    updated_at: new Date().toISOString(),
    pr_title: "docs(math): update formal spec"
  };
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf-8");
  console.log("Spec lock updated:", lockPath);
  process.exit(0);
}

function verifyLock() {
  if (!existsSync(lockPath)) {
    console.error("TG_0010: spec.lock.json missing. Run `pnpm run spec:update` to create it.");
    process.exit(1);
  }
  const locked = JSON.parse(readFileSync(lockPath, "utf-8"));
  const currentSha = readPdfSha();
  if (locked.sha256 !== currentSha) {
    console.error("TG_0010: Spec PDF hash mismatch. Run `pnpm run spec:update` to update lockfile.");
    process.exit(1);
  }
  // Enforce PR title convention
  if (!locked.pr_title || !/^docs\\(math\\): update formal spec$/.test(locked.pr_title)) {
    console.error('TG_0011: spec.lock.json pr_title invalid or missing. Expected: "docs(math): update formal spec"');
    process.exit(1);
  }
  console.log("Spec verified OK.");
  process.exit(0);
}

const arg = process.argv[2];
if (arg === "update") {
  updateLock();
} else {
  verifyLock();
}