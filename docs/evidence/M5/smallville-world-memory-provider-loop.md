# Smallville World Memory Provider Loop Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation connects the long-running world-memory HTTP process to the
existing provider planner boundary.

The previous slice made file-backed world memory available across separate HTTP
requests. That was still not enough for a Stanford-Smallville-like provider
loop: a provider planner must be able to consume memory that came from the
server process rather than from browser storage or an in-process fixture.

This slice adds:

- `src/adapters/worldMemoryProviderLoop.ts`

The loop:

1. Validates external event-shaped input for planner context.
2. Sends the raw event stream to the world-memory server `/memory/ingest`.
3. Calls `/memory/recall` and rebuilds provider request records from canonical
   recall events and `metadata.durableMemory`.
4. Calls `/memory/plan` to get server-backed agent-addressable memory context.
5. Builds `buildSmallvilleLlmPlannerRequest` from accepted input events, server
   Memory plan events, and reconstructed durable records.
6. Calls the existing `callOpenAiLlmPlanner` provider boundary.

## Files Changed

- `src/adapters/persistentMemoryAdapter.ts`
- `src/adapters/worldMemoryProviderLoop.ts`
- `src/tests/world-memory-provider-loop.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-world-memory-provider-loop.md`

## Acceptance Evidence

- Recall events now include enough `metadata.durableMemory` detail for the
  provider loop to reconstruct durable records without reading the memory file.
- The provider loop sends external event streams through the world-memory
  server before constructing provider request evidence.
- The provider loop uses canonical server recall events as the source for
  durable provider records.
- The provider loop uses server Memory plan events as prior context.
- The provider loop calls the existing OpenAI Responses planner boundary and
  preserves provider parser/quarantine behavior.
- Missing API keys produce the existing `missing_openai_api_key` warning and do
  not call the provider.
- The loop does not emit `WorldState` and does not let files, HTTP state, React,
  Phaser, or provider output own runtime facts.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/world-memory-provider-loop.test.ts`: passed, 1
  file / 3 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 17 files / 94 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Notion / Linear Write-Back

Actual write-back completed and read back:

- Notion S15 / M5 runbook page comment:
  `399acb4b-b6e6-816c-9e0e-001d89348394`.
- Linear MDL-129 comment: `776e146a-9687-4848-a198-7ec6d72a60f7`.
- Linear MDL-152 comment: `cbc324bc-4a89-43c2-903e-9f1b6709a520`.

## Scope Truth

- This is a provider-loop adapter with mock-provider coverage, not a
  live-verified OpenAI run.
- No API key was created, requested, printed, stored, or written.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This does not connect the browser UI to the provider loop yet.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Run and evidence a real provider-backed planner call through this
world-memory provider loop using a local/server-side API key, or connect a real
external runtime event sender to the loop.
