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

The current map session introduces a project-authored object map, not a
third-party tileset or sprite sheet. The `locations` object layer is projection
metadata only: it may define building footprints and visual anchors, but it does
not create runtime facts. Agent role, status, event type, and selected state
still come from `AgentEvent -> WorldState`.

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

## Agent Mapping

Agent identity comes from `WorldState.agents`.

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
- `src/game/townMap.ts` parses the Tiled-compatible object map and provides the
  generated fallback.
- `src/game/renderTownMap.ts` renders terrain, routes, and decor from the parsed
  map definition.
- `src/game/renderLocations.ts` renders location buildings from the parsed map
  footprints, while tests keep map anchors aligned with `LOCATION_COORDINATES`.
- `src/game/renderAgents.ts` renders agent identity, role color, status marker, and label from `WorldState`.
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

- There is no imported PNG tileset or sprite sheet yet. This session adds the
  maintainable map-data layer first so the next asset session can add
  project-authored pixel tiles without changing event semantics.
- There is no dedicated search/filter input yet. S15 records the rule and
  preserves Timeline/detail-based inspection; a later session can add filter UI
  if product review makes that the highest-risk gap.
