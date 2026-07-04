# Smallville Evaluation Evidence

Date: 2026-07-04

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds a structural Smallville evaluation projection.

The evaluator reads canonical `AgentEvent[]` plus replayed `WorldState` and
returns:

- `isSmallvilleLike`
- overall structural score
- capability scores
- top gaps
- ablation coverage checks
- event, agent, relationship, social, and routine evidence counts

Run Summary now displays `Smallville Eval` for Smallville-like sources. The
panel shows strongest evidence, visible gaps, score, ablation coverage, and
routine phase coverage. It is intentionally a projection report, not a human
believability study.

## Files Changed

- `src/events/smallvilleEvaluation.ts`
- `src/ui/RunSummary.tsx`
- `src/tests/smallville-evaluation.test.ts`
- `README.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-evaluation.md`

## Acceptance Evidence

- Generic failure fixtures do not classify as Smallville-like.
- `Social day` surfaces passed relationship graph and social coordination
  evidence, plus missing routine, persistent memory, and LLM gaps.
- `Routine day` surfaces passed routine schedule evidence and six routine
  phases.
- `LLM plan` surfaces passed LLM contract evidence.
- Evaluation is derived from canonical events and replay state; React and Phaser
  do not create behavioral facts.
- The parity matrix now marks `Evaluation` as `Initial`, not complete.

## Verification

Commands run:

- `pnpm typecheck`: passed.
- `pnpm test -- smallville-evaluation`: passed, 12 files / 71 tests.
- `pnpm test`: passed, 12 files / 71 tests.
- `pnpm build`: passed with the existing Phaser/Vite large chunk warning.
- `git diff --check`: passed.

Rendered QA:

- Browser plugin opened `http://localhost:5173/`, clicked `Social day`,
  `Routine day`, and `LLM plan`, and confirmed `Smallville Eval` text in the
  real page.
- Browser `domSnapshot()` still failed with plugin-side
  `TypeError: o.incrementalAriaSnapshot is not a function`, so fresh
  Playwright was used for durable evidence.
- Playwright desktop 1440x960 passed.
- Playwright mobile 390x844 passed.
- Canvas screenshots were nonblank.
- Zoom, bubbles, edges, Critical filter, Next, and Play interactions passed.
- No page errors and no console errors.
- Desktop console warnings were WebGL `ReadPixels` performance warnings from
  the pixel-check path only.

## Evidence Files

- `docs/evidence/M5/smallville-evaluation-qa.json`
- `docs/evidence/M5/smallville-evaluation-pixel-check.json`
- `docs/evidence/M5/smallville-evaluation-desktop.png`
- `docs/evidence/M5/smallville-evaluation-desktop-interaction.png`
- `docs/evidence/M5/smallville-evaluation-mobile.png`
- `docs/evidence/M5/smallville-evaluation-mobile-interaction.png`
- `docs/evidence/M5/smallville-evaluation-mobile-map.png`

## Asset License Status

No external visual assets were imported. No Stanford Smallville assets were
copied. No third-party tilesets or sprites were added. No repository `LICENSE`
file was added.

## Notion / Linear Write-Back

Actual write-back and read-back completed:

- Notion S15 / M5 runbook page comment:
  `393acb4b-b6e6-8131-82dc-001dc4e652a5`
- Linear MDL-129 comment: `915f9514-3351-42cd-a641-ad81fd4455e3`
- Linear MDL-152 comment: `5db10cc1-ea71-447a-9bc5-4e19074f4347`

Scope truth:

- No Notion page content was replaced; this was a page-level comment.
- No Linear issue state was changed.
- No merge has been performed.

## Remaining Limitations

This is not full Stanford Smallville parity. The evaluator is structural and
deterministic; it is not a human believability study, provider-backed benchmark,
autonomous social emergence, server-backed memory, or empirical ablation study.

## Next Session Candidate

Turn the structural evaluator into a human-review rubric, provider-backed eval
benchmark, or dedicated evaluation dashboard while keeping all evidence derived
from canonical events and replayed `WorldState`.
