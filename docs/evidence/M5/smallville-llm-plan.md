# Smallville LLM Planner Contract Evidence

Session: post-M5 LLM planner contract continuation
Date: 2026-07-04
Branch: `codex/smallville-asset-pipeline`
PR: `https://github.com/sophistd/agent-town/pull/1`

## Scope

Move the Smallville-oriented runtime one layer closer to generative agents by
adding a model-planner contract boundary:

```text
prior AgentEvent + durable memory -> LLM planner request
model-shaped JSON response -> Adapter -> AgentEvent -> WorldState -> Projection views
```

This session does not call a live LLM provider, does not add API-key handling,
and does not put model execution in browser code. The UI source uses a
deterministic model-shaped fixture response so parser, quarantine, replay, and
projection behavior can be tested and rendered without network or secret
dependencies.

## Implementation

- Added canonical `metadata.source = "llm"` support.
- Added `src/adapters/llmPlannerAdapter.ts`.
- Added a pure request builder:
  - summarizes prior canonical events
  - selects durable memory records
  - exposes allowed event types, roles, locations, statuses, and cognitive
    stages
  - records request id and prompt hash
- Added a response parser:
  - accepts object or JSON-string responses
  - maps each step to a candidate `AgentEvent`
  - validates with the existing event validator
  - quarantines invalid JSON, invalid steps, duplicate IDs, duplicate
    `(runId, sequence)` pairs, missing message targets, and missing tool names
  - stores inspection evidence under `metadata.llmPlanner`
- Added deterministic fixture result:
  - memory retrieval
  - reflection
  - planning decision
  - planner-to-coder message
  - adapter validation tool call
  - adversarial review
  - memory write limitation
  - done closure
- Added UI source button: `LLM plan`.
- Prevented deterministic `llm-plan` fixture output from writing back into the
  browser memory bank.
- Fixed a Phaser lifecycle guard found during browser QA: async map-load
  rerenders now require `this.add.displayList` / `this.add.updateList` before
  creating a container, avoiding stale scene renders after teardown boundaries.

## Files Changed

- `src/adapters/llmPlannerAdapter.ts`
- `src/events/types.ts`
- `src/events/constants.ts`
- `src/game/AgentTownScene.ts`
- `src/ui/App.tsx`
- `src/ui/ImportPanel.tsx`
- `src/tests/llm-planner-adapter.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/NEXT_PHASE.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/VISUAL_MAPPING.md`
- `docs/evidence/M5/smallville-llm-plan.md`
- `docs/evidence/M5/smallville-llm-plan-qa.json`
- `docs/evidence/M5/smallville-llm-plan-pixel-check.json`
- `docs/evidence/M5/smallville-llm-plan-desktop.png`
- `docs/evidence/M5/smallville-llm-plan-interaction.png`
- `docs/evidence/M5/smallville-llm-plan-mobile.png`
- `docs/evidence/M5/smallville-llm-plan-mobile-map.png`

## AgentEvent Boundary Self-Check

- `src/adapters/llmPlannerAdapter.ts` is the only new source-specific
  normalization layer.
- Accepted model-shaped output becomes canonical `AgentEvent[]` before replay.
- Invalid model-shaped output is quarantined and cannot enter `WorldState`.
- `metadata.llmPlanner` is inspection evidence carried by the event stream.
- The renderer receives the same `WorldState` shape as every other source.
- No adapter-specific branch was added to `src/game/*`.
- Browser QA found and fixed a renderer lifecycle guard; the fix preserves the
  projection boundary and only prevents rendering after the Phaser object
  factory is no longer usable.
- No new external visual asset was added.
- No repo-level `LICENSE` file was added.

## Verification

Initial focused checks:

```text
pnpm typecheck
pnpm test -- src/tests/llm-planner-adapter.test.ts
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test -- src/tests/llm-planner-adapter.test.ts`: passed, 11 files / 65
  tests.

Full required checks after the lifecycle guard and rendered evidence:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Final results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 11 files / 65 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Known build warning:

- Vite reports the existing Phaser-sized bundle warning:
  `Some chunks are larger than 500 kB after minification.`

## Rendered Evidence

Browser plugin check:

- In-app browser opened `http://localhost:5173/`, found exactly one `LLM plan`
  button, clicked it, and observed `llm-plan · 8 events`, `Warnings 0`,
  `Quarantine 0`, and canvas dimensions `1040 x 900`.
- `domSnapshot()` still hit the known plugin-side error:
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- That plugin limitation is why the durable screenshots and console assertions
  were produced with fresh Playwright pages.

Playwright QA:

- `docs/evidence/M5/smallville-llm-plan-qa.json`
- `docs/evidence/M5/smallville-llm-plan-pixel-check.json`
- `docs/evidence/M5/smallville-llm-plan-desktop.png`
- `docs/evidence/M5/smallville-llm-plan-interaction.png`
- `docs/evidence/M5/smallville-llm-plan-mobile.png`
- `docs/evidence/M5/smallville-llm-plan-mobile-map.png`

Assertions from `smallville-llm-plan-qa.json`:

- Desktop loaded `llm-plan · 8 events`.
- Desktop accepted 8 events with warnings/quarantine at 0.
- Desktop seeded prior context by loading Routine day first; memory bank showed
  75 records before `LLM plan`.
- Detail view exposed `metadata.llmPlanner`,
  `selectedMemoryRecordIds`, and `validate_llm_planner_contract`.
- Zoom changed visible state.
- Critical filter changed visible Timeline count.
- Next changed cursor.
- Play advanced or entered running state.
- Desktop and mobile horizontal overflow were 0.
- Desktop and mobile console errors/page errors were 0.

Pixel checks from `smallville-llm-plan-pixel-check.json`:

- Desktop screenshot: nonblank, 1440 x 960, 5444 unique colors.
- Interaction screenshot: nonblank, 1440 x 960, 4876 unique colors.
- Mobile full-page screenshot: nonblank, 780 x 9854, 6880 unique colors.
- Mobile map crop: nonblank, 742 x 642, 1893 unique colors.

## Notion / Linear Sync

Actual write-back after pushing commit
`f905938 feat: add llm planner contract adapter`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-8164-b233-001d462e83c1`.
- Linear MDL-129 comment created:
  `72694329-84f6-4e5b-ba17-4db2a2bd8a85`.
- Linear MDL-144 comment created:
  `110bb9c4-88d1-4c80-aa14-27d8a98b5307`.

Read-back after write:

- Notion `get_comments` returned comment
  `393acb4b-b6e6-8164-b233-001d462e83c1` with commit, scope truth,
  verification, evidence paths, and remaining gap.
- Linear `list_comments` for MDL-129 returned comment
  `72694329-84f6-4e5b-ba17-4db2a2bd8a85`.
- Linear `list_comments` for MDL-144 returned comment
  `110bb9c4-88d1-4c80-aa14-27d8a98b5307`.

## Scope Truth

- This is an LLM planner contract and deterministic parser fixture.
- It is not a live OpenAI, Anthropic, or other provider integration.
- It does not add API keys, secrets, network calls, or production dependencies.
- It does not claim autonomous social emergence.
- It does not claim final Stanford Smallville parity.
- It does not alter Phaser renderer ownership: `AgentEvent` remains the only
  source of runtime truth.

## Remaining Limitations

- Provider-backed LLM generation is still future work.
- Agent-addressable memory is available to the request builder, but no real
  model has yet consumed it.
- The fixture proves parser and projection behavior, not believability.
- There is still no server-backed world memory database.

## Next Session Candidate

Connect a real provider-backed LLM planning call behind
`src/adapters/llmPlannerAdapter.ts`, keeping API keys out of browser code and
preserving deterministic fixture coverage for parser/quarantine/replay tests.
