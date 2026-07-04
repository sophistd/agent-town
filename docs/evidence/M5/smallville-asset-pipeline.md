# Smallville-Like Asset Pipeline Evidence

Session: post-M5 asset/map follow-up
Date: 2026-07-04
Branch: `codex/smallville-asset-pipeline`
PR: `https://github.com/sophistd/agent-town/pull/1`

## Scope

Move the town projection from a code-native placeholder toward a maintainable,
Smallville-like pixel asset pipeline while preserving the invariant:

```text
External source -> Adapter -> AgentEvent -> WorldState -> Projection views
```

This session now introduces a project-authored Tiled-compatible map, generated
terrain tileset, generated building sprite sheet, generated agent role/status
sprite sheet, and baked pixel-town background. It does not copy Stanford
Smallville assets, third-party pixel art, downloaded sprites, or source-unknown
visual assets.

## External Sources Checked

- Notion runbook index:
  `https://app.notion.com/p/393acb4bb6e681cc9b54c0c41957775a`
- Notion S14:
  `https://app.notion.com/p/393acb4bb6e6814a9294e2fd56941431`
- Notion S15:
  `https://app.notion.com/p/393acb4bb6e681bea31fedaf1f8c8ce2`
- Notion M5 spec:
  `https://app.notion.com/p/393acb4bb6e681f6a812f61011e7c65d`
- Notion root spec:
  `https://app.notion.com/p/393acb4bb6e68173afe9f05fbcf69313`
- Linear MDL-144, MDL-145, MDL-129, and MDL-152.

Read result from the earlier asset session:

- S14 / MDL-144: Done; original decision deferred Tiled/external art.
- S15 / MDL-145: Done.
- M5 acceptance gate MDL-129: Done.
- M5 red-check MDL-152: Done.
- Linear search did not find a separate current visual-asset issue.

This revision is a direct response to the product bar being raised from "asset
pipeline minimal loop" to "materially closer to Stanford Smallville-level
pixel-town experience."

The latest continuation adds an event-driven "Town day" slice: generated
interior anchors, a deterministic Smallville-like day fixture, activity labels,
and movement trails. This still does not claim autonomous generative-agent
simulation; the routine is an `AgentEvent` stream projected through `WorldState`.

## Implementation Decision

Adopt an original generated asset pipeline:

- Add `scripts/generate_pixel_town_assets.py` as the reproducible local
  generator.
- Generate `public/maps/town-v1.tiled.json` with tile layers, tileset metadata,
  object layers, stable location IDs, and projection-only asset properties.
- Generate `public/maps/town-v1-preview.png` as the baked top-down pixel-town
  background.
- Generate `public/tilesets/agent-town-v1.png` as the terrain/detail tileset.
- Generate `public/sprites/agent-roles-v1.png` as the role/status agent sprite
  sheet.
- Generate `public/sprites/buildings-v1.png` as the building sprite sheet.
- Generate interior anchor art and an `interiors` object layer in
  `public/maps/town-v1.tiled.json`.
- Parse map properties, tilesets, tile layers, and object layers in
  `src/game/townMap.ts`.
- Preserve `AgentEvent.metadata.subLocationId` and `metadata.activity` in
  `WorldState` as projection hints.
- Add `src/events/mockSmallvilleDayRun.ts` as a canonical event stream with 37
  events, five agents, 14 interior anchors, and morning/midday/afternoon/evening
  metadata.
- Preload the map background, tileset, agent sprite sheet, and building sprite
  sheet in `AgentTownScene`.
- Render the baked pixel map first, with tile/vector fallback paths preserved.
- Render agents from sprite frames selected by `AgentState.role` and
  `AgentState.status`, with generated geometry fallback preserved.
- Render interior-positioned agents, bubbles, edges, activity labels, and
  movement trails from `WorldState`.
- Keep event routing and stable location IDs in `src/events/routing.ts`.

This gives the repo a real asset/map pipeline without allowing Tiled objects,
Phaser objects, image names, or sprite frames to own runtime facts.

## Stable Location IDs

The map object layer preserves:

- `town_hall`
- `library`
- `workshop`
- `archive`
- `review_room`
- `dispatch_board`
- `square`

`unknown` remains a routing fallback and is not rendered as a normal building.

## Files Changed

- `scripts/generate_pixel_town_assets.py`
- `public/maps/town-v1.tiled.json`
- `public/maps/town-v1-preview.png`
- `public/tilesets/agent-town-v1.png`
- `public/sprites/agent-roles-v1.png`
- `public/sprites/buildings-v1.png`
- `src/game/townMap.ts`
- `src/game/AgentTownScene.ts`
- `src/game/renderTownMap.ts`
- `src/game/renderLocations.ts`
- `src/game/renderAgents.ts`
- `src/game/renderBubbles.ts`
- `src/game/renderEdges.ts`
- `src/events/types.ts`
- `src/events/reducer.ts`
- `src/events/mockSmallvilleDayRun.ts`
- `src/ui/App.css`
- `src/ui/App.tsx`
- `src/ui/ImportPanel.tsx`
- `src/tests/reducer.test.ts`
- `src/tests/replay.test.ts`
- `src/tests/town-map.test.ts`
- `README.md`
- `docs/VISUAL_MAPPING.md`
- `docs/ASSET_LICENSES.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/final-demo-notes.md`
- `docs/evidence/M5/smallville-assets-qa.json`
- `docs/evidence/M5/smallville-day-qa.json`
- `docs/evidence/M5/smallville-day-pixel-check.json`
- `docs/evidence/M5/smallville-asset-pipeline.md`
- `docs/evidence/M5/smallville-asset-pipeline-desktop.png`
- `docs/evidence/M5/smallville-asset-pipeline-interaction.png`
- `docs/evidence/M5/smallville-asset-pipeline-mobile.png`
- `docs/evidence/M5/smallville-asset-pipeline-mobile-map.png`
- `docs/evidence/M5/smallville-day-desktop.png`
- `docs/evidence/M5/smallville-day-interaction.png`
- `docs/evidence/M5/smallville-day-mobile.png`
- `docs/evidence/M5/smallville-day-mobile-map.png`

## Verification Commands

Focused checks during implementation:

```text
pnpm typecheck
pnpm test -- src/tests/town-map.test.ts
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test -- src/tests/town-map.test.ts`: passed, 8 files / 35 tests.
- `pnpm test`: passed after Town day fixture work, 8 files / 38 tests.

Full required checks after final docs/evidence edits:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 8 files / 38 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Build warning:

```text
Some chunks are larger than 500 kB after minification.
```

This is the existing Phaser/Vite bundle-size warning and does not indicate a
failed build.

## Browser Evidence

Local dev server:

```text
pnpm dev --host 127.0.0.1
http://127.0.0.1:5173/
```

Browser path:

- Codex Browser plugin was available and attempted first.
- Browser `domSnapshot()` failed with plugin-side error:
  `incrementalAriaSnapshot is not a function`.
- Fallback used Python Playwright because the session explicitly requires
  Playwright browser verification.
- QA result JSON:
  `docs/evidence/M5/smallville-assets-qa.json`.

Screenshots:

```text
docs/evidence/M5/smallville-asset-pipeline-desktop.png
docs/evidence/M5/smallville-asset-pipeline-interaction.png
docs/evidence/M5/smallville-asset-pipeline-mobile.png
docs/evidence/M5/smallville-asset-pipeline-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Header: `Agent Town`.
- Framework overlay absent.
- Horizontal overflow: `0`.
- Canvas count: `1`.
- Canvas rect: about `773 x 669`.
- Initial town toolbar: `cursor 0`, `visible 30/30`, `balanced`, `100%`.
- Asset HTTP responses: map JSON, baked map PNG, tileset PNG, agent sprite
  sheet, and building sprite sheet all returned `200`.

Interaction checks:

- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count from `30/30` to `7/30`.
- Next changed cursor from `0` to `1`.
- Play changed the timeline control state to `Pause` and header status to
  running.

Console health:

- No relevant app console errors or warnings.
- Chromium emitted WebGL `ReadPixels` performance warnings during screenshot
  capture; the QA JSON classifies these as browser screenshot GPU warnings, not
  application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect: about `372 x 322`.
- Mobile town canvas host fits the canvas height after the CSS fix.

PNG nonblank sampling:

```text
docs/evidence/M5/smallville-asset-pipeline-desktop.png: size=1440x960 sampled_unique_colors=342 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-asset-pipeline-interaction.png: size=1440x960 sampled_unique_colors=282 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-asset-pipeline-mobile.png: size=780x1688 sampled_unique_colors=179 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-asset-pipeline-mobile-map.png: size=780x1688 sampled_unique_colors=200 non_white_ratio=1.0000 transparent_ratio=0.0000
public/maps/town-v1-preview.png: size=1040x896 sampled_unique_colors=89 non_white_ratio=1.0000 transparent_ratio=0.0000
public/tilesets/agent-town-v1.png: size=128x128 sampled_unique_colors=49 non_white_ratio=0.2501 transparent_ratio=0.7499
public/sprites/agent-roles-v1.png: size=192x128 sampled_unique_colors=44 non_white_ratio=0.4583 transparent_ratio=0.5417
public/sprites/buildings-v1.png: size=1120x112 sampled_unique_colors=53 non_white_ratio=0.5516 transparent_ratio=0.4484
```

## Town Day Browser Evidence

The continuation QA targeted the event-driven Town day run and the new interior
anchors.

Browser path:

- Browser plugin was attempted first.
- Browser `domSnapshot()` still failed with plugin-side error:
  `incrementalAriaSnapshot is not a function`.
- Regular Playwright fallback used bundled Codex runtime Playwright 1.61.1 for
  clean console capture, screenshots, asset response checks, and interaction
  proof.
- QA result JSON:
  `docs/evidence/M5/smallville-day-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-day-pixel-check.json`.

Screenshots:

```text
docs/evidence/M5/smallville-day-desktop.png
docs/evidence/M5/smallville-day-interaction.png
docs/evidence/M5/smallville-day-mobile.png
docs/evidence/M5/smallville-day-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Active source: `smallville · 37 events`.
- Status copy: `Town day run loaded.`
- Town toolbar: `cursor 0`, `visible 37/37`, `expanded`, `100%`.
- Canvas count: `1`.
- Canvas rect: about `773 x 669`.
- Horizontal overflow: `0`.
- Framework overlay: absent.
- Asset HTTP responses all returned `200`:
  - `/maps/town-v1.tiled.json`
  - `/maps/town-v1-preview.png`
  - `/tilesets/agent-town-v1.png`
  - `/sprites/agent-roles-v1.png`
  - `/sprites/buildings-v1.png`

Interaction checks:

- Town day source loaded: `true`.
- Expanded density applied: `true`.
- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count to `9/37`.
- Next changed header cursor to `2 / 37`.
- Play changed header status to `running`.

Console health:

- Page errors: none.
- Relevant app console errors/warnings: none.
- Chromium emitted WebGL `ReadPixels` performance warnings during screenshot
  capture; these are recorded in the QA JSON and classified as screenshot GPU
  warnings, not application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack with Town day
  loaded.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect after scrolling: about `372 x 322`.

Town day PNG nonblank sampling:

```text
docs/evidence/M5/smallville-day-desktop.png: size=1440x960 sampled_unique_colors=360 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-day-interaction.png: size=1440x960 sampled_unique_colors=324 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-day-mobile.png: size=390x844 sampled_unique_colors=383 non_white_ratio=1.0000 transparent_ratio=0.0000
docs/evidence/M5/smallville-day-mobile-map.png: size=390x844 sampled_unique_colors=306 non_white_ratio=1.0000 transparent_ratio=0.0000
public/maps/town-v1-preview.png: size=1040x896 sampled_unique_colors=105 non_white_ratio=1.0000 transparent_ratio=0.0000
public/tilesets/agent-town-v1.png: size=128x128 sampled_unique_colors=49 non_white_ratio=0.2500 transparent_ratio=0.7500
public/sprites/agent-roles-v1.png: size=192x128 sampled_unique_colors=44 non_white_ratio=0.4453 transparent_ratio=0.5547
public/sprites/buildings-v1.png: size=1120x112 sampled_unique_colors=55 non_white_ratio=0.5588 transparent_ratio=0.4412
```

## Asset License Status

- External visual assets imported: none.
- Stanford Smallville assets copied: none.
- Third-party tilesets/spritesheets copied: none.
- Project-authored generated assets added:
  - `public/maps/town-v1.tiled.json`
  - `public/maps/town-v1-preview.png`
  - `public/tilesets/agent-town-v1.png`
  - `public/sprites/agent-roles-v1.png`
  - `public/sprites/buildings-v1.png`
- Repo-level open-source license: not present.
- Commercial-use / attribution obligations for third-party art: not applicable.

`docs/ASSET_LICENSES.md` records these project-authored assets and the remaining
license boundary.

## AgentEvent Boundary Self-Check

- Agent roles, statuses, event types, selected event, selected agent, and replay
  cursor still come from `AgentEvent -> WorldState`.
- The map object layer supplies projection terrain, route, decor, building
- footprint, location-anchor, and interior-anchor metadata only.
- Tile IDs and sprite frames are presentation metadata only.
- `AgentEvent.metadata.subLocationId` and `metadata.activity` are preserved by
  the reducer and consumed by renderers as projection hints; the renderer still
  falls back to stable `locationHint` routing when they are missing or unknown.
- `src/tests/town-map.test.ts` proves the public map preserves all rendered
  stable location IDs, exposes tile layers/tileset metadata, points to generated
  PNG assets, exposes all 14 interior anchors, and keeps map anchors aligned
  with `src/events/routing.ts`.
- `src/tests/reducer.test.ts` proves sub-location/activity metadata projects
  into `WorldState`, and the Smallville day run is deterministic and
  warning-free.
- No adapter-specific logic was added to `src/game/*`.

## Notion / Linear Sync

Earlier read/write-back from the first object-map pass:

- Notion M5 spec comment created:
  `393acb4b-b6e6-81b0-bfa6-001d71a7ca2a`.
- Linear MDL-129 comment created:
  `191a6b4e-87f4-4c7b-9460-0ba26f1f04d8`.
- Linear MDL-144 comment created:
  `d4f612b7-98c3-4dab-8d92-e00ef8f56580`.

Pixel-asset revision actual write-back after pushing commit
`4206b94 feat: upgrade town projection pixel assets`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-8170-9067-001d08773780`.
- Linear MDL-129 comment created:
  `5448a0f8-f179-45b2-a7bb-6d12b07e5a2a`.
- Linear MDL-144 comment created:
  `7e73ab22-6e81-4bfd-832c-6e88cea5ebed`.

Read-back after write:

- Notion `get_comments` returned comment
  `393acb4b-b6e6-8170-9067-001d08773780` with PR, branch, commit, generated
  asset paths, verification summary, evidence paths, license boundary, and
  remaining limitation.
- Linear `list_comments` for MDL-129 returned comment
  `5448a0f8-f179-45b2-a7bb-6d12b07e5a2a`.
- Linear `list_comments` for MDL-144 returned comment
  `7e73ab22-6e81-4bfd-832c-6e88cea5ebed`.

Scope truth:

- No new Linear issue was created.
- No Linear issue or gate was closed or reopened.
- No Notion page content was replaced; the Notion write was a page-level
  comment.
- No repo-level `LICENSE` file was added.

## Remaining Limitations

- This is now an original pixel asset pipeline with generated room/interior
  anchors and a deterministic day-run fixture, but it is not yet a complete
  Stanford Generative Agents town: there are no autonomous schedules, persistent
  agent memories, many-building interior layouts, animated walking cycles, or
  full-world Tiled editing workflow.
- The map is denser and materially closer to a Smallville-like top-down town,
  but it remains a compact prototype projection for runtime events.
- Browser frame-rate profiling is still future work.
- The repository is public but has no formal open-source `LICENSE` file.

## Next Session Candidate

Deepen the original generator rather than importing unknown art:

- richer terrain tile variation
- more interior rooms and doorway relationships
- animated agent walk/idle frames
- denser props and readable districts
- longer event traces with routine conflicts and memory recall
- optional true Phaser tilemap render path
- same stable object layer IDs
- same explicit license/rights entry before any external asset enters the repo
