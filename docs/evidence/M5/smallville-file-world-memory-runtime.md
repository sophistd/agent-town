# Smallville File World Memory Runtime Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation wires the file-backed world-memory store into a local/server
runtime API.

The previous slice added a file-backed store, but the real Stanford-Smallville
gap is not simply "there is a file." A runtime needs to ingest event streams,
persist only valid memory evidence, recall from the same durable store, and
plan from that store without letting files become projection facts.

This slice adds:

- `src/adapters/worldMemoryRuntime.ts`

It exposes:

- `ingestEventsIntoFileWorldMemory`
- `buildFileWorldMemoryRecallResult`
- `buildFileWorldMemoryPlanResult`

## Files Changed

- `src/adapters/worldMemoryRuntime.ts`
- `src/tests/world-memory-runtime.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-file-world-memory-runtime.md`

## Acceptance Evidence

- Runtime ingest validates incoming event-shaped input with the canonical event
  validator.
- Invalid events are quarantined as `invalid_world_memory_ingest_event`.
- Only canonical `memory_read` and `memory_write` events become durable
  `PersistentMemoryRecord` snapshots.
- Non-memory event streams return `world_memory_ingest_no_memory_events` instead
  of fabricating durable memory.
- The same file snapshot can be used for recall output and agent-addressable
  Memory plan output.
- Recall and plan output still become canonical `AgentEvent` evidence before
  replay.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/world-memory-runtime.test.ts`: passed, 1 file /
  3 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 15 files / 88 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Notion / Linear Write-Back

Actual write-back completed and read back:

- Notion S15 / M5 runbook page comment:
  `399acb4b-b6e6-8144-bcc8-001d26f4efe8`.
- Linear MDL-129 comment: `3bd17441-0568-4d3c-9cc7-396449d1941c`.
- Linear MDL-152 comment: `a757e5a9-ef63-4bb7-8cd7-55445101f764`.

## Scope Truth

- This is a local/server runtime API, not a long-running process or deployed
  service.
- This is not a multi-user world-memory database.
- This does not make files, localStorage, React, or Phaser own runtime facts.
- This does not run a live provider-backed Smallville simulation.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Expose this runtime API through a local/server process or provider-backed
planning loop so live runs can share file-backed world memory without
browser-local storage.
