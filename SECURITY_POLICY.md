# Security Policy — Dependency Vulnerability Thresholds

## Workflow

The `dependency-audit` CI workflow runs on every PR that touches
`backend/package.json` or `backend/package-lock.json`, on every push to
`main`/`develop`, and on a nightly schedule (03:00 UTC) to catch newly-disclosed
CVEs between dependency updates.

Two scanners are used in parallel:

| Scanner | Tool | Source |
|---------|------|--------|
| npm audit | `npm audit --audit-level=high` | npm advisory database |
| OSS Index | `auditjs ossi` | Sonatype OSS Index (NVD-backed) |

A final **audit-gate** job aggregates both results and fails the build if either
scanner breaches the policy threshold.

---

## Policy Thresholds

| Severity | CVSS range | npm audit | OSS Index | Build outcome |
|----------|-----------|-----------|-----------|---------------|
| Critical | 9.0 – 10.0 | ❌ | ❌ | **Fail — blocks merge** |
| High | 7.0 – 8.9 | ❌ | ❌ | **Fail — blocks merge** |
| Moderate | 4.0 – 6.9 | ⚠️ | ⚠️ | Warn only — does not block |
| Low | 0.1 – 3.9 | ⚠️ | ⚠️ | Warn only — does not block |

> Rationale: Critical and High vulnerabilities represent exploitable attack
> vectors that could compromise patient data or system integrity. Moderate/Low
> are tracked and must be resolved within 30 days of disclosure.

---

## Dependabot

Dependabot is configured (`.github/dependabot.yml`) to open weekly PRs for:
- `backend/` npm dependencies
- GitHub Actions

Major version bumps are excluded from automatic PRs and must be reviewed
manually. All Dependabot PRs are labelled `dependencies` and `security`.

---

## Exception Process

If a critical or high vulnerability **cannot** be remediated immediately (e.g.
no fix available upstream), follow this process:

1. Open a GitHub Issue tagged `security-exception` documenting:
   - CVE identifier
   - Affected package and version
   - Reason a fix is not yet available
   - Mitigating controls in place
   - Target remediation date (max 14 days for critical, 30 days for high)

2. Add the package to the `npm audit` ignore list in the workflow using
   `--ignore-path .nsprc` or an inline `audit-resolve.json` entry.

3. Get sign-off from a maintainer before merging.

---

## Secrets Required

| Secret | Purpose |
|--------|---------|
| `OSSINDEX_USER` | Sonatype OSS Index account email (optional — unauthenticated rate-limited) |
| `OSSINDEX_TOKEN` | Sonatype OSS Index API token (optional — unauthenticated rate-limited) |

OSS Index works without credentials but is rate-limited. Add credentials in
**Settings → Secrets → Actions** for reliable CI runs.
