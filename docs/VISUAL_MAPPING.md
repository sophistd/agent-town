# Visual Mapping

Agent Town renders `WorldState`; it does not create business facts inside the renderer.

## Location Mapping

Coordinates are canonical in `src/events/routing.ts`. The renderer imports those coordinates and only adds labels, colors, and placeholder building shapes.

| Location | Label | Projection role |
| --- | --- | --- |
| `town_hall` | Town Hall | Planning and decisions |
| `library` | Library | Research, search, and reading |
| `workshop` | Workshop | Editing, building, tests, and tool work |
| `archive` | Archive | Memory reads and writes |
| `review_room` | Review Room | Review, blocked, and error inspection |
| `dispatch_board` | Dispatch Board | Handoffs and queued work |
| `square` | Square | Current shared surface and done state |

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

- `src/game/renderLocations.ts` renders locations from `LOCATION_COORDINATES`.
- `src/game/renderAgents.ts` renders agent identity, role color, status marker, and label from `WorldState`.
- `src/game/visualMapping.ts` contains visual labels/colors only. It does not route events.
- `src/events/routing.ts` remains the source of event-to-location routing.
