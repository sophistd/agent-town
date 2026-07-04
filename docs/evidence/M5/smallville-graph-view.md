# Smallville Graph View Evidence

Date: 2026-07-04

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation promotes replay-derived relationship state into a dedicated
Graph View.

The source of truth remains canonical `AgentEvent` evidence reduced into
`WorldState.relationships`. The Graph View reads that state plus the canonical
event list to provide:

- a compact relationship network projection
- relationship kind filters for `message`, `handoff`, `declared`, and
  `diffusion`
- text search across agents, tags, event ids, and evidence event content
- selected-agent relationship filtering
- evidence jump buttons that move Timeline and Detail to canonical events

The Graph View does not create relationships, mutate replay, infer social facts
from proximity, or give React/Phaser/Tiled/local UI state ownership of runtime
truth.

## Files Changed

- `src/ui/relationshipGraphModel.ts`
- `src/ui/RelationshipGraphPanel.tsx`
- `src/ui/App.tsx`
- `src/tests/relationship-graph-model.test.ts`
- `README.md`
- `docs/DEMO_SCRIPT.md`
- `docs/EVENT_SCHEMA.md`
- `docs/VISUAL_MAPPING.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-graph-view.md`

## Acceptance Evidence

- `WorldState.relationships` remains replay-derived relationship state.
- Graph filtering and search are implemented in a pure projection model.
- Evidence jump buttons target existing `AgentEvent` objects.
- The selected-agent filter consumes UI selection only as a filter, not as a
  relationship fact source.
- Run Summary and Detail remain compatible with the dedicated Graph View.

## Verification

Command run:

- `pnpm exec vitest run src/tests/relationship-graph-model.test.ts`: passed, 1
  file / 4 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 14 files / 82 tests.
- `pnpm build`: passed with the existing Vite/Phaser large chunk warning.
- `git diff --check`: passed.

Rendered QA:

- Browser plugin opened the local app and completed Social day, Graph filter,
  selected-agent filter, and evidence-jump checks. `domSnapshot()` still failed
  with plugin-side `TypeError: o.incrementalAriaSnapshot is not a function`.
- The Playwright CLI wrapper was checked after `npx` availability, but
  `@playwright/mcp` did not expose `playwright-cli`; Python Playwright was used
  for durable evidence.
- Playwright desktop 1440x960 passed.
- Playwright mobile 390x844 passed.
- Asset responses for map, tileset, and sprites were HTTP 200.
- Canvas and map screenshots were nonblank.
- No horizontal overflow on desktop or mobile.
- Graph checks passed: search value `valentine`, diffusion filter toggled
  `true` -> `false`, selected-agent filter toggled `false` -> `true`, evidence
  jump moved Cursor to `126 / 150` and selected event to `social-125`.
- Projection controls passed: zoom changed to `105%`, bubbles toggled
  `true` -> `false`, edges toggled `true` -> `false`, Critical filter changed
  the visible event set, Next changed Cursor `126 / 150` -> `127 / 150`, and
  Play changed status to running.
- Page errors: none.
- Console warnings: desktop WebGL `ReadPixels` performance warnings during
  screenshot capture only; mobile console clean.

## Evidence Files

- `docs/evidence/M5/smallville-graph-view-qa.json`
- `docs/evidence/M5/smallville-graph-view-pixel-check.json`
- `docs/evidence/M5/smallville-graph-view-desktop.png`
- `docs/evidence/M5/smallville-graph-view-interaction.png`
- `docs/evidence/M5/smallville-graph-view-desktop-map.png`
- `docs/evidence/M5/smallville-graph-view-mobile.png`
- `docs/evidence/M5/smallville-graph-view-mobile-map.png`

## Asset License Status

No external visual assets were imported. No Stanford Smallville assets were
copied. No third-party tilesets or sprites were added. No repository `LICENSE`
file was added.

## Notion / Linear Write-Back

Pending final write-back after verification.

## Remaining Limitations

This is not full Stanford Smallville parity. Graph View makes relationship
evidence inspectable, but it is still deterministic projection evidence, not
autonomous social emergence, a provider-backed simulation, server-backed memory,
human believability ratings, or an empirical ablation study.

## Next Session Candidate

Run and evidence a real provider-backed LLM planning call through the existing
parser/quarantine boundary, or promote durable memory records into a dedicated
Memory view after the storage boundary is clarified.
