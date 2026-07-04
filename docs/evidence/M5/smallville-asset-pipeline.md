# Smallville-Like Asset Pipeline Evidence

Session: post-M5 asset/map follow-up
Date: 2026-07-04
Branch: `codex/smallville-asset-pipeline`

## Scope

Move the town projection from a purely code-native placeholder map toward a
maintainable Smallville-like asset pipeline while preserving the invariant:

```text
External source -> Adapter -> AgentEvent -> WorldState -> Projection views
```

This session introduces a project-authored Tiled-compatible JSON object map. It
does not import third-party pixel art, Stanford Smallville assets, PNG tilesets,
or sprite sheets.

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

Read result:

- S14 / MDL-144: Done; original decision deferred Tiled/external art.
- S15 / MDL-145: Done.
- M5 acceptance gate MDL-129: Done.
- M5 red-check MDL-152: Done.
- Linear search did not find a separate current visual-asset issue.

## Implementation Decision

Adopt a middle path:

- Add `public/maps/town-v1.tiled.json` as an original Tiled-compatible object
  map.
- Parse the map with `src/game/townMap.ts`.
- Render terrain, routes, and decor from parsed map data in
  `src/game/renderTownMap.ts`.
- Render building footprints from the parsed `locations` object layer in
  `src/game/renderLocations.ts`.
- Keep generated fallback map behavior for load or parse failure.
- Keep event routing and stable location IDs in `src/events/routing.ts`.

This gives the repo a real map-data pipeline without introducing license risk
or allowing map objects, Phaser objects, or asset names to own runtime facts.

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

- `public/maps/town-v1.tiled.json`
- `src/game/townMap.ts`
- `src/game/renderTownMap.ts`
- `src/game/AgentTownScene.ts`
- `src/game/renderLocations.ts`
- `src/ui/Timeline.tsx`
- `src/tests/town-map.test.ts`
- `README.md`
- `docs/VISUAL_MAPPING.md`
- `docs/ASSET_LICENSES.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/final-demo-notes.md`
- `docs/evidence/M5/smallville-asset-pipeline.md`
- `docs/evidence/M5/smallville-asset-pipeline-desktop.png`
- `docs/evidence/M5/smallville-asset-pipeline-interaction.png`
- `docs/evidence/M5/smallville-asset-pipeline-mobile.png`
- `docs/evidence/M5/smallville-asset-pipeline-mobile-map.png`

## Verification Commands

```text
git status -sb
git remote -v
git log -1 --oneline --decorate
git fetch origin --prune
git status -sb
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Results:

- Initial and post-fetch git status: `main...origin/main`, clean before work.
- Current branch: `codex/smallville-asset-pipeline`.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 8 files / 34 tests.
- `pnpm build`: passed with existing Phaser chunk-size warning.
- `git diff --check`: passed.

Build warning:

```text
Some chunks are larger than 500 kB after minification.
```

This is the existing Phaser bundle-size warning and is not caused by imported
assets.

## Browser Evidence

Local dev server:

```text
pnpm dev -- --host 127.0.0.1
http://localhost:5173/
```

Browser path:

- Browser plugin was available and used first.
- Browser `domSnapshot()` failed with a plugin-side snapshot error, so QA used
  Browser screenshots, Browser evaluate state reads, and Browser locators.
- No standalone Playwright fallback was needed for interaction checks.

Screenshots:

```text
docs/evidence/M5/smallville-asset-pipeline-desktop.png
docs/evidence/M5/smallville-asset-pipeline-interaction.png
docs/evidence/M5/smallville-asset-pipeline-mobile.png
docs/evidence/M5/smallville-asset-pipeline-mobile-map.png
```

Desktop 1440x960:

- Page title: `Agent Town`.
- Meaningful app text present.
- Framework overlay absent.
- Horizontal overflow: false.
- Canvas count: 1.
- Canvas rect: about 773 x 669.
- Initial town toolbar: `cursor 0`, `visible 30/30`, `balanced`, `100%`.

Interaction checks:

- Zoom in changed toolbar from `100%` to `105%`.
- Bubbles toggle changed `aria-pressed` from `true` to `false`.
- Handoff edges toggle changed `aria-pressed` from `true` to `false`.
- Critical filter changed visible event count from `30/30` to `7/30`.
- Next changed cursor from `0` to `1`.
- Play advanced playback after waiting; toolbar reached later cursor state.
- Pause returned header status to paused.
- Post-fix browser console check after `2026-07-04T17:11:58.280Z` returned no
  warn/error logs.

Mobile 390x844:

- First mobile screenshot verifies the responsive control stack.
- Scrolled mobile map screenshot verifies the town canvas in viewport.
- Horizontal overflow: false.
- Mobile map canvas rect: about 372 x 322.

PNG nonblank sampling:

```text
smallville-asset-pipeline-desktop.png: size=1440x960 non_white_ratio=1.0000 sampled_unique_colors=1130
smallville-asset-pipeline-interaction.png: size=1440x960 non_white_ratio=1.0000 sampled_unique_colors=1086
smallville-asset-pipeline-mobile-map.png: size=390x844 non_white_ratio=1.0000 sampled_unique_colors=923
```

## Asset License Status

- External visual assets imported: none.
- Stanford Smallville assets copied: none.
- Third-party tilesets/spritesheets copied: none.
- Project-authored asset added:
  `public/maps/town-v1.tiled.json`.
- Repo-level open-source license: not present.
- Commercial-use / attribution obligations for third-party art: not applicable.

`docs/ASSET_LICENSES.md` records the project-authored map and the remaining
license boundary.

## AgentEvent Boundary Self-Check

- Agent roles, statuses, event types, selected event, selected agent, and replay
  cursor still come from `AgentEvent -> WorldState`.
- The map object layer supplies projection terrain, route, decor, building
  footprint, and location-anchor metadata only.
- `src/tests/town-map.test.ts` proves the public map preserves all rendered
  stable location IDs and keeps map anchors aligned with
  `src/events/routing.ts`.
- `src/events/reducer.ts` was not changed.
- No adapter-specific logic was added to `src/game/*`.

## Notion / Linear Sync

Status before PR creation:

- Notion read-back: actual read happened through connector fetch/search.
- Linear read-back: actual read happened through connector fetch/search.
- Notion write-back: pending PR URL.
- Linear write-back: pending PR URL.

Planned write-back after PR exists:

- Add a Notion comment to the M5 spec with branch, PR, evidence paths, and
  asset-license status.
- Add a Linear comment to MDL-129 or MDL-144 with branch, PR, evidence paths,
  verification summary, and remaining risks.
- Read both back and record actual write/read-back in the final response.

## Remaining Limitations

- No PNG tileset or agent sprite sheet exists yet.
- The map is Tiled-compatible JSON object data, not a full Tiled tileset render.
- Browser frame-rate profiling is still future work.
- The repository is public but has no formal open-source `LICENSE` file.

## Next Session Candidate

Create a dedicated tileset/sprite session:

- project-authored terrain tileset
- project-authored agent sprite sheet
- optional Phaser tilemap render path
- same stable object layer IDs
- explicit license/rights entry before assets enter the public repo
