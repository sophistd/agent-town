# Smallville File-Backed World Memory Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation moves durable memory one step beyond browser-local storage.

Agent Town already extracted persistent memory from canonical `memory_read` and
`memory_write` events, stored it in browser storage, recalled it as canonical
events, and used it for agent-addressable memory planning. That was still too
weak for Stanford-Smallville-style cross-day memory because browser localStorage
is not a runtime or world-memory backing store.

This slice adds a local/server-side file-backed store:

- `src/state/filePersistentMemoryStore.ts`

The file store uses the same `PersistentMemoryRecord` and versioned snapshot
schema as the browser store. It does not introduce a second memory ontology or
renderer-owned state. Local or server runtimes can now persist canonical memory
evidence to a caller-provided file path, reload it, and merge incoming canonical
memory records.

## Files Changed

- `src/state/filePersistentMemoryStore.ts`
- `src/tests/persistent-memory.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-file-world-memory.md`

## Acceptance Evidence

- The file-backed store writes the same schema used by browser persistent
  memory snapshots.
- Writes use a temporary file plus rename, so callers do not get a partial
  final snapshot on the happy path.
- Loading a missing file returns `persistent_memory_file_missing`; it does not
  silently pretend a world-memory file exists.
- Loading invalid JSON returns the existing `invalid_persistent_memory_json`
  warning through the shared parser.
- Merge uses `mergePersistentMemoryRecords`, preserving stable source event
  identity and bounded record behavior.
- File-backed memory remains a backing-store boundary. Recalled memory still has
  to become canonical `AgentEvent` evidence before entering `WorldState`.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/persistent-memory.test.ts`: passed, 1 file /
  11 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 14 files / 85 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Scope Truth

- This is a local/server-side file-backed store, not a multi-user database.
- This is not complete persistent agent memory across devices or sessions.
- This does not make localStorage, files, React, or Phaser own runtime facts.
- This does not run a live provider-backed Smallville simulation.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Wire the file-backed memory store into a local/server runtime source or API so
live provider-backed planner runs can share world memory without relying on
browser-local storage.
