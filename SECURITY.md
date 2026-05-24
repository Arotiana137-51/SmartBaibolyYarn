# Security policy & accepted findings

## Reporting a vulnerability

Email **arotiana137-51@users.noreply.github.com** with the subject line
`[e-Baiboly security]`. Please do not open a public GitHub issue for
vulnerabilities affecting installed users.

## Accepted findings

Vulnerabilities below have been reviewed and intentionally not patched.
Each entry records *why* the finding is accepted so it doesn't get
re-investigated from scratch.

### inflight@1.0.6 — CWE-772 (resource exhaustion)

- **Snyk ID**: SNYK-JS-INFLIGHT-6095116
- **CVSS**: 6.2 (medium)
- **Path**: `react-native@0.83.1 › @react-native/codegen@0.83.1 › glob@7.2.3 › inflight@1.0.6`
- **Exploit maturity**: Proof of Concept

**Why accepted**

1. `@react-native/codegen` is a build-time dependency. Its tree never
   reaches a shipped APK/AAB or an end user's device. The vulnerable
   `inflight` module runs only on developer machines and CI runners while
   producing native code generators.
2. The CVE describes a memory leak triggered by an attacker who can
   influence the async operations using `inflight`. In a build context
   that means the attacker already controls the build environment, which
   is a strictly worse breach than the leak itself.
3. The maintained library has no upstream fix. The dependency chain
   pins `glob@^7.1.1`, deliberately, because the React Native build
   tooling relies on glob v7-specific behavior. Force-upgrading the
   transitive `glob` to v10 carries a meaningful chance of silently
   breaking the codegen pipeline.

**Mitigation in place**

`package.json` carries a `resolutions` entry that swaps the published
`inflight@1.0.6` for a tiny in-tree shim that exposes the same surface
without the leaking `reqs` map. This satisfies SCA scanners without
forcing a risky transitive major-version upgrade. The shim is
intentionally minimal — if a future React Native release moves codegen
off glob v7 (and therefore off inflight), this resolution should be
removed.

**Re-evaluation triggers**

- React Native upgrade to a version whose codegen no longer depends on
  `glob@7` (currently expected in RN 0.84+).
- A new CVE class on inflight that affects code paths actually used by
  glob v7 within codegen.

Last reviewed: 2026-05-23.
