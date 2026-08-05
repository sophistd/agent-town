# Smallville Agent-Addressable Provider Memory Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation closes the request-side gap between durable memory and the
provider-backed LLM planner boundary.

Before this change, the LLM planner request selected durable memories as a
global list. After this change, `buildSmallvilleLlmPlannerRequest` retrieves
memory per agent with the same agent-addressable scoring basis used by the
Memory plan source:

- query relevance
- importance
- recency
- agent affinity

The OpenAI Responses request body now carries the per-agent retrieval snapshots,
selected records, source event IDs, scores, selected-for agent IDs, and retrieval
weights. Accepted deterministic or provider-shaped output then records that
same evidence under canonical event metadata before replay.

## Files Changed

- `src/adapters/llmPlannerAdapter.ts`
- `src/tests/llm-planner-adapter.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-agent-addressable-provider-memory.md`

## Acceptance Evidence

- LLM planner requests now include `memory.retrievals`.
- Request memory retrievals are scoped by agent identity, role, query, current
  timestamp, and the relevance / importance / recency / agent-affinity weights.
- Selected memory records carry retrieval scores and `selectedForAgentIds`.
- Agent snapshots now list memory IDs selected for that agent, rather than only
  records originally authored by that agent.
- OpenAI Responses request bodies include retrieval evidence in the user
  payload while still excluding API keys.
- Accepted events include `metadata.agentAddressableMemory` with selected
  record IDs, source event IDs, selected records, retrieval snapshots, selected
  agent IDs, and weights.
- `metadata.llmPlanner` includes selected memory source event IDs and
  agent-addressable retrieval counts.
- Provider-shaped mock output that omits `selectedMemoryRecordIds` still inherits
  the request's selected agent-addressable memory evidence through the same
  parser and quarantine path.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/llm-planner-adapter.test.ts`: passed, 1 file /
  7 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 14 files / 82 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

Local environment check:

- `OPENAI_API_KEY_MISSING`

Live provider call:

- Not executed in this environment because no API key was present.
- No API key was created, requested, printed, stored, or written.

## Notion / Linear / GitHub Write-Back

Actual write-back and read-back completed:

- GitHub PR #1 body updated to include this provider-memory continuation,
  commit `5f6b7ec`, verification, and scope truth.
- Notion S15 / M5 runbook page comment:
  `399acb4b-b6e6-81a1-8141-001d1a680748`
- Linear MDL-129 comment: `31a3a215-bec1-4bf5-a486-06d245860ed4`
- Linear MDL-152 comment: `28524073-a2fe-4e8c-913e-aa33f71ae838`

Scope truth:

- No Notion page content was replaced; this was a page-level comment.
- No Linear issue state was changed.
- No GitHub PR was merged or closed.

## Scope Truth

- This is not a live-verified provider-backed autonomous Smallville simulation.
- This does not put API keys or provider calls in browser code.
- This does not make the renderer own memory, planner, or model facts.
- This does not claim final Stanford Smallville parity.
- The real next gap is a live provider run using this request shape, with the
  raw provider response captured as evidence without exposing secrets.
