# ChineseLearn

ChineseLearn is a private, local-first Mandarin learning PWA for a complete beginner. It focuses on speaking, listening, and reading without ads, tracking, gamification pressure, or subscriptions.

## Run locally

```sh
python3 serve.py
```

Open http://127.0.0.1:4173.

The app can also be opened directly through `index.html`, but the local server is better for PWA behavior.

## Checks

```sh
npm run check
```

This runs:

- `npm run audit:security`: scans tracked project files for likely secrets, absolute local paths, identity leaks, telemetry patterns, unsafe remote URLs, and risky service-worker caching.
- `npm run audit:functional`: checks required PWA files, HTML wiring, JS syntax, Python syntax, manifest validity, service-worker cache coverage, and core app data shape.

## Branch strategy

- `main`: stable, releasable app.
- `develop`: integration branch for upcoming work.
- `feature/local-ai-adapters`: future Ollama, Whisper, and TTS adapters.
- `feature/sync-foundation`: future cross-device progress sync.
- `ci/audit-suite`: CI and local audit tooling.

Keep feature branches small and merge through pull requests so GitHub Actions can run before changes reach `main`.

## Privacy baseline

- No analytics SDK.
- No third-party telemetry.
- No committed API keys.
- Local storage only for learning progress.
- Cloud mode is represented in the UI but not wired to any provider yet.
