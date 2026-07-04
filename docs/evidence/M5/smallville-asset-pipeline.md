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

The Town day continuation added an event-driven slice: generated
interior anchors, a deterministic Smallville-like day fixture, activity labels,
and movement trails. This still does not claim autonomous generative-agent
simulation; the routine is an `AgentEvent` stream projected through `WorldState`.

The latest continuation adds a deterministic "Cognitive" runtime slice:
observation, memory retrieval, reflection, planning, action/conversation, and
closure are represented as canonical `AgentEvent` records with inspectable
metadata. This raises the implementation from town visual projection toward the
Generative Agents architecture shape, but it is still not autonomous LLM-backed
social emergence.

The Social day continuation adds a deterministic 25-agent Valentine
invitation diffusion fixture. It represents intervention, social memory,
retrieval, reflection, planning, invitation messages, and party attendance as
150 canonical `AgentEvent` records. This closes a larger-scale social-spread
slice, but it still does not claim unscripted or LLM-autonomous emergence.

The latest Intervention continuation adds a deterministic natural-language
intervention adapter. It lets an operator prompt become canonical
`AgentEvent` evidence with prior-run context, but it still does not claim
LLM-grade free-form language understanding or persistent cross-session memory.

The latest Memory continuation adds a browser-persisted durable memory stream.
It extracts canonical `memory_read` / `memory_write` events from imported runs,
stores versioned memory records, and recalls them as new canonical
`memory_read` events. This is the first persistent memory slice, not a complete
agent memory database or autonomous long-term world model.

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
- `src/adapters/interventionAdapter.ts`
- `src/adapters/persistentMemoryAdapter.ts`
- `src/events/constants.ts`
- `src/events/persistentMemory.ts`
- `src/events/types.ts`
- `src/events/reducer.ts`
- `src/events/mockSmallvilleDayRun.ts`
- `src/state/persistentMemoryStore.ts`
- `src/ui/App.css`
- `src/ui/App.tsx`
- `src/ui/ImportPanel.tsx`
- `src/tests/reducer.test.ts`
- `src/tests/replay.test.ts`
- `src/tests/town-map.test.ts`
- `src/tests/persistent-memory.test.ts`
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
- `src/events/generativeRuntime.ts`
- `src/tests/generative-runtime.test.ts`
- `src/tests/validators.test.ts`
- `docs/SMALLVILLE_PARITY.md`
- `docs/EVENT_SCHEMA.md`
- `docs/evidence/M5/smallville-cognitive-qa.json`
- `docs/evidence/M5/smallville-cognitive-pixel-check.json`
- `docs/evidence/M5/smallville-cognitive-desktop.png`
- `docs/evidence/M5/smallville-cognitive-interaction.png`
- `docs/evidence/M5/smallville-cognitive-mobile.png`
- `docs/evidence/M5/smallville-cognitive-mobile-map.png`
- `docs/evidence/M5/smallville-social-qa.json`
- `docs/evidence/M5/smallville-social-pixel-check.json`
- `docs/evidence/M5/smallville-social-desktop.png`
- `docs/evidence/M5/smallville-social-interaction.png`
- `docs/evidence/M5/smallville-social-mobile.png`
- `docs/evidence/M5/smallville-social-mobile-map.png`
- `docs/evidence/M5/smallville-intervention-qa.json`
- `docs/evidence/M5/smallville-intervention-pixel-check.json`
- `docs/evidence/M5/smallville-intervention-desktop.png`
- `docs/evidence/M5/smallville-intervention-interaction.png`
- `docs/evidence/M5/smallville-intervention-mobile.png`
- `docs/evidence/M5/smallville-intervention-mobile-map.png`
- `docs/evidence/M5/smallville-memory-qa.json`
- `docs/evidence/M5/smallville-memory-pixel-check.json`
- `docs/evidence/M5/smallville-memory-desktop.png`
- `docs/evidence/M5/smallville-memory-interaction.png`
- `docs/evidence/M5/smallville-memory-mobile.png`
- `docs/evidence/M5/smallville-memory-mobile-map.png`

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

Latest Cognitive continuation checks:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 9 files / 44 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Latest Social day continuation checks:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 9 files / 48 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Latest Intervention continuation targeted checks before final verification:

```text
pnpm typecheck
pnpm test -- src/tests/adapters.test.ts
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test -- src/tests/adapters.test.ts`: passed, 9 files / 50 tests.

Latest Intervention continuation full checks after final docs/evidence edits:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 9 files / 50 tests.
- `pnpm build`: passed.
- `git diff --check`: passed.

Latest Memory continuation targeted checks before final verification:

```text
pnpm typecheck
pnpm test -- src/tests/persistent-memory.test.ts
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test -- src/tests/persistent-memory.test.ts`: passed, 10 files / 55
  tests.

Latest Memory continuation full checks after final docs/evidence edits:

```text
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 10 files / 55 tests.
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

## Cognitive Runtime Browser Evidence

The latest QA targeted the deterministic Cognitive run and the
Smallville-oriented memory/retrieval/reflection/planning loop.

Browser path:

- Browser plugin was attempted first.
- Browser connected to `http://127.0.0.1:5173/`, returned page title
  `Agent Town`, and exposed console logs.
- Browser required DOM snapshot failed with plugin-side error:
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- The same Browser pass revealed a real Phaser lifecycle error from a stale
  async map load; this continuation fixed it in `AgentTownScene`.
- Regular Playwright fallback used bundled Codex runtime Playwright for clean
  screenshot, console, asset, and interaction proof.
- QA result JSON:
  `docs/evidence/M5/smallville-cognitive-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-cognitive-pixel-check.json`.

Screenshots:

```text
docs/evidence/M5/smallville-cognitive-desktop.png
docs/evidence/M5/smallville-cognitive-interaction.png
docs/evidence/M5/smallville-cognitive-mobile.png
docs/evidence/M5/smallville-cognitive-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Active source: `cognitive · 30 events`.
- Status copy: `Cognitive loop run loaded.`
- Town toolbar: `cursor 0`, `visible 30/30`, `balanced`, `100%`.
- Run summary: 30 events, 5 agents, 1 handoff, 3 tool calls, 10 memory
  actions, 0 blocked, 0 errors.
- Detail panel exposes cognition metadata including `cognitiveStage`,
  `subLocationId`, `activity`, `memoryKind`, `memoryId`, and retrieval records.
- Canvas count: `1`.
- Canvas rect after interaction: about `773 x 669`.
- Horizontal overflow: `0`.
- Framework overlay: absent.
- Asset HTTP responses all returned `200`:
  - `/maps/town-v1.tiled.json`
  - `/maps/town-v1-preview.png`
  - `/tilesets/agent-town-v1.png`
  - `/sprites/agent-roles-v1.png`
  - `/sprites/buildings-v1.png`

Interaction checks:

- Cognitive source loaded: `true`.
- Expanded density applied: `aria-pressed=true`.
- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count to `6/30`.
- Next changed header cursor to `2 / 30`.
- Play changed the timeline control state to `Pause` and header status to
  `running`.

Console health:

- Page errors: none.
- Relevant app console errors/warnings: none after the lifecycle fix.
- Chromium emitted WebGL `ReadPixels` performance warnings during screenshot
  capture; these are recorded in the QA JSON and classified as screenshot GPU
  warnings, not application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack with Cognitive
  loaded.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect after scrolling: about `372 x 322`.

Cognitive PNG nonblank sampling:

```text
docs/evidence/M5/smallville-cognitive-desktop.png: size=1440x960 unique_colors_64x64=1710 nonblank=true
docs/evidence/M5/smallville-cognitive-interaction.png: size=1440x960 unique_colors_64x64=1663 nonblank=true
docs/evidence/M5/smallville-cognitive-mobile.png: size=780x1688 unique_colors_64x64=759 nonblank=true
docs/evidence/M5/smallville-cognitive-mobile-map.png: size=780x1688 unique_colors_64x64=1399 nonblank=true
```

## Social Day Browser Evidence

The latest QA targeted the deterministic 25-agent Social day run and the
Smallville-style invitation diffusion loop.

Browser path:

- Browser plugin connected to `http://127.0.0.1:5173/`, returned page title
  `Agent Town`, clicked `Social day`, and read `run-smallville-social-001`, 150
  events, 25 agents, 50 memory actions, 0 warnings, and 0 quarantined events
  from the page text.
- Browser `domSnapshot()` still failed with plugin-side error:
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- Regular Playwright fallback used bundled Codex runtime Playwright for clean
  screenshot, console, asset, interaction, mobile, and pixel proof.
- QA result JSON:
  `docs/evidence/M5/smallville-social-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-social-pixel-check.json`.

Screenshots:

```text
docs/evidence/M5/smallville-social-desktop.png
docs/evidence/M5/smallville-social-interaction.png
docs/evidence/M5/smallville-social-mobile.png
docs/evidence/M5/smallville-social-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Active source: `social · 150 events`.
- Status copy: `Social diffusion run loaded.`
- Run ID: `run-smallville-social-001`.
- Town toolbar: `cursor 0`, `visible 150/150`, `balanced`, `100%`.
- Run summary: 150 events, 25 agents, 0 handoffs, 0 tool calls, 50 memory
  actions, 0 blocked, 0 errors.
- Detail panel exposes Social day metadata including `intervention` and
  `socialDiffusion`.
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

- Social day source loaded: `true`.
- Expanded density applied: `aria-pressed=true`.
- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count to `25/150`.
- Next changed header cursor to `2 / 150`.
- Play changed the timeline control state to `Pause` and header status to
  `running`.

Console health:

- Page errors: none.
- Relevant app console errors/warnings: none.
- Chromium emitted four WebGL `ReadPixels` performance warnings during
  screenshot capture; these are recorded in the QA JSON and classified as
  screenshot GPU warnings, not application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack with Social day
  loaded.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect after scrolling: about `372 x 322`.

Social day PNG nonblank sampling:

```text
docs/evidence/M5/smallville-social-desktop.png: size=1440x960 unique_colors_64x64=265 nonblank=true
docs/evidence/M5/smallville-social-interaction.png: size=1440x960 unique_colors_64x64=261 nonblank=true
docs/evidence/M5/smallville-social-mobile.png: size=780x1688 unique_colors_64x64=147 nonblank=true
docs/evidence/M5/smallville-social-mobile-map.png: size=780x1688 unique_colors_64x64=151 nonblank=true
```

## Intervention Browser Evidence

The latest QA targeted the deterministic natural-language Intervention source.
The flow under test was:

```text
app -> Social day prior run -> fill natural-language intervention -> Intervention source -> 8-event canonical run
```

Prompt:

```text
Move the Valentine's gathering to the library reading nook and ask Mei to preserve the memory.
```

Browser path:

- Browser plugin connected to `http://127.0.0.1:5173/`, returned page title
  `Agent Town`, loaded `Social day`, filled the natural-language intervention
  input, clicked the scoped `Intervention` source button, and read
  `intervention · 8 events` from the page.
- Browser `domSnapshot()` still failed with plugin-side error:
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- Browser dev logs for the long-lived tab contained stale pre-existing errors
  from earlier tab lifetime, so a fresh Playwright context was used as the
  authoritative console-health check.
- Regular Playwright fallback used bundled Codex runtime Playwright for clean
  screenshot, console, asset, interaction, mobile, and pixel proof.
- QA result JSON:
  `docs/evidence/M5/smallville-intervention-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-intervention-pixel-check.json`.

Screenshots:

```text
docs/evidence/M5/smallville-intervention-desktop.png
docs/evidence/M5/smallville-intervention-interaction.png
docs/evidence/M5/smallville-intervention-mobile.png
docs/evidence/M5/smallville-intervention-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Active source: `intervention · 8 events`.
- Status copy: `Intervention import: 8 events accepted.`
- Run ID starts with `run-intervention-`.
- Town toolbar: `cursor 0`, `visible 8/8`, `balanced`, `100%`.
- Run summary: 8 events, 2 agents, 0 handoffs, 1 tool call, 2 memory actions,
  0 blocked, 0 errors.
- Detail panel exposes the raw prompt, previous run id
  `run-smallville-social-001`, prior event/memory counts, target location
  `library_reading_nook`, and generator
  `deterministic-intervention-adapter`.
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

- Intervention source loaded: `true`.
- Expanded density applied: `aria-pressed=true`.
- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count to `2/8`.
- Next changed header cursor to `2 / 8`.
- Play changed the timeline control state to `Pause` and header status to
  `running`.

Console health:

- Page errors: none in the fresh Playwright context.
- Relevant app console errors/warnings: none in the fresh Playwright context.
- Chromium emitted four WebGL `ReadPixels` performance warnings during
  screenshot capture; these are recorded in the QA JSON and classified as
  screenshot GPU warnings, not application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack with
  Intervention loaded.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect after scrolling: about `372 x 322`.

Intervention PNG nonblank sampling:

```text
docs/evidence/M5/smallville-intervention-desktop.png: size=1440x960 unique_colors_64x64=281 nonblank=true
docs/evidence/M5/smallville-intervention-interaction.png: size=1440x960 unique_colors_64x64=269 nonblank=true
docs/evidence/M5/smallville-intervention-mobile.png: size=780x1688 unique_colors_64x64=128 nonblank=true
docs/evidence/M5/smallville-intervention-mobile-map.png: size=780x1688 unique_colors_64x64=147 nonblank=true
```

## Memory Browser Evidence

The latest QA targeted the deterministic persistent Memory source. The flow
under test was:

```text
app -> clear local memory -> Social day persists 50 memory records -> reload keeps 50 records -> Memory source recalls 50 canonical memory events
```

Browser path:

- Browser plugin connected to `http://127.0.0.1:5173/`, returned page title
  `Agent Town`, loaded `Social day`, observed `Memory bank · 50 records`,
  reloaded the tab, observed `Memory bank · 50 records` again, clicked the
  scoped `Memory` source button, and read `memory · 50 events` from the page.
- Browser `domSnapshot()` still failed with plugin-side error:
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- Browser dev logs for the long-lived tab contained stale pre-existing errors
  from earlier tab lifetime, so a fresh Playwright context was used as the
  authoritative console-health check.
- Regular Playwright fallback used bundled Codex runtime Playwright for clean
  screenshot, console, asset, interaction, mobile, and pixel proof.
- QA result JSON:
  `docs/evidence/M5/smallville-memory-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-memory-pixel-check.json`.

Screenshots:

```text
docs/evidence/M5/smallville-memory-desktop.png
docs/evidence/M5/smallville-memory-interaction.png
docs/evidence/M5/smallville-memory-mobile.png
docs/evidence/M5/smallville-memory-mobile-map.png
```

Desktop 1440x960:

- Initial clean memory state: `Memory bank · 0 records`.
- After `Social day`: `Memory bank · 50 records`.
- After reload in the same browser context: `Memory bank · 50 records`.
- Active source after recall: `memory · 50 events`.
- Status copy: `Persistent memory recall: 50 events accepted.`
- Local storage snapshot schema version: `1`.
- Local storage memory record count: `50`.
- Run ID starts with `run-persistent-memory-`.
- Town toolbar: `cursor 0`, `visible 50/50`, `balanced`, `100%`.
- Run summary: 50 events, 25 agents, 0 handoffs, 0 tool calls, 50 memory
  actions, 0 blocked, 0 errors.
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

- Memory source loaded: `true`.
- Expanded density applied.
- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count to `0/50`; this is expected
  because the recall run contains only `memory_read` events and Critical
  includes blocked, error, done, and handoff.
- Next changed toolbar cursor from `0` to `1`.
- Play changed the header status to `running`.

Console health:

- Page errors: none in the fresh Playwright context.
- Relevant app console errors/warnings: none in the fresh Playwright context.
- Chromium emitted WebGL `ReadPixels` / GPU-stall performance warnings during
  screenshot capture; these are recorded in the QA JSON and classified as
  screenshot GPU warnings, not application errors.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack with Memory
  loaded from persisted records.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: `0`.
- Mobile map canvas rect after scrolling: about `372 x 322`.

Memory PNG nonblank sampling:

```text
docs/evidence/M5/smallville-memory-desktop.png: size=1440x960 unique_colors_64x64=318 nonblank=true
docs/evidence/M5/smallville-memory-interaction.png: size=1440x960 unique_colors_64x64=252 nonblank=true
docs/evidence/M5/smallville-memory-mobile.png: size=780x1688 unique_colors_64x64=168 nonblank=true
docs/evidence/M5/smallville-memory-mobile-map.png: size=780x1688 unique_colors_64x64=172 nonblank=true
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
  footprint, location-anchor, and interior-anchor metadata only.
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
- `src/events/generativeRuntime.ts` emits observation, retrieval, reflection,
  planning, action/conversation, and closure as canonical `AgentEvent` records.
- `src/tests/generative-runtime.test.ts` proves deterministic retrieval scoring,
  replay compatibility, cognitive-stage coverage, inspectable retrieval
  evidence, 25-agent social diffusion coverage, and warning-free `WorldState`
  reconstruction for the Cognitive and Social day runs.
- `summarizeSocialDiffusion` proves the Social day fixture reaches all 25
  agents, emits 25 invitation messages, and reaches wave 4 without renderer
  state becoming a runtime fact.
- Social day tests also prove every invitation message target is present in the
  sender's `relationships` metadata, so the deterministic diffusion path is
  inspectable as relationship evidence.
- `src/adapters/interventionAdapter.ts` turns a natural-language prompt plus
  prior run context into validated canonical `AgentEvent[]`; the UI text area
  never becomes runtime state.
- `src/tests/adapters.test.ts` proves empty intervention prompts quarantine,
  accepted prompts generate 8 canonical events, prior Social day context is
  recorded in `metadata.intervention`, and replay stays warning-free.
- `src/events/persistentMemory.ts` extracts durable records only from canonical
  `memory_read` / `memory_write` events; it does not read browser storage or
  generate adapter results.
- `src/state/persistentMemoryStore.ts` owns versioned browser storage and
  stores extracted memory evidence, not renderer state.
- `src/adapters/persistentMemoryAdapter.ts` recalls stored records as validated
  canonical `memory_read` events with `metadata.durableMemory`.
- `src/tests/persistent-memory.test.ts` proves extraction, stable de-duplication,
  versioned storage round-trip, warning-free replay, and empty-bank handling
  without fabricating events.
- No adapter-specific logic was added to `src/game/*`.

## Agent-addressable Memory Plan Continuation

Scope:

- Added a deterministic `Memory plan` source that uses the browser-local
  durable memory bank as an adapter boundary, not as renderer state.
- Each durable-memory agent gets a query built from stored memory evidence,
  enriched by current-run context when the same agent is present.
- Durable memory records are scored by query relevance, importance, recency,
  and agent affinity.
- The adapter emits canonical `memory_read`, `thinking`, and `decision` events
  with `metadata.agentAddressableMemory`; the town canvas still only receives
  replayed `WorldState`.
- This moves persistent memory from whole-bank recall toward agent-addressable
  planning evidence. It is still not an LLM-backed autonomous memory engine or
  a server-backed world database.

Files changed:

- `src/events/persistentMemory.ts`
  - `PersistentMemoryRetrievalQuery`
  - `RetrievedPersistentMemoryRecord`
  - `scorePersistentMemoryRecord`
  - `retrievePersistentMemoryRecords`
- `src/adapters/persistentMemoryAdapter.ts`
  - `AgentAddressableMemoryPlanInput`
  - `buildAgentAddressableMemoryPlanResult`
- `src/ui/App.tsx`
  - wires `Memory plan` to current run context plus durable memory records
  - skips re-persisting `memory` and `memory-plan` source output to prevent
    self-referential memory-bank pollution
- `src/ui/ImportPanel.tsx`
  - adds the `Memory plan` import source button
- `src/tests/persistent-memory.test.ts`
  - proves agent/query/importance/recency retrieval
  - proves 25-agent Memory plan emits 75 replayable events
- `README.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/VISUAL_MAPPING.md`

Verification:

- `pnpm typecheck`: passed.
- `pnpm test -- src/tests/persistent-memory.test.ts`: passed; the repo script
  ran all 10 files / 58 tests.
- `pnpm test`: passed, 10 files / 58 tests.
- `pnpm build`: passed with the existing Phaser/Vite large chunk warning.

Browser / Playwright evidence:

- Browser plugin was attempted first.
- Browser loaded `http://127.0.0.1:5173/`, clicked `Social day`, observed
  `Memory bank · 50 records`, clicked `Memory plan`, and observed
  `memory-plan · 75 events`.
- Browser `domSnapshot()` failed with plugin-side
  `TypeError: o.incrementalAriaSnapshot is not a function`.
- Browser dev logs for the long-lived tab still contained stale prior-session
  errors, so a fresh Playwright context was used as authoritative evidence.
- Fresh Playwright flow:
  `app -> clear local memory once -> Social day persists 50 memory records ->
  reload keeps 50 records -> Memory plan emits 75 agent-addressable
  retrieval/reflection/planning events for durable-memory agents`.
- Desktop 1440x960 screenshot:
  `docs/evidence/M5/smallville-memory-plan-desktop.png`.
- Desktop interaction screenshot:
  `docs/evidence/M5/smallville-memory-plan-interaction.png`.
- Mobile 390x844 screenshot:
  `docs/evidence/M5/smallville-memory-plan-mobile.png`.
- Mobile map screenshot:
  `docs/evidence/M5/smallville-memory-plan-mobile-map.png`.
- QA JSON:
  `docs/evidence/M5/smallville-memory-plan-qa.json`.
- Pixel check JSON:
  `docs/evidence/M5/smallville-memory-plan-pixel-check.json`.

Playwright assertions:

- Initial memory bank was 0 after explicit test-context cleanup.
- Social day persisted 50 memory records.
- Reload kept 50 memory records.
- Memory plan loaded 75 events.
- Memory plan used durable-memory agents from the persisted Social day memory
  bank, including Isabella, rather than introducing renderer-owned facts.
- Warnings stayed 0.
- Quarantine stayed 0.
- Critical filter changed the Timeline to the expected empty set because Memory
  plan has no blocked/error/done/handoff events.
- Next changed cursor from 1/75 to 2/75.
- Play changed status to running.
- Desktop and mobile page errors: none.
- Relevant desktop and mobile console issues: none; Chromium WebGL `ReadPixels`
  warnings are recorded as screenshot-capture GPU warnings.
- Desktop and mobile horizontal overflow: 0.
- Desktop, interaction, mobile, and mobile-map screenshots are nonblank.

AgentEvent boundary self-check:

- `src/events/persistentMemory.ts` remains pure event-layer extraction, scoring,
  and retrieval logic. It does not import React, DOM, Storage, Phaser, canvas,
  Zustand, or adapters.
- `src/adapters/persistentMemoryAdapter.ts` converts retrieval results into
  validated canonical `AgentEvent[]`.
- Browser storage remains in `src/state/persistentMemoryStore.ts`.
- `metadata.agentAddressableMemory` is inspection evidence carried by the
  event stream; Phaser never creates query, score, selected-record, or planning
  facts.
- The renderer receives the same `WorldState` shape as every other source.
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

Town day / interior-anchor continuation actual write-back after pushing commit
`b54134f feat: add event-driven town day projection`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-817b-80ce-001d605e39f8`.
- Linear MDL-129 comment created:
  `11dfe30c-76ea-44da-b93f-6d07e2dcd18e`.
- Linear MDL-144 comment created:
  `3e976fa0-88a8-41bd-b5d8-442e52a0078e`.

Cognitive runtime continuation actual write-back after pushing commit
`3c8024b feat: add deterministic cognitive town runtime`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-819d-8890-001dd894dcfe`.
- Linear MDL-129 comment created:
  `0041694f-c4af-4c4e-a70b-4173e20708d7`.
- Linear MDL-144 comment created:
  `54b8cffe-8601-4bab-8200-186da4fc07cb`.

Social day continuation actual write-back after pushing commit
`0c3a0da feat: add 25-agent social diffusion run`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-81d0-80f6-001dce3d850d`.
- Linear MDL-129 comment created:
  `bfa6645f-ad68-4f48-ac80-fee4a76b6f4e`.
- Linear MDL-144 comment created:
  `3d96e4da-0dcf-44e9-9ede-4b0b6b10610c`.

Intervention continuation actual write-back after pushing commit
`08290f5 feat: add natural-language intervention adapter`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-8163-aa64-001db626633a`.
- Linear MDL-129 comment created:
  `9a1ff14c-17b4-4691-8770-873d14109f36`.
- Linear MDL-144 comment created:
  `225abfeb-df5b-4ce0-89e3-90cae1f04cbc`.

Memory continuation actual write-back after pushing commit
`16e816c feat: add persistent memory recall source`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-819e-8668-001d2510ee7e`.
- Linear MDL-129 comment created:
  `ad883943-5095-4fb1-b8ec-743a08c447f4`.
- Linear MDL-144 comment created:
  `b79369f9-4e5a-44a5-87a9-19a568327fc4`.

Agent-addressable Memory plan continuation actual write-back after pushing
commit `07758c8 feat: add agent-addressable memory planning`:

- Notion M5 spec comment created:
  `393acb4b-b6e6-812a-a2b7-001d78d133f6`.
- Linear MDL-129 comment created:
  `c83cb052-cbd2-4b26-8992-86504cb7f756`.
- Linear MDL-144 comment created:
  `bedeed56-bc65-4515-8499-008dc13b2d51`.

Read-back after write:

- Notion `get_comments` returned comment
  `393acb4b-b6e6-8170-9067-001d08773780` with PR, branch, commit, generated
  asset paths, verification summary, evidence paths, license boundary, and
  remaining limitation.
- Linear `list_comments` for MDL-129 returned comment
  `5448a0f8-f179-45b2-a7bb-6d12b07e5a2a`.
- Linear `list_comments` for MDL-144 returned comment
  `7e73ab22-6e81-4bfd-832c-6e88cea5ebed`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-817b-80ce-001d605e39f8` with PR, branch, commit, Town day
  implementation, verification summary, evidence paths, license boundary, and
  remaining limitation.
- Linear `list_comments` for MDL-129 returned comment
  `11dfe30c-76ea-44da-b93f-6d07e2dcd18e`.
- Linear `list_comments` for MDL-144 returned comment
  `3e976fa0-88a8-41bd-b5d8-442e52a0078e`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-819d-8890-001dd894dcfe` with PR, branch, commit,
  Cognitive implementation, verification summary, evidence paths, scope truth,
  asset/license boundary, and remaining limitations.
- Linear `list_comments` for MDL-129 returned comment
  `0041694f-c4af-4c4e-a70b-4173e20708d7`.
- Linear `list_comments` for MDL-144 returned comment
  `54b8cffe-8601-4bab-8200-186da4fc07cb`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-81d0-80f6-001dce3d850d` with PR, branch, commit, Social day
  implementation, verification summary, evidence paths, scope truth, and
  asset/license boundary.
- Linear `list_comments` for MDL-129 returned comment
  `bfa6645f-ad68-4f48-ac80-fee4a76b6f4e`.
- Linear `list_comments` for MDL-144 returned comment
  `3d96e4da-0dcf-44e9-9ede-4b0b6b10610c`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-8163-aa64-001db626633a` with PR, branch, commit,
  Intervention implementation, verification summary, evidence paths, scope
  truth, and asset/license boundary.
- Linear `list_comments` for MDL-129 returned comment
  `9a1ff14c-17b4-4691-8770-873d14109f36`.
- Linear `list_comments` for MDL-144 returned comment
  `225abfeb-df5b-4ce0-89e3-90cae1f04cbc`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-819e-8668-001d2510ee7e` with PR, branch, commit, Memory
  implementation, verification summary, evidence paths, scope truth, and
  asset/license boundary.
- Linear `list_comments` for MDL-129 returned comment
  `ad883943-5095-4fb1-b8ec-743a08c447f4`.
- Linear `list_comments` for MDL-144 returned comment
  `b79369f9-4e5a-44a5-87a9-19a568327fc4`.
- Notion `get_comments` returned comment
  `393acb4b-b6e6-812a-a2b7-001d78d133f6` with PR, branch, commit, Memory
  plan implementation, verification summary, evidence paths, scope truth, and
  asset/license boundary.
- Linear `list_comments` for MDL-129 returned comment
  `c83cb052-cbd2-4b26-8992-86504cb7f756`.
- Linear `list_comments` for MDL-144 returned comment
  `bedeed56-bc65-4515-8499-008dc13b2d51`.

Scope truth:

- No new Linear issue was created.
- No Linear issue or gate was closed or reopened.
- No Notion page content was replaced; the Notion write was a page-level
  comment.
- No repo-level `LICENSE` file was added.

## Remaining Limitations

- This is now an original pixel asset pipeline with generated room/interior
  anchors, a deterministic day-run fixture, a deterministic cognitive-loop
  fixture, a deterministic 25-agent social-diffusion fixture, and a
  deterministic natural-language intervention adapter plus browser-local
  durable memory recall and agent-addressable memory planning, but it is not
  yet a complete Stanford Generative Agents town: there are no autonomous
  schedules, server-backed world memory, LLM-backed reflection/planning calls,
  many-building interior layouts, animated walking cycles, LLM-grade
  intervention understanding, rigorous social diffusion evaluation, or
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
- LLM-backed reflection/planning adapter behind the same `AgentEvent` contract
- use agent-addressable persistent memory retrieval inside an LLM-backed planner
  or a server-backed world-memory store
- durable intervention memory beyond browser-local storage
- 25-agent cognitive fixture with routine conflicts, persistent memories, and
  evaluated social diffusion
- optional true Phaser tilemap render path
- same stable object layer IDs
- same explicit license/rights entry before any external asset enters the repo
