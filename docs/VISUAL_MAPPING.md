# Visual Mapping

Agent Town renders `WorldState`; it does not create business facts inside the renderer.

## Location Mapping

Stable location IDs and routing coordinates are canonical in
`src/events/routing.ts`. The renderer loads `public/maps/town-v1.tiled.json` as
a Tiled-compatible projection asset and verifies that its location object layer
preserves the same stable IDs and anchors. If the map cannot load or parse, the
renderer falls back to the generated in-code map with the same IDs.

| Stable zone | Location ID | Label | Projection role |
| --- | --- | --- | --- |
| planning | `town_hall` | Town Hall | Planning and decisions |
| research | `library` | Library | Research, search, and reading |
| production | `workshop` | Workshop | Editing, building, tests, and tool work |
| memory | `archive` | Archive | Memory reads and writes |
| review | `review_room` | Review Room | Review, blocked, and error inspection |
| queue | `dispatch_board` | Dispatch Board | Handoffs and queued work |
| final square | `square` | Square | Current shared surface and done state |

The current asset session introduces a project-authored Tiled-compatible map, a
generated terrain tileset, generated agent/building sprite sheets, and a baked
pixel-town background. These assets are projection metadata and presentation
surfaces only: they may define tile layers, building footprints, visual anchors,
and sprite frames, but they do not create runtime facts. Agent role, status,
event type, selected event, selected agent, and cursor state still come from
`AgentEvent -> WorldState`.

The object layer must preserve these `locationId` values:

- `town_hall`
- `library`
- `workshop`
- `archive`
- `review_room`
- `dispatch_board`
- `square`
- `unknown` remains a routing fallback and is not rendered as a normal town
  building.

## Interior Anchor Mapping

The current map also contains an `interiors` object layer. Interior objects are
projection targets inside stable zones; they do not introduce new runtime
locations and they do not change the canonical `AgentLocation` vocabulary.

`AgentEvent.metadata.subLocationId` may point to one of these generated
interior anchors. The reducer preserves that value as `AgentState.subLocationId`
and the renderer resolves it against `town-v1.tiled.json` when drawing agents,
bubbles, edges, and movement trails. If an event omits `subLocationId` or points
to an unknown anchor, the renderer falls back to the stable zone anchor from
`src/events/routing.ts`.

| Stable zone | Interior IDs |
| --- | --- |
| `dispatch_board` | `dispatch_queue`, `dispatch_notice_wall` |
| `town_hall` | `town_hall_table`, `town_hall_office` |
| `library` | `library_stacks`, `library_reading_nook` |
| `archive` | `archive_shelves`, `archive_writing_desk` |
| `square` | `square_cafe`, `square_fountain_edge` |
| `workshop` | `workshop_bench`, `workshop_debug_desk` |
| `review_room` | `review_table`, `review_evidence_wall` |

`AgentEvent.metadata.activity` may be displayed as an activity label in expanded
density. It is descriptive event metadata, not a renderer-inferred business
fact.

## Agent Mapping

Agent identity comes from `WorldState.agents`.

`public/sprites/agent-roles-v1.png` provides the current project-authored agent
sprite sheet. Sprite columns follow the role order below. Sprite rows represent
visual status families: idle/waiting, active, blocked/error, and done. The
renderer chooses a frame from `AgentState.role` and `AgentState.status`; it does
not infer those values from the sprite.

`src/events/mockSmallvilleDayRun.ts` provides a deterministic "Town day" run
that exercises the interior anchors with five named agents and day-phase event
metadata. It is still a canonical `AgentEvent` fixture; selecting it in the UI
does not activate a separate simulation engine.

| Role | Default visible identity |
| --- | --- |
| `planner` | Planner |
| `researcher` | Researcher |
| `coder` | Coder |
| `reviewer` | Reviewer |
| `memory` | Memory |
| `critic` | Critic |
| `orchestrator` | Orchestrator |
| `custom` | Custom |

S08 screenshot evidence requires the five default agents from the mock run: Planner, Researcher, Coder, Reviewer, Memory.

## Status Mapping

Status colors and marker labels live in `src/game/visualMapping.ts`.

| AgentState status | Visual family | Meaning |
| --- | --- | --- |
| `idle` | idle | agent exists but is not active |
| `thinking` | active | planning or deciding |
| `walking` | active | moving through a handoff |
| `talking` | active | message or handoff communication |
| `working` | active | tool work or memory work |
| `waiting` | waiting | pending another input |
| `blocked` | blocked | blocked state requiring resolution |
| `error` | error | failed or error state |
| `done` | done | completed task/run state |

S08 includes a status legend for idle, thinking, waiting, blocked, error, and done so the visual distinction is visible before S09 adds bubbles and handoff edges.

## Event To Visual Mapping

| Event type | Reducer behavior | S08 visual state |
| --- | --- | --- |
| `thinking` | status `thinking`, route to Town Hall by default | active status marker, Town Hall position |
| `message` | status `talking`, optional edge in later session | active status marker, routed location |
| `tool_call` | status `working`, route by `locationHint` / Workshop default | active status marker, tool-work position |
| `handoff` | status `walking`, Dispatch Board default | active movement marker, Dispatch Board position |
| `memory_read` | status `working`, Archive route | active marker, Archive position |
| `memory_write` | status `working`, Archive route | active marker, Archive position |
| `decision` | status `thinking`, Town Hall route | active status marker, Town Hall position |
| `blocked` | status `blocked`, Review Room route | blocked marker |
| `error` | status `error`, Review Room route | error marker |
| `done` | status `done`, Square route | done marker, Square position |

## Boundary Notes

- `public/maps/town-v1.tiled.json` is the current project-authored map asset.
- `public/maps/town-v1-preview.png` is the baked pixel-town background used when
  the asset map loads.
- `public/tilesets/agent-town-v1.png` is the project-authored terrain tileset
  referenced by the Tiled JSON.
- `public/sprites/buildings-v1.png` and `public/sprites/agent-roles-v1.png` are
  generated sprite sheets used by the projection renderer.
- `src/game/townMap.ts` parses map properties, tilesets, tile layers, object
  layers, and provides the generated fallback.
- `src/game/renderTownMap.ts` renders the baked background first, then falls
  back to tile layers or generated Phaser graphics if assets are unavailable.
- `src/game/renderLocations.ts` renders projection labels/anchors over the
  baked map, or building sprites / generated footprints in fallback paths,
  while tests keep map anchors aligned with `LOCATION_COORDINATES`.
- `src/game/renderAgents.ts` renders agent sprites, status marker, selected
  state, activity label, movement trail, and label from `WorldState`.
- `src/events/reducer.ts` preserves `subLocationId`, `activity`, and previous
  route coordinates from event metadata so the renderer can project interior
  activity without inventing runtime facts.
- `src/game/visualMapping.ts` contains visual labels/colors only. It does not route events.
- `src/events/routing.ts` remains the source of event-to-location routing.
- Generated rendering remains the fallback. It uses local Phaser shapes, labels,
  status markers, bubbles, and edges; no visual asset owns runtime facts.

## Visual Density Rules

M5 keeps density rules explicit so a busy run remains inspectable:

- Bubble truncation: canvas bubbles show compact event text and must not cover
  the town. Long content belongs in the selected-event detail view.
- Detail expansion: `DetailPanel` is the expansion surface for full content,
  tool input, output summary, metadata, and selected-event context.
- Event filtering: Timeline and run summary are the current filtering surfaces
  for blocked, error, tool, memory, handoff, and done checkpoints.
- Status summarization: status must be visible through marker color, marker
  label, run summary counts, and selected-event fields.
- Stable identity first: agent name, role, status, route, and current event
  matter more than decorative visual fidelity.
- Projection boundary: visual density rules must never introduce runtime facts
  that are absent from `AgentEvent` or derived `WorldState`.

Current limitations:

- The assets are original and generated for this repository; they are not copied
  Stanford Smallville art and not a third-party asset pack.
- The map is visually closer to a Smallville-like projection and now includes
  interior anchors plus a deterministic day-run fixture, but it is still a
  compact prototype map rather than a complete generative-agents world with
  autonomous schedules, persistent memories, animation cycles, or editable
  large-world Tiled authoring.
- There is no dedicated search/filter input yet. S15 records the rule and
  preserves Timeline/detail-based inspection; a later session can add filter UI
  if product review makes that the highest-risk gap.
