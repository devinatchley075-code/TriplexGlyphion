---
```markdown name=docs/MATH_SPEC.md
---
title: "TriplexGlyphion Math Specification"
type: MathSpec
created_by: devinatchley075-code
created_at: 2025-09-15T03:18:35Z
---

# TriplexGlyphion — Formal Math Specification (CAP loop)

This document formalizes the Compress → Audit → Protect (CAP) loop, Codex mutation rules, and ledger guarantees used across TriplexGlyphion.

## 1) Preliminaries & Notation

- Strings and bytes:

  Let r \in {0,1}^* be a byte sequence of length n bytes; alphabet size \Sigma = 256.

- Hash:

  H(x) is SHA-256(x) expressed as hex.

- Deterministic ordering:

  Lexicographic order \prec over file paths uses bytewise comparison under UTF-8 NFC normalization.

- Directed acyclic graph (DAG):

  G = (V,E) is the Codex lineage DAG; |V| glyph IDs, edges parent→child.


## 2) ERS — Entropy Reduction Score

Definition (windowed Shannon estimator).
Partition r into windows r^{(j)} of size w (last window may be shorter). Let \hat{p}_i^{(j)} be the empirical frequency of byte i in window j. The per-window entropy (bits/byte):

\hat{H}(r^{(j)}) = -\sum_{i=0}^{255} \hat{p}_i^{(j)} \log_2 \hat{p}_i^{(j)}.

Define aggregate entropy \hat{H}(r) as the weighted mean of per-window entropies (weights proportional to window lengths).

ERS between raw r and compressed c:

ERS(r,c) = clamp_{[0,1]}\left( \frac{\hat{H}(r)-\hat{H}(c)}{\max(\hat{H}(r),\varepsilon)} \right)

where \varepsilon>0 is a tiny constant to avoid division-by-zero.

Lemma 2.1 (Range). ERS(r,c) \in [0,1].

Proof. 0 \le \hat{H}(\cdot) \le 8; subtraction and normalization produce a value in [-1,1]; clamp to [0,1] enforces the stated range. ∎

Proposition 2.2 (Noise monotonicity). Let n be i.i.d. uniform-byte noise injected at rate p. Then ERS increases with p under compressors that drop or map white-noise to minimal codes.

Sketch. White noise maximizes Shannon entropy; mixing noise into a signal increases expected entropy. If compression removes or normalizes noise to low-entropy codes, the numerator \hat{H}(r)-\hat{H}(c) grows with p. ∎

Complexity: O(n) time, O(w) memory per window; fully streaming.


## 3) SIS — Semantic Integrity Score

Two pluggable baselines are supported: MinHash/Jaccard and TF–IDF cosine.

3.1 Jaccard / MinHash (set overlap).

Let S_r and S_c be shingle concept sets (e.g., lemmatized k-grams).

SIS_Jac(r,c) = |S_r \cap S_c| / |S_r \cup S_c| \in [0,1].

3.2 TF–IDF cosine.

Let v_r and v_c be TF–IDF vectors; then

SIS_cos(r,c) = \frac{\langle v_r, v_c\rangle}{\|v_r\|\|v_c\|} \in [0,1].

Complexity: tokenization O(n); TF–IDF cost linear in tokens; MinHash offers sublinear approximate overlap with bounded error; all variants are streaming-amenable with windowed aggregation.


## 4) GLPI — Glyphic Loss / Proximity Index

GLPI quantifies symbolic fidelity with lineage-aware substitution costs.

4.1 Lineage distance.

Assign a nonnegative symmetric lineage distance L(a,b) with properties:
- L(a,a)=0.
- L(a,b) increases with lineage divergence.

One parametrization: let d be depth of deepest common ancestor (DCA) in the lineage tree; set

L(a,b) = \rho^{D_max - d}

with 0<\rho<1 and D_max the maximum depth cap; siblings (high d) have smaller L than cross-family pairs.

4.2 Edit distance with transpositions.

For glyph sequences g and h, define weighted Damerau–Levenshtein DL_L(g,h) with costs:
- insertion/deletion cost = \gamma_I > 0;
- substitution cost = L(a,b) scaled by a base substitution cost \gamma_S;
- adjacent transposition cost = \gamma_T.

Normalization:

GLPI(g,h) = 1 - \frac{DL_L(g,h)}{DL_L(g,\varnothing) + DL_L(\varnothing,h)} \in [0,1].

Lemma 4.1 (Bounds). GLPI \in [0,1], equality GLPI=1 iff g=h; GLPI→0 when sequences are maximally dissimilar and lineage costs are large.

Theorem 4.2 (Pseudometric). Define \delta(g,h) = 1 - GLPI(g,h) = \frac{DL_L(g,h)}{\alpha(m+n)}.

Sketch. Weighted DL yields a nonnegative symmetric dissimilarity; transpositions preserve triangle-like inequalities up to bounded slack, so \delta is a pseudometric (or quasi-metric) under reasonable cost constraints. ∎

Complexity: O(mn) DP; banded O(b \cdot n) optimizations when sequences are near-aligned.


## 5) Mutation Utility & Monotonicity

Definition (Utility). For glyph g with baseline r and candidate c,

\Delta u(g) = (ERS(r,c) - ERS(r,r)) + \beta (GLPI(g_c, g_r) - GLPI(g_r,g_r)),

where \beta balances structural fidelity vs entropy reduction and g_c/g_r are glyph sequences for candidate and baseline.

Peak-locked gates: maintain historical peaks m_* = (ERS_*, SIS_*, GLPI_*). A mutation is accepted only if

- ERS >= ERS_*, SIS >= SIS_*, GLPI >= GLPI_*, and \Delta u(g) > 0.

Theorem 5.1 (Ledger-monotone utility). Under peak-locked gates and the acceptance predicate above, the ledgered utility sequence is non-decreasing over ledger time.

Proof. Each accepted mutation by construction has \Delta u > 0 and does not reduce any component below peaks; thus the recorded utility cannot decrease. ∎


## 6) Deterministic Streaming ZIP

Algorithm (external-merge approach):
1. Stream-parse the central directory; emit header records H_i.
2. Normalize paths (UTF-8 NFC), reject entries with path traversal (.. that escape root).
3. External-sort headers deterministically by path comparator.
4. Stream-copy local file records in sorted order into an output archive; recompute CRCs and fix offsets deterministically; normalize timestamps to constant value.

Theorem 6.1 (Deterministic artifact hash). For fixed input archive bits, the output bundle hash B = H(output) is invariant across runs and machines.

Proof. The pipeline applies pure canonical transformations (normalization, deterministic sorting, fixed buffer sizes, timestamp canonicalization). Hence identical input bits produce identical output bytes → identical SHA-256. ∎

Complexity: O(h log h) header comparisons; O(N) I/O; external memory proportional to header volume.

Safety constraint (path traversal): Reject any normalized path that escapes canonical root; this prevents directory traversal attacks.


## 7) Merkle Ledger & Anchoring

For leaf hashes L_i compute parent nodes P_j = H(P_left || P_right). The root R is the batch merkle root using fixed leaf ordering (lexicographic by artifact path).

Theorem 7.1 (Inclusion soundness & collision-resistance). Given R and a Merkle proof for leaf L_i, recomputing the root verifies inclusion assuming SHA-256 collision resistance. ∎

Determinism: Fixing leaf ordering yields canonical root.


## 8) EKG & Anomaly Detection

Packet: P = (payloadHash, seq, latencyMs, ts) with ts from injected monotonic clock (bigint ns).

Replay window: accept P on channel c iff seq is greater than last_seq and within window W.

Theorem 8.1 (Replay rejection). With strictly monotone sequence numbers and window W, duplicates or reorders outside W are rejected.

Anomaly score (deterministic): maintain rolling mean \mu_t and variance \sigma_t^2 of latency. Define

s_t = min\left(1, max\left(0, \frac{|L_t - \mu_t|}{k \sigma_t}\right)\right).

By Chebyshev, P(|L_t-\mu| >= k\sigma) <= 1/k^2, giving distribution-agnostic bounds on false positives.

Complexity: O(1) per packet update.


## 9) GlyComm (Envelope Correctness)

Envelope: E = (header, body) canonical-CBOR encoded; signature S = Sign(sk, H(E)).

Theorem 9.1 (Unforgeability). Under EUF-CMA security of the signature scheme (Ed25519/P-256) and SHA-256 collision-resistance, forging (E,S) for a new header is infeasible. ∎

Determinism: Use canonical CBOR (sorted keys, fixed integer widths) to ensure identical byte representation.


## 10) SIS/GLPI Coupling & Bounds

Proposition 10.1 (Semantic lower bound on GLPI). If mapping M: concepts → glyphs is Lipschitz w.r.t. concept distance (e.g., cosine), then for sequences r,c and glyph sequences g,h derived via M:

1 - GLPI(g,h) \le \gamma (1 - SIS(r,c)) + \eta,

for constants \gamma,\eta depending on M's Lipschitz constant and lineage cost scaling.

Sketch. Small semantic drift (high SIS) implies neighboring glyphs (small substitution costs), bounding edit cost. ∎

Implication: High SIS pressures GLPI towards 1 unless lineage diverges.


## 11) Peak-Locked CI as a Constraint System

Let m be metric vector (ERS,SIS,GLPI). The feasible region F is:

F = { m \in [0,1]^3 | m \succeq m_* - \delta } \cap {deterministic hashes equal} \cap {perf & security constraints}.

This represents CI gates combining metric peaks, deterministic artifact checks, and perf/security asserts.


## 12) Complexity Summary (tight big-O)

- ERS: O(n) time, O(w) memory streaming.
- SIS (TF–IDF): O(n) time; sparse dot product in O(nnz).
- SIS (MinHash): O(n) time for hashing; memory O(k) for k hash sketches.
- GLPI: O(mn) DP; with Hirschberg or banded heuristic O(bn).
- Streaming ZIP: O(h log h) header sort; O(N) I/O.
- Merkle: O(n) to build; O(log n) proof size/verify.
- EKG: O(1) per packet.


## 13) Formal Safety & Invariants

- I (Determinism): Public functions are pure given explicit inputs/config; I/O is encapsulated with typed Result and timestamp normalization.
- II (Ledger immutability): Append-only entries with chaining and Merkle anchoring; tampering detects via hash mismatches.
- III (Mutation safety): DAG acyclicity + peak-locked gates + non-decreasing utility prevent semantic regressions.
- IV (Quarantine sanity): Content-addressed writes ensure idempotence and detect corruption.


## 14) Worked Micro-Proofs (determinism ⇒ identical hashes)

Theorem 14.1. If pipeline functions f_i are pure/deterministic, timestamps normalized to constant, ordering deterministic, and encodings canonical, then final artifact hash is invariant across runs.

Proof. Composition of pure functions on same input yields identical outputs at each stage. Canonicalization removes platform variance; hence final bytes identical ⇒ identical SHA-256. ∎


## 15) Statistical Guardrails

Confidence for MinHash: with k hashes, 95% CI half-width ~ 1.96/\sqrt{k}. Choose k to achieve desired CI. Prefer deterministic TF–IDF for CI-critical gates; MinHash is optional for speed.

Chebyshev for anomalies: distribution-agnostic bound ensures false-positive rate controllable via k.


## 16) Parameter Tuning (principled defaults)

- ERS: window size w = 16–64 KiB.
- GLPI lineage params: choose substitution multipliers such that siblings < cousins < cross-family.
- Mutation utility: \beta in [0.1,1.0] as tradeoff knob.


## 17) Research directions

- GLPI as true metric: replace DL with tree-Wasserstein / EMD over lineage tree.
- ERS beyond Shannon: use NCD / practical compressors to upper-bound algorithmic information distance.
- SIS embeddings: use JL for reduced-dim cosine concentration bounds.


## References

- Shannon, C. E. "A Mathematical Theory of Communication".
- Damerau, Frederick J. "A technique for computer detection and correction of spelling errors".
- Rabin, M. "Efficient algorithms for hash-based sketches".

---