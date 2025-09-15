```markdown
Title: v1.3 — Core+Ingest Streaming+GLPI+Protect+CI + Spec/Peak Locks (deterministic, ledgered)

Scope
- Core primitives (ids, sha256, streaming helpers, Merkle root, monotonic clock, Result<T,E>)
- Ingest: deterministic streaming ZIP (lexicographic NFC sorting, external spill for large headers), traversal/zip-bomb guardrails
- Compression: scaffolding for tokenization and semantic mapping (deterministic)
- Audit: ERS/SIS/GLPI metrics and tests
- Protect: EKG pings (monotonic), deterministic anomaly math, content-addressed quarantine
- Tools: metrics and spec lock scripts, experiments runner
- CI: typecheck, lint, build, test, build PDF (deterministic), pnpm run metrics:check, pnpm run spec:check, ZIP checksum verification

Deliverables included in this PR
- Implementations & scaffolds for: core, ingest, audit (GLPI v1), protect (EKG + quarantine)
- Deterministic Streaming ZIP extractor scaffold with external spill capability and guardrails
- GLPI v1: lineage-aware Damerau–Levenshtein scaffold with normalized score in [0..1], configurable costs
- Quarantine: sha256 content-addressed write pattern
- Tools: tools/metrics-lock.ts + metrics.lock.json, tools/spec-lock.ts + spec.lock.json
- Math Spec LaTeX source: docs/triplexglyphion_math_spec.tex and compiled docs/triplexglyphion_math_spec.pdf (build required)
- Metrics & spec lock enforcement in CI (see .github/workflows/ci.yml)
- fixtures/tgx_a3_vault_example_hooked.json (sanitized)
- docs/ARCHITECTURE.md referencing docs/img/*.png and docs/papers/TriplexGlyphion_SEPAL_GlyphForge.pdf
- CHANGELOG.md updated for v1.3

PR body checklist (these gates must pass in CI)
[ ] Determinism: same fixture ⇒ identical {bundle_sha256, audit_json_sha256, merkle_root}.
[ ] Peaks enforced: ERS≥0.31, SIS≥0.86, GLPI≥0.78 (±0.002).
[ ] Spec lock: PDF SHA-256 equals spec.lock.json.sha256.
[ ] Performance: 500MB ingest ≤ 12 min; peak RAM ≤ 1.2× input.
[ ] Security: traversal, zip-bomb, replay tests green.
[ ] Coverage: ≥95% for core, ingest, audit, protect.
[ ] CHANGELOG.md updated with v1.3.
[ ] Images and TriplexGlyphion_SEPAL_GlyphForge.pdf referenced in docs.

Required CI steps (order enforced):
- pnpm i --frozen-lockfile
- pnpm run typecheck
- pnpm run lint
- pnpm run build
- pnpm run test -- --run
- Build math spec PDF with SOURCE_DATE_EPOCH set to 1710000000
- pnpm run metrics:check
- pnpm run spec:check
- ZIP checksum compare vs TriplexGlyphion_FullProject.zip.sha256

Post-CI: required PR comment (paste these values from CI artifacts)
bundle_sha256=<...>
audit_json_sha256=<...>
merkle_root=<...>
spec_pdf_sha256=<...>
fullproject_zip_expected_sha256=<value from TriplexGlyphion_FullProject.zip.sha256>
fullproject_zip_actual_sha256=<value computed in CI>
```