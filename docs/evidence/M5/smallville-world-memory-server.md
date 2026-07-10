# Smallville World Memory Server Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation exposes the file-backed world-memory runtime through a
long-running local/server HTTP process.

The previous slice made world memory callable as a local/server API. That was
still not enough for Stanford-Smallville-style cross-request memory: a live run
needs a process that can keep the same durable memory file available across
separate ingest, recall, and planning calls.

This slice adds:

- `src/server/worldMemoryHttpServer.ts`
- `scripts/world-memory-server.mjs`
- `pnpm world-memory:server`

## Routes

- `GET /health`
- `POST /memory/ingest`
- `GET /memory/recall`
- `POST /memory/plan`

## Files Changed

- `package.json`
- `scripts/world-memory-server.mjs`
- `src/server/worldMemoryHttpServer.ts`
- `src/tests/world-memory-http-server.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-world-memory-server.md`

## Acceptance Evidence

- `pnpm world-memory:server` starts a local HTTP process using the existing Vite
  toolchain and no new runtime dependency.
- The process requires an explicit memory file path through
  `AGENT_TOWN_WORLD_MEMORY_FILE` or a file-path argument.
- `/memory/ingest` validates incoming event-shaped input through the canonical
  event validator, quarantines invalid events, and persists only canonical
  memory events.
- `/memory/recall` loads the same file-backed snapshot and emits canonical
  `memory_read` events.
- `/memory/plan` loads the same file-backed snapshot, validates
  `previousEvents` before using them as context, quarantines invalid context
  events, and returns adapter-shaped canonical planning events.
- Malformed JSON returns an explicit JSON error response.
- The HTTP process does not emit `WorldState` and does not give files, HTTP
  routes, React, or Phaser ownership of runtime facts.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/world-memory-http-server.test.ts`: passed, 1
  file / 3 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 16 files / 91 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.
- `AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-world-memory-smoke.json PORT=0
  pnpm world-memory:server`: started successfully.
- `GET /health` against the started server returned `ok: true`.
- SIGINT stopped the server cleanly.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Notion / Linear Write-Back

Actual write-back completed and read back:

- Notion S15 / M5 runbook page comment:
  `399acb4b-b6e6-8122-b782-001d384a198b`.
- Linear MDL-129 comment: `2ed4b7d8-0d2d-4a2c-8186-88a55d6204af`.
- Linear MDL-152 comment: `b7e8c699-aa58-4069-9393-8c5f9323a836`.

## Scope Truth

- This is a local/server HTTP process, not a deployed service.
- This is not a multi-user world-memory database.
- This does not run a live provider-backed Smallville simulation.
- This does not connect the server to the browser UI yet.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Connect the long-running world-memory process to a real provider-backed
planning loop or external runtime event sender while keeping all accepted data
inside the `AgentEvent -> WorldState -> Projection` path.
