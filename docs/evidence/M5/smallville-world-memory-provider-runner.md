# Smallville World Memory Provider Runner Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation makes the world-memory provider loop runnable from an
external JSONL event stream.

The previous slice connected the world-memory HTTP process to the provider
planner boundary as a library API. That still left a practical gap: a real
runtime sender needs a command path that can read events, start the local
memory process, run the loop, and capture evidence without touching secrets.

This slice adds:

- `src/server/worldMemoryProviderLoopRunner.ts`
- `scripts/world-memory-provider-loop.mjs`
- `pnpm world-memory:provider-loop`

## Files Changed

- `package.json`
- `scripts/world-memory-provider-loop.mjs`
- `src/server/worldMemoryProviderLoopRunner.ts`
- `src/tests/world-memory-provider-loop-runner.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-world-memory-provider-runner.md`

## Acceptance Evidence

- The runner reads the existing native JSONL format: one canonical `AgentEvent`
  object per non-empty line.
- JSONL parsing uses the existing `parseNativeJsonl` adapter, so malformed
  lines and invalid events are quarantined before accepted events enter the
  provider loop.
- The runner starts a local world-memory server, sends accepted JSONL events
  through the server-backed provider loop, closes the server, and prints a
  secret-free summary.
- The runner can write the same summary to
  `AGENT_TOWN_PROVIDER_LOOP_OUTPUT` for evidence capture.
- Without `OPENAI_API_KEY`, the runner still builds server-backed provider
  request evidence and preserves the existing `missing_openai_api_key` no-call
  behavior.
- With an injected mock provider, the runner can parse provider-shaped output
  through the existing planner parser/quarantine path.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/world-memory-provider-loop-runner.test.ts`:
  passed, 1 file / 3 tests.
- `pnpm typecheck`: passed.
- `AGENT_TOWN_WORLD_MEMORY_FILE=/tmp/agent-town-provider-loop-smoke-memory.json
  AGENT_TOWN_PROVIDER_LOOP_OUTPUT=/tmp/agent-town-provider-loop-smoke-summary.json
  pnpm world-memory:provider-loop docs/samples/sample-native.jsonl`: passed.
- `pnpm test`: passed, 18 files / 97 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Smoke output summary:

- accepted input events: 25
- world-memory incoming records: 3
- persisted records: 3
- recall events: 3
- Memory plan events: 6
- provider request memory records: 3
- provider request selected records: 3
- provider result events: 0
- provider warning: `missing_openai_api_key`

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Scope Truth

- This is a file-based JSONL external-sender runner, not a live runtime socket
  source.
- This is not a live-verified OpenAI run.
- No API key was created, requested, printed, stored, or written.
- This is not a deployed service.
- This is not a multi-user world-memory database.
- This does not connect the browser UI to the provider loop yet.
- This does not claim final Stanford Smallville parity.

## External Write-Back

Actual writes:

- Notion page-level comment:
  `399acb4b-b6e6-81a9-836c-001d5bee73e8`.
- Linear `MDL-129` comment:
  `ab04bd9e-e8d4-437a-9db2-1093d96971fa`.
- Linear `MDL-152` red-check comment:
  `64d1d234-ee48-42dd-a634-893ab8bfe53e`.

Read-back verification:

- Notion `get comments` returned comment
  `399acb4b-b6e6-81a9-836c-001d5bee73e8` with commit
  `2d550e1 feat: add world memory provider runner`.
- Linear `MDL-129` comments returned
  `ab04bd9e-e8d4-437a-9db2-1093d96971fa` with the same commit,
  verification summary, and scope truth.
- Linear `MDL-152` comments returned
  `64d1d234-ee48-42dd-a634-893ab8bfe53e` with the red-check pass/fail
  summary and remaining gaps.

No issue state was changed, no Notion page body was replaced, no merge was
performed, and no API key or secret was written.

## Next Session Candidate

Run and evidence a real provider-backed planner call through this runner using
a local/server-side API key, or connect a live external runtime source beyond
file-based JSONL.
