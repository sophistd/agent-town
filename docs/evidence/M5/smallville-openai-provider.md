# Smallville OpenAI Provider Boundary Evidence

Date: 2026-07-04

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds a provider-backed boundary for the LLM planner contract.

The browser UI still uses the deterministic `LLM plan` fixture. The new
provider path is adapter-layer code for local or server-side runtimes:

- `buildOpenAiResponsesPlannerBody`
- `extractOpenAiResponsesText`
- `callOpenAiLlmPlanner`

The provider call builds an OpenAI Responses request with `store: false`,
developer/user messages, JSON-schema output formatting, and request metadata.
Provider `output_text` is then sent through the same `parseLlmPlannerResponse`
validation and quarantine path as deterministic fixtures.

## Files Changed

- `src/adapters/llmPlannerAdapter.ts`
- `src/tests/llm-planner-adapter.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-openai-provider.md`

## Acceptance Evidence

- OpenAI Responses request body includes `store: false`.
- Request body uses developer/user messages and JSON-schema output formatting.
- Request body includes planner metadata but no API key.
- Provider output is parsed from `output_text`.
- Provider output is validated through the existing canonical `AgentEvent`
  parser and quarantine gate.
- Missing API key returns a warning and does not attempt a network call.
- Browser code still does not receive API keys or call the provider.

## Verification

Commands run:

- `pnpm test -- llm-planner-adapter`: passed, 12 files / 74 tests.
- `pnpm typecheck`: passed.

Local environment check:

- `OPENAI_API_KEY=missing`

Live provider call:

- Not executed in this environment because no API key was present.
- No API key was created, requested, printed, stored, or written.

Official API reference checked:

- OpenAI Responses API create response:
  https://platform.openai.com/docs/api-reference/responses/create

## Asset License Status

No external visual assets were imported. No Stanford Smallville assets were
copied. No third-party tilesets or sprites were added. No repository `LICENSE`
file was added.

## Notion / Linear Write-Back

Actual write-back and read-back completed:

- Notion S15 / M5 runbook page comment:
  `393acb4b-b6e6-81c9-8687-001d0abca62f`
- Linear MDL-129 comment: `b2a2da46-575f-47af-88b5-b86a18dea66e`
- Linear MDL-152 comment: `70d2d3f8-a437-469b-9643-9672cba43d0b`

Scope truth:

- No Notion page content was replaced; this was a page-level comment.
- No Linear issue state was changed.
- No merge has been performed.

## Remaining Limitations

This is not a live-verified provider-backed autonomous Smallville simulation.
The provider boundary is implemented and mock-fetch tested, but a real
OpenAI-backed planner run still needs a local/server-side `OPENAI_API_KEY` and
durable evidence of the returned model output replaying as canonical
`AgentEvent`.

## Continuation

2026-07-10 follow-up evidence:

- `docs/evidence/M5/smallville-agent-addressable-provider-memory.md`

That continuation updates the provider request shape so it carries
agent-addressable memory retrieval snapshots, selected records, source event
IDs, retrieval scores, selected-for agent IDs, and retrieval weights. It still
does not run a live provider call without a local/server-side API key.

## Next Session Candidate

Run the provider-backed planner with a local/server-side API key, persist the
raw provider response as evidence without exposing secrets, and replay the
accepted `AgentEvent` output through the existing town projection.
