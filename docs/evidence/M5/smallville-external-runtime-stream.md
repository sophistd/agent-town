# Smallville External Runtime Stream Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds a deterministic external runtime stream runner for the
Smallville path.

The previous slice connected the browser workbench to the live local/server
`POST /provider-loop` route. This slice adds a server-side runner that behaves
like an external runtime sender: it emits canonical `AgentEvent` batches over
multiple ticks, posts each tick to the live `/provider-loop` route, persists
world-memory evidence across ticks, and records a secret-free summary.

## Files Changed

- `src/server/smallvilleExternalRuntimeStreamRunner.ts`
- `scripts/smallville-runtime-stream.mjs`
- `src/tests/smallville-external-runtime-stream-runner.test.ts`
- `package.json`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-external-runtime-stream.md`
- `docs/evidence/M5/smallville-external-runtime-stream-summary.json`
- `docs/evidence/M5/smallville-external-runtime-stream-events.jsonl`
- `docs/evidence/M5/smallville-external-runtime-stream-visual-qa.json`
- `docs/evidence/M5/smallville-external-runtime-stream-desktop.png`
- `docs/evidence/M5/smallville-external-runtime-stream-desktop-map.png`
- `docs/evidence/M5/smallville-external-runtime-stream-mobile.png`
- `docs/evidence/M5/smallville-external-runtime-stream-mobile-map.png`

## Acceptance Evidence

- `pnpm smallville:runtime-stream` exists as a package script.
- The runner starts a temporary local world-memory server.
- It emits external runtime events with `metadata.source: "custom"`.
- It annotates every emitted event with `metadata.externalRuntime`.
- It posts each runtime tick to the live local/server `/provider-loop` route.
- Each tick drives world-memory ingest, recall, Memory plan, and provider-loop
  request construction.
- The world-memory file accumulates memory across ticks.
- Without `OPENAI_API_KEY`, the provider is not called and
  `missing_openai_api_key` remains visible in the summary.
- With a mock server-side provider, provider-shaped output returns canonical
  events through the existing parser/quarantine path.
- Summary output contains no provider secret.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/smallville-external-runtime-stream-runner.test.ts`:
  passed, 1 file / 2 tests.
- `pnpm exec vitest run src/tests/smallville-external-runtime-stream-runner.test.ts src/tests/world-memory-provider-loop-runner.test.ts src/tests/world-memory-http-server.test.ts`:
  passed, 3 files / 12 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 19 files / 105 tests.
- `pnpm build`: passed. Vite emitted the existing large chunk warning.
- `git diff --check`: passed.
- Package-script smoke:
  `pnpm smallville:runtime-stream` with 45 emitted social events, batch size 15,
  `AGENT_TOWN_WORLD_MEMORY_FILE`, `AGENT_TOWN_RUNTIME_STREAM_OUTPUT`, and
  `AGENT_TOWN_RUNTIME_STREAM_EVENTS_OUTPUT`: passed.

Smoke output:

- Summary:
  `docs/evidence/M5/smallville-external-runtime-stream-summary.json`.
- Emitted event log:
  `docs/evidence/M5/smallville-external-runtime-stream-events.jsonl`.
- Tick count: 3.
- Emitted events: 45.
- Accepted input events: 45.
- Final persisted memory records: 18.
- Recall events across ticks: 36.
- Memory plan events across ticks: 27.
- Provider events: 0 because no local/server API key was configured.
- Warning codes: `persistent_memory_file_missing`, `missing_openai_api_key`.
- Quarantined events: 0.

Browser projection smoke:

- Scope: no client UI source changed in this slice; this smoke rechecked that
  the client projection still renders after the server-side runtime addition.
- Tool path: Python Playwright.
- Desktop 1440x960:
  `docs/evidence/M5/smallville-external-runtime-stream-desktop.png`.
- Desktop canvas crop:
  `docs/evidence/M5/smallville-external-runtime-stream-desktop-map.png`.
- Mobile 390x844:
  `docs/evidence/M5/smallville-external-runtime-stream-mobile.png`.
- Mobile canvas crop:
  `docs/evidence/M5/smallville-external-runtime-stream-mobile-map.png`.
- QA JSON:
  `docs/evidence/M5/smallville-external-runtime-stream-visual-qa.json`.
- QA checks passed: `Social day` loaded, no horizontal overflow, nonblank
  varied canvas screenshot, no console errors, and no page errors.

Pixel evidence from the canvas screenshots:

- Desktop canvas crop: 425 sampled colors, 25,891 opaque samples.
- Mobile canvas crop: 477 sampled colors, 30,039 opaque samples.

## Scope Truth

- This is a deterministic external runtime stream runner.
- This is not a live-verified OpenAI run.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This is not yet an autonomous free-running day loop.
- No API key was created, requested, printed, stored, or written.
- Provider credentials still come only from local/server environment.
- No Notion page body was replaced.
- No Linear issue was closed.
- No merge was performed.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Run and evidence a live provider-backed planner call through the external
runtime stream using a local/server-side API key, or add a scheduler that keeps
the external runtime alive beyond deterministic finite batches while preserving
`AgentEvent -> WorldState -> Projection`.
