# Agent Town

Agent Town is a multi-agent runtime projection layer: it turns AgentEvent streams,
tool calls, handoffs, memory actions, blocked states, and errors into a visible,
inspectable town view.

It is not an open-world game, a Stanford town clone, or a runtime simulator. The
runtime facts come from AgentEvent. Town, Timeline, Detail, Graph, and Memory
views are projections.

```text
Source adapter -> AgentEvent -> WorldState reducer -> projection views
```

## Source Documents

- Root PRD and spec: https://app.notion.com/p/393acb4bb6e68173afe9f05fbcf69313
- Session runbook index: https://app.notion.com/p/393acb4bb6e681cc9b54c0c41957775a
- S00 runbook: https://app.notion.com/p/393acb4bb6e681ac9102ceff70470707
- S01 runbook: https://app.notion.com/p/393acb4bb6e68127a4ede7659e98959d
- Build materials manifest: https://app.notion.com/p/393acb4bb6e6813690bdc7628633b570
- Codex implementation method: https://app.notion.com/p/393acb4bb6e681358333d24895d85412
- Linear implementation issue: https://linear.app/infoark/issue/MDL-130/build-readiness-materials-manifest-and-asset-policy

## Codex Protocol

Repository-level agent instructions live in `AGENTS.md`.

Reusable session prompts live in `docs/CODEX_PROMPTS.md`.

Human review expectations live in `docs/HUMAN_REVIEW_CHECKLIST.md`.

Metrics and acceptance measurement live in `docs/METRICS.md`.

AgentEvent schema documentation lives in `docs/EVENT_SCHEMA.md`.

The core operating rule is one Notion session plus one Linear issue per Codex
task. Later agents should read `AGENTS.md` first, then the relevant Notion
session, Linear implementation issue, milestone acceptance gate, and red-check
issue.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Run the local app:

```bash
pnpm dev
```

Required checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Build Materials

S00 makes the repository materials-ready before product code is introduced. It
documents what later sessions need, while deliberately avoiding implementation
code, fixtures, Phaser setup, reducers, adapters, and external visual assets.

### Target Repository Structure

The complete project is expected to grow into this shape as later sessions run:

```text
agent-town/
  AGENTS.md
  README.md
  package.json
  vite.config.ts
  tsconfig.json
  vitest.config.ts
  public/
    maps/
    tilesets/
    sprites/
    icons/
  src/
    events/
      types.ts
      constants.ts
      mockEvents.ts
      mockFailureRun.ts
      mockStressRun.ts
      invalidEvents.ts
      reducer.ts
      selectors.ts
      validators.ts
      routing.ts
    adapters/
      types.ts
      jsonlAdapter.ts
      websocketAdapter.ts
      sampleOtelAdapter.ts
      sampleCodexAdapter.ts
    game/
      AgentTownScene.ts
      createPhaserGame.ts
      renderAgents.ts
      renderBubbles.ts
      renderEdges.ts
      renderLocations.ts
      visualMapping.ts
    state/
      playbackStore.ts
      selectionStore.ts
    ui/
      App.tsx
      Layout.tsx
      TownCanvas.tsx
      Timeline.tsx
      DetailPanel.tsx
      RunSummary.tsx
      SessionSidebar.tsx
      ImportPanel.tsx
    tests/
      reducer.test.ts
      replay.test.ts
      routing.test.ts
      validators.test.ts
      adapters.test.ts
  docs/
    ASSET_LICENSES.md
    EVENT_SCHEMA.md
    ADAPTER_GUIDE.md
    VISUAL_MAPPING.md
    DEMO_SCRIPT.md
    evidence/
      README.md
      M1/
      M2/
      M3/
      M4/
      M5/
```

Empty evidence folders do not need placeholder files. The first evidence artifact
for each milestone can create the matching folder.

### Required Code Materials

M1 establishes the event engine without rendering:

- `src/events/types.ts`: AgentEvent, WorldState, RunSummary, projection edge, and
  related ontology types.
- `src/events/constants.ts`: event type, role, status, and location constants.
- `src/events/mockEvents.ts`, `mockFailureRun.ts`, `mockStressRun.ts`,
  `invalidEvents.ts`: deterministic fixture sets.
- `src/events/reducer.ts`: pure event-to-world reducer.
- `src/events/selectors.ts`: UI-safe selectors over WorldState.
- `src/events/routing.ts`: event-to-location routing.
- `src/events/validators.ts`: validation and quarantine handling.
- `src/tests/*.test.ts`: determinism, routing, validation, and replay tests.

M2 adds the visual projection boundary:

- `src/ui/TownCanvas.tsx`, `src/game/createPhaserGame.ts`,
  `src/game/AgentTownScene.ts`: React to Phaser lifecycle boundary.
- `src/game/renderLocations.ts`, `renderAgents.ts`, `renderBubbles.ts`,
  `renderEdges.ts`, `visualMapping.ts`: WorldState to visual output.
- `src/ui/DetailPanel.tsx`: selected event inspection.

M3 adds replay debugging:

- `src/state/playbackStore.ts`, `src/state/selectionStore.ts`.
- `src/ui/Timeline.tsx`, `src/ui/RunSummary.tsx`.
- `src/tests/replay.test.ts`.

M4 adds adapters while keeping the event model stable:

- `src/adapters/types.ts`, `jsonlAdapter.ts`, `websocketAdapter.ts`,
  `sampleOtelAdapter.ts`, `sampleCodexAdapter.ts`.
- `src/ui/ImportPanel.tsx`.
- `src/tests/adapters.test.ts`.

M5 adds demo evidence and any deferred visual polish:

- `docs/DEMO_SCRIPT.md`, `docs/VISUAL_MAPPING.md`,
  `docs/evidence/M5/performance-200-events.md`,
  `docs/evidence/M5/final-demo-notes.md`.

### Required Data Fixtures

Later sessions must provide these deterministic data materials:

| File | Minimum content | Purpose |
| --- | ---: | --- |
| `mockEvents.ts` | 25+ events | happy-path demo |
| `mockFailureRun.ts` | 30+ events | blocked, error, repair, done path |
| `mockStressRun.ts` | 200+ events | performance and density test |
| `invalidEvents.ts` | 10+ invalid examples | validator and quarantine test |
| `sample-native.jsonl` | 25+ events | JSONL import proof |
| `sample-otel-shaped.json` | 10+ spans | adapter mapping proof |
| `sample-codex-shaped.json` | 10+ logs/actions | Codex-style mapping proof |

Fixture coverage must include at least five agents, seven locations, all ten
event types, handoffs/messages, tool calls, memory actions, a blocked or error
path, a repair or retry path, and a done event.

### Placeholder-First Visual Strategy

M1 through M3 are not blocked by external pixel art. Visual proof starts with
generated placeholders:

- buildings: labeled geometric blocks
- agents: simple stable marks with names
- bubbles: CSS or generated text blocks
- edges: generated lines
- blocked/error/done states: generated markers

External maps, tilesets, sprites, icons, and pixel polish are M5 materials unless
a later session explicitly introduces them earlier with a documented license.

### Asset License Rule

Every imported external visual asset must have:

- source URL
- license name and license URL
- commercial-use status
- attribution requirement
- local repo path
- reason it is needed instead of a generated placeholder

If the license is ambiguous, the asset must not be imported. Use generated
placeholders instead.

See `docs/ASSET_LICENSES.md` for the live asset policy and manifest.

### Evidence Convention

Evidence is stored under `docs/evidence/<milestone>/` and should include command
output, screenshots or recordings when relevant, performance notes, audit notes,
and any known limitations. See `docs/evidence/README.md`.

## Current Scaffold Scope

S03 introduces only the runnable React/TypeScript shell, scripts, baseline
folders, and documentation alignment. Runtime code, schema implementation,
fixtures, renderer code, adapters, and external assets are intentionally
deferred to later sessions.
