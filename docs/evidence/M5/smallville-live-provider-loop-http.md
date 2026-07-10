# Smallville Live Provider Loop HTTP Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation connects a live external runtime sender path to the
world-memory provider loop beyond file-based JSONL.

The previous slice added a JSONL runner that starts a temporary world-memory
server, runs the provider loop, and prints a summary. That proved the command
path, but a live runtime still needed an HTTP entry point that can receive
event-shaped input without first writing a JSONL file.

This slice adds `POST /provider-loop` to the long-running world-memory server.
The route accepts live event-shaped JSON input, runs the same server-backed
provider loop, and returns canonical provider events plus a secret-free summary.

## Files Changed

- `scripts/world-memory-server.mjs`
- `src/server/worldMemoryHttpServer.ts`
- `src/tests/world-memory-http-server.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-live-provider-loop-http.md`

## Acceptance Evidence

- The long-running world-memory server exposes `POST /provider-loop`.
- The route accepts live event-shaped JSON via an HTTP request body instead of
  requiring a JSONL file.
- The route calls the same `runWorldMemoryProviderLoop` path used by the JSONL
  runner.
- The route uses the existing server-backed `/memory/ingest`, `/memory/recall`,
  and `/memory/plan` boundaries through the provider loop.
- The started server passes its actual listen URL into provider-loop self calls
  instead of trusting live sender `Host` headers as the world-memory base URL.
- Invalid provider-loop input still goes through canonical validation and
  quarantine behavior.
- The route returns canonical provider events, recall events, Memory plan
  events, warnings, quarantines, and a secret-free summary.
- Request bodies containing `apiKey`, `openAiApiKey`, or `OPENAI_API_KEY` are
  rejected so live sender payloads do not become secret carriers.
- Without a local/server `OPENAI_API_KEY`, the route still builds
  server-backed provider request evidence and preserves the existing
  `missing_openai_api_key` no-call behavior.
- With an injected mock provider, the route returns provider-shaped output only
  after it passes through the existing planner parser/quarantine path.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/world-memory-http-server.test.ts`: passed,
  1 file / 6 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 18 files / 100 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.
- Package-script smoke: started `pnpm world-memory:server` with
  `PORT=0`, posted `docs/samples/sample-native.jsonl` events to
  `/provider-loop`, and stopped the server.

Smoke output summary:

- HTTP status: 200
- source: `world-memory-provider-loop-http`
- accepted input events: 25
- world-memory incoming records: 3
- persisted records: 3
- recall events: 3
- Memory plan events: 6
- provider result events: 0
- provider warning: `missing_openai_api_key`
- `apiKeyProvided`: false

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Scope Truth

- This is a live HTTP sender path on a local/server process, not a deployed
  service.
- This is not a live-verified OpenAI run.
- No API key was created, requested, printed, stored, or written.
- The route rejects provider credentials in HTTP request bodies.
- This is not a multi-user world-memory database.
- This does not connect the browser UI to the provider loop yet.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Connect the browser/workbench or a real external runtime stream to
`POST /provider-loop`, or run and evidence a real provider-backed planner call
through the live HTTP route using a local/server-side API key.
