# S15 Final Demo Notes

Session: S15 - final README, demo script, and evidence package
Date: 2026-07-04
Reviewer: Codex

## Sources Checked

- Notion root PRD and spec:
  https://app.notion.com/p/393acb4bb6e68173afe9f05fbcf69313
- Notion S15 runbook:
  https://app.notion.com/p/393acb4bb6e681bea31fedaf1f8c8ce2
- Linear implementation issue:
  https://linear.app/infoark/issue/MDL-145
- Linear M5 acceptance gate:
  https://linear.app/infoark/issue/MDL-129
- Linear M5 red-check:
  https://linear.app/infoark/issue/MDL-152

## Demo Positioning

First-run copy:

```text
This town is not a game simulation. It is a projection of agent runtime events.
The runtime facts come from AgentEvent. Town, Timeline, Detail, Graph, and
Memory views are projections.
```

Chinese operator copy:

```text
这个小镇不是自主生命模拟游戏。它是 Agent 运行事件的投影。
事实来自 AgentEvent；小镇、时间线、详情、关系和记忆视图只是投影。
```

## Demo Story

The demo script in `docs/DEMO_SCRIPT.md` follows:

```text
user task -> planning -> research -> coding -> review -> memory -> done
```

The default failure run adds error, blocked, repair, and evidence checkpoints so
the reviewer can inspect the runtime path instead of only seeing a polished
happy path.

## Screenshot And Recording References

Screenshots currently available:

- `docs/evidence/M5/visual-layout.png`
- `docs/evidence/M4/source-switcher.png`
- `docs/evidence/M3/detail-panel.png`
- `docs/evidence/M3/timeline-controls.png`
- `docs/evidence/M2/town-view.png`
- `docs/evidence/M2/bubble-detail.png`

No new recording was captured in S15. The M5 evidence package references the
existing screenshot set and command output.

## Visual And Asset State

- S15 deferred Tiled import in `docs/evidence/M5/visual-layout.md`.
- A later asset/map session introduces a project-authored Tiled-compatible JSON
  object map at `public/maps/town-v1.tiled.json`; external PNG tilesets and
  spritesheets remain deferred.
- Stable zones are documented in `docs/VISUAL_MAPPING.md`.
- Visual density rules are documented in `docs/VISUAL_MAPPING.md` and README.
- Asset license state is documented in `docs/ASSET_LICENSES.md`.
- No external visual assets are imported.

## Adapter State

The demo can switch among:

- mock failure run
- native JSONL sample
- WebSocket sample

All accepted source input returns to:

```text
AgentEvent -> WorldState -> projection views
```

Invalid adapter input is quarantined and does not enter replay.

## Evidence Package

- README: `README.md`
- Demo script: `docs/DEMO_SCRIPT.md`
- Visual mapping and density rules: `docs/VISUAL_MAPPING.md`
- 200-event performance note:
  `docs/evidence/M5/performance-200-events.md`
- Final demo notes: `docs/evidence/M5/final-demo-notes.md`
- Next phase recommendations: `docs/NEXT_PHASE.md`

## Commands Run

S15 required commands:

```plain text
pnpm typecheck
Result: passed
Relevant output: tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json

pnpm test
Result: passed
Relevant output: Test Files 6 passed (6); Tests 29 passed (29); Duration 564ms

pnpm build
Result: passed
Relevant output: vite built in 1.90s
```

Known build warning:

```plain text
Some chunks are larger than 500 kB after minification.
```

The warning is the existing Phaser bundle-size warning and is not a docs or M5
packaging regression.

## Linear Self-Check

- [x] README includes setup, architecture, demo run, JSONL import, adding event
  type, adding building, adding adapter, and limitations.
- [x] Demo script tells task -> planning -> research -> coding -> review ->
  memory -> done.
- [x] First-run copy states that the town is a projection of runtime events,
  not an autonomous game simulation.
- [x] 200-event stress evidence exists.
- [x] Screenshot set is referenced.
- [x] Visual density rules are documented.
- [x] Final docs link to Notion root spec and Linear gates.
- [x] Known limitations and next-phase recommendations are written.
- [x] Docs explain how to add a new event type, new building, new agent role,
  and new adapter.

## Known Limitations

- First-run copy is documented for the demo, but the app does not yet include a
  dedicated onboarding modal or first-run UI surface.
- External visual assets remain deferred. The current map layer is
  project-authored JSON metadata, not an imported tileset or sprite sheet.
- Browser frame-rate profiling is not part of S15; current performance evidence
  is deterministic replay plus demo usability.
- Dedicated Graph and Memory tabs remain next-phase product work.

## Next Action

Close MDL-145, then close the M5 acceptance gate and M5 red-check only after
`pnpm typecheck`, `pnpm test`, and `pnpm build` pass in the current worktree.
