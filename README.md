# ChineseLearn

ChineseLearn is a private, local-first Mandarin learning PWA for a complete beginner. It focuses on speaking, listening, and reading without ads, tracking, gamification pressure, or subscriptions.

## Run locally

```sh
python3 serve.py
```

Open http://127.0.0.1:4173.

The app can also be opened directly through `index.html`, but the local server is better for PWA behavior.

By default, Practice uses `Mix` mode: each new exercise randomly switches between speaking, listening, and reading. You can still lock a single mode with the Speak, Listen, or Read tabs.

## Checks

```sh
npm run check
```

This runs:

- `npm run audit:security`: scans tracked project files for likely secrets, absolute local paths, identity leaks, telemetry patterns, unsafe remote URLs, and risky service-worker caching.
- `npm run audit:functional`: checks required PWA files, HTML wiring, JS syntax, Python syntax, manifest validity, service-worker cache coverage, and core app data shape.

## Local AI with LM Studio

Start an OpenAI-compatible LM Studio local server, then open Settings and enable "LM Studio local AI".

Default endpoint:

```txt
http://127.0.0.1:1234/v1/chat/completions
```

Speaking practice first uses the browser microphone and speech recognition to capture a Mandarin transcript. When LM Studio local AI is enabled, that transcript is sent only to the configured local endpoint for gentler feedback.

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
