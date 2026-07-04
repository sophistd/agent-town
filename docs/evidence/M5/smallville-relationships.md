# Smallville Relationship State Evidence

Date: 2026-07-04

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation adds replay-derived relationship state to `WorldState`.

The source of truth remains canonical `AgentEvent` evidence:

- `message` / `handoff` events with `targetAgentId`
- `metadata.relationships`
- `metadata.socialDiffusion.heardFromAgentId`
- `metadata.socialDiffusion.spreadsToAgentIds`

The reducer derives `WorldState.relationships` with stable agent pairs,
strength, interaction counts, kind-specific counts, last event, and bounded
evidence event IDs. Run Summary shows relationship count and top relationships.
Detail shows the selected agent's strongest relationship evidence.

## Files Changed

- `src/events/types.ts`
- `src/events/reducer.ts`
- `src/events/selectors.ts`
- `src/ui/RunSummary.tsx`
- `src/ui/DetailPanel.tsx`
- `src/tests/reducer.test.ts`
- `README.md`
- `docs/EVENT_SCHEMA.md`
- `docs/VISUAL_MAPPING.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-relationships.md`

## Acceptance Evidence

- Relationship state is derived during replay, not owned by Phaser, sprites,
  Tiled objects, local storage, or UI selection.
- Basic `message` and `handoff` events create relationship state.
- Social metadata creates declared and diffusion relationship state.
- `Social day` produces a deterministic 25-agent relationship graph.
- Evidence event IDs are bounded so replay state remains inspectable.

## Verification

Command run:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 11 files / 67 tests.
- `pnpm build`: passed with the existing Phaser/Vite large chunk warning.
- `git diff --check`: passed.
- Targeted `pnpm test -- reducer`: passed, 11 files / 67 tests.

Rendered QA:

- Browser plugin opened `http://localhost:5173/`, clicked `Social day`, and
  confirmed `social · 150 events`, `Relationships`, top relationship evidence,
  selected-agent relationship detail, and no horizontal overflow.
- Browser `domSnapshot()` still failed with plugin-side
  `TypeError: o.incrementalAriaSnapshot is not a function`, so fresh
  Playwright was used for durable evidence.
- Playwright desktop 1440x960 passed.
- Playwright mobile 390x844 passed.
- Canvas screenshots were nonblank.
- Zoom, bubbles, edges, Critical filter, Next, and Play interactions passed.
- No page errors. Console errors were absent; desktop warnings were WebGL
  `ReadPixels` warnings during screenshot capture only.

## Evidence Files

- `docs/evidence/M5/smallville-relationships-qa.json`
- `docs/evidence/M5/smallville-relationships-pixel-check.json`
- `docs/evidence/M5/smallville-relationships-desktop.png`
- `docs/evidence/M5/smallville-relationships-interaction.png`
- `docs/evidence/M5/smallville-relationships-mobile.png`
- `docs/evidence/M5/smallville-relationships-mobile-map.png`

## Asset License Status

No external visual assets were imported. No Stanford Smallville assets were
copied. No third-party tilesets or sprites were added. No repository `LICENSE`
file was added.

## Notion / Linear Write-Back

Pending actual write-back and read-back.

## Remaining Limitations

This is not full Stanford Smallville parity. Relationship state is deterministic
projection evidence, not autonomous social emergence, provider-backed behavior,
server-backed memory, or believability evaluation.

## Next Session Candidate

Promote `WorldState.relationships` into a dedicated Graph view, or connect a
provider-backed LLM planner behind the existing parser/quarantine contract.
