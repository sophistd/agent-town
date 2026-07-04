# S14 Visual Layout Evidence

Session: S14 - Tiled map or visual asset defer decision
Date: 2026-07-04
Reviewer: Codex

## Sources Checked

- Notion S14 session runbook: Tiled map or visual asset defer decision
- Notion M5 spec: productization, polish, and demo evidence
- Notion materials manifest: visual materials and license rule
- Notion metrics: M5 metrics and evidence standards
- Linear MDL-144: implementation issue
- Linear MDL-129: M5 acceptance gate
- Linear MDL-152: M5 red-check context

## Decision

Path B - defer Tiled.

Tiled and external pixel-art assets are deferred for S14. The current generated
layout is sufficient for the M5 demo because it already proves the product
claim that Agent Town is a runtime-event projection, not a visual toy:

- zones are stable and named
- routing is event-driven
- agent identity and status are visible
- bubbles, handoff edges, timeline, summary, and detail remain inspectable
- no external asset can introduce licensing uncertainty
- placeholder fallback is the current rendering path, not an untested backup

## Why Not Tiled In S14

Introducing Tiled now would add two risks without reducing the main M5
uncertainty:

- License risk: any imported tileset or pixel-art source must be audited before
  it can enter the repo.
- Regression risk: map loading/object-layer parsing would add a new renderer
  dependency after the event/replay/adapter chain is already working.

The better M5 sequence is to finish demo docs, onboarding copy, performance
evidence, and final packaging first. A later visual-polish session can replace
the generated layout with a Tiled object layer if it preserves the same stable
location IDs.

## Stable Zones

| Stable zone | Location ID | Current label | Source |
| --- | --- | --- | --- |
| planning | `town_hall` | Town Hall | `src/events/routing.ts` |
| research | `library` | Library | `src/events/routing.ts` |
| production | `workshop` | Workshop | `src/events/routing.ts` |
| memory | `archive` | Archive | `src/events/routing.ts` |
| review | `review_room` | Review Room | `src/events/routing.ts` |
| queue | `dispatch_board` | Dispatch Board | `src/events/routing.ts` |
| final square | `square` | Square | `src/events/routing.ts` |

Every rendered location is drawn by `src/game/renderLocations.ts` from the
stable `AgentLocation` IDs and `LOCATION_COORDINATES`. Renderer labels and
colors live in `src/game/visualMapping.ts`; routing stays in `src/events`.

## Placeholder Fallback

Placeholder fallback remains available because it is the current rendering
path:

- `AgentTownScene` draws the generated background and calls render helpers.
- `renderLocations` draws generated building shapes and labels.
- `renderAgents` draws generated agent marks, role color, labels, and status
  badges.
- `renderBubbles` draws generated bubble rectangles with truncated text.
- `renderEdges` draws generated handoff/message lines.

No asset-loading branch was added in S14, so there is no new load-failure path
that could break the demo.

## Asset License State

`docs/ASSET_LICENSES.md` now records the S14 defer decision.

Current state:

- no external visual assets imported
- no tilesets imported
- no third-party spritesheets imported
- no commercial-use or attribution obligations
- generated placeholders remain the fallback

## Visual System Coverage

Current generated visuals cover:

- agent identity: role color and name label
- active state: thinking, walking, talking, and working status families
- waiting state: waiting marker
- blocked state: blocked marker and persistent review routing
- error state: error marker and persistent review routing
- done state: done marker and square routing
- tool action: tool bubble and workshop/default routing
- memory action: memory bubble and archive routing
- handoff: dispatch-board routing plus edge label

## Evidence

Screenshot:

```plain text
docs/evidence/M5/visual-layout.png
```

The screenshot shows the generated placeholder town layout with the seven
stable zones, agent identity, status markers, run summary, Import Source panel,
and Timeline. This is the M5 visual baseline while Tiled remains deferred.

## Commands

```plain text
pnpm typecheck
```

Result:

```plain text
passed
```

```plain text
pnpm test
```

Result:

```plain text
Test Files  6 passed (6)
Tests       29 passed (29)
```

```plain text
pnpm build
```

Result:

```plain text
passed
```

Known warning:

```plain text
Some chunks are larger than 500 kB after minification.
```

The warning is the existing Phaser bundle-size warning and is not a visual
layout regression.

## Acceptance Self-Check

- [x] Tiled defer reason is documented.
- [x] Stable zones exist: planning, research, production, memory, review,
  queue, final square.
- [x] Every map location has a stable location ID.
- [x] External asset license state is documented.
- [x] No ambiguous-license asset was imported.
- [x] Placeholder fallback remains.
- [x] Event-to-location routing still works.
- [x] AgentEvent schema was unchanged.

## Next Visual Step

When visual polish becomes the highest-risk work, introduce a Tiled map only if
the object layer contains the exact stable location IDs listed above. Until
then, demo polish should focus on first-run copy, README/demo script, screenshot
set, and 200-event performance evidence.
