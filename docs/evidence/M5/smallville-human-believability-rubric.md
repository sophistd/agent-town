# Smallville Human-Review Believability Rubric Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation turns the previous structural Smallville evaluator into a
reviewable human-believability rubric.

The rubric is still a projection report. It reads canonical `AgentEvent[]` plus
replayed `WorldState` and returns criteria that a reviewer can inspect without
trusting React, Phaser, Tiled objects, sprites, browser UI state, or provider
state as runtime facts.

The rubric scores:

- identity continuity
- experience-to-action chain
- memory grounding
- social propagation
- routine continuity
- adaptive response
- spatial continuity
- reviewability

Each criterion includes:

- 0-4 review score
- `passed` / `partial` / `missing` status
- evidence count and target count
- evidence event IDs
- evidence agent IDs
- finding
- remaining risk

This is not a completed human-subject believability study and does not claim
full Stanford Smallville parity.

## Files Changed

- `src/events/smallvilleEvaluation.ts`
- `src/ui/RunSummary.tsx`
- `src/tests/smallville-evaluation.test.ts`
- `README.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-evaluation.md`
- `docs/evidence/M5/smallville-human-believability-rubric.md`
- `docs/evidence/M5/smallville-human-believability-rubric.json`
- `docs/evidence/M5/smallville-human-believability-rubric-qa.json`
- `docs/evidence/M5/smallville-human-believability-rubric-desktop.png`
- `docs/evidence/M5/smallville-human-believability-rubric-desktop-interaction.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile-map.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile-summary.png`
- `docs/evidence/M5/smallville-human-believability-rubric-playwright-desktop.png`
- `docs/evidence/M5/smallville-human-believability-rubric-playwright-mobile.png`

## Acceptance Evidence

- Generic failure fixtures do not classify as Smallville-like and show missing
  human-review identity / experience-chain evidence.
- `Social day` passes social propagation and experience-to-action rubric
  criteria with 25 event-derived informed agents.
- `Routine day` passes routine continuity with all six routine phases.
- `Adaptive routine` passes adaptive response from routine revision evidence.
- `LLM plan` passes adaptive response from deterministic model-planner contract
  evidence, while still exposing identity, chain, memory, and routine gaps.
- Run Summary now displays `Human rubric`, top human-review evidence, and
  human-review gaps inside `Smallville Eval`.
- The rubric is derived from canonical events and replayed `WorldState`; it
  does not create events or mutate replay state.

## Generated Evidence

Machine-readable report:

- `docs/evidence/M5/smallville-human-believability-rubric.json`

Summary from the generated report:

| Scenario | Smallville-like | Structural score | Human rubric score | Top human-review gaps |
| --- | --- | ---: | ---: | --- |
| `generic_failure` | false | 33 | 19 | adaptive response, experience-to-action chain, identity continuity, memory grounding |
| `smallville_social` | true | 67 | 72 | routine continuity, adaptive response, reviewability |
| `smallville_routine` | true | 67 | 91 | reviewability |
| `adaptive_routine` | true | 75 | 97 | none |
| `deterministic_llm_plan` | true | 44 | 34 | experience-to-action chain, identity continuity, memory grounding, routine continuity |

## Verification

Commands run:

- `pnpm exec vitest run src/tests/smallville-evaluation.test.ts`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 20 files / 109 tests.
- `pnpm build`: passed with the existing Phaser/Vite large chunk warning.
- `git diff --check`: passed.

Real-browser QA:

- Chrome DevTools Protocol desktop 1440x960: passed.
- Chrome DevTools Protocol mobile 390x844: passed.
- `npx --yes playwright screenshot --viewport-size=1440,960`: passed.
- `npx --yes playwright screenshot --viewport-size=390,844`: passed.
- Human rubric text present.
- Smallville Eval section present.
- Desktop and mobile screenshots nonblank by PNG pixel sampling.
- Mobile map and mobile Run Summary screenshots captured.
- No horizontal overflow on desktop or mobile.
- Zoom changed visible state from `100%` to `105%`.
- Bubbles toggle changed from `true` to `false`.
- Edges toggle changed from `true` to `false`.
- Critical filter changed visible timeline events from `150` to `25`.
- Next changed cursor from `1 / 150 · social-000` to
  `2 / 150 · social-001`.
- Play advanced cursor to `3 / 150 · social-002`.
- No runtime exceptions.
- No serious browser error logs. The only ignored log was the existing
  `favicon.ico` 404.

Visual evidence:

- `docs/evidence/M5/smallville-human-believability-rubric-desktop.png`
- `docs/evidence/M5/smallville-human-believability-rubric-desktop-interaction.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile-map.png`
- `docs/evidence/M5/smallville-human-believability-rubric-mobile-summary.png`
- `docs/evidence/M5/smallville-human-believability-rubric-playwright-desktop.png`
- `docs/evidence/M5/smallville-human-believability-rubric-playwright-mobile.png`

## Asset License Status

No external visual assets were imported. No Stanford Smallville assets were
copied. No third-party tilesets or sprites were added. No repository `LICENSE`
file was added.

## Notion / Linear Write-Back

Pending for this continuation.

Scope truth:

- No Notion page content has been replaced yet.
- No Linear issue state has been changed yet.
- No merge has been performed.

## Remaining Limitations

The rubric makes the current evidence reviewable, but it is still deterministic
and internal to the projection pipeline. It is not a live provider-backed
benchmark, an external human study, autonomous social emergence, or complete
Stanford Smallville parity.

## Next Session Candidate

Back the human-review rubric with a provider-backed benchmark, external reviewer
study, or dedicated evaluation dashboard while preserving `AgentEvent` as the
only runtime fact source.
