# Security Policy

## Reporting

Do not open a public issue for secrets or sensitive data. Report privately to the repository owner.

## Baseline

ChineseLearn is local-first. The app should not send recordings, progress, identifiers, or telemetry to third parties unless a future cloud mode is explicitly enabled by the user for that session.

## Required checks

Run this before opening a pull request:

```sh
npm run check
```

The audit blocks likely secrets, local absolute paths, email addresses, common analytics SDKs, remote scripts, and incomplete PWA wiring.
