# AGENTS.md - Agent Town

This file defines the repository operating contract for Codex and other coding
agents working on Agent Town.

Prefer repository facts, Notion session runbooks, and Linear acceptance checks
over generic assumptions.

## Product Invariant

Agent Town is an event-driven multi-agent runtime projection UI.

AgentEvent is the only source of truth. Town, Timeline, Detail, Graph, and
Memory views are projections.

Do not make Phaser, React components, adapters, imported assets, or visual state
own runtime facts.

```text
External source -> Adapter -> AgentEvent -> WorldState -> Projection views
```

## Source Of Construction And Acceptance

- Notion is the construction source: root spec, session runbooks, file scope,
  required commands, and evidence expectations.
- Linear is the adversarial acceptance source: implementation issue,
  milestone gate, red-check issue, and pass/fail checklist.
- If Notion and Linear conflict, use Linear for pass/fail, Notion for
  implementation shape, and stop advancement if the conflict cannot be resolved.

## Task Rule

One Codex task maps to one Linear issue and one Notion session.

Do not build the whole product in one task. Do not combine event ontology,
fixtures, reducer, renderer, adapter, visual assets, and docs in a single
uncontrolled change.

## Planned Tech Stack

- Vite + React + TypeScript
- Phaser for town canvas only
- Zustand for UI and playback state
- Vitest for tests
- Tiled JSON later for map layout

The S03 scaffold introduced `package.json` and executable scripts. Earlier M0
sessions documented the missing-script gap; current and later code sessions
should run the required commands directly.

## Architecture Boundaries

- `src/events/*` owns event schema, constants, reducer, selectors, validators,
  and routing.
- `src/game/*` consumes WorldState and renders projections only.
- `src/ui/*` owns product UI, layout, controls, and user interaction surfaces.
- `src/state/*` owns playback and selection state.
- `src/adapters/*` converts external sources into AgentEvent.
- `public/*` contains static maps and visual assets only after the relevant
  session allows them.
- `docs/evidence/*` records proof, not product scope expansion.

Boundary constraints:

- No React, DOM, Phaser, or canvas imports in `src/events/reducer.ts`.
- No adapter-specific logic in `src/game/*`.
- No renderer-owned business facts.
- No imported asset without a license entry in `docs/ASSET_LICENSES.md`.
- Unknown events and invalid adapter input must not crash playback.

## Required Commands

Run these before finishing code tasks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

If a task only changes docs, still run the lightest available validation command
or the required commands from the session. If scripts are unavailable, report the
missing scripts exactly.

## Testing Expectations

- Reducers must be deterministic.
- `replay(events, cursor)` must reconstruct the same WorldState for the same
  input.
- Unknown event types must fall back safely.
- Invalid adapter input must be quarantined.
- Timeline cursor and WorldState replay must stay aligned.
- Rendering should be tested through state/projection boundaries where possible.

## Coding Style

- Prefer small pure functions.
- Keep type definitions explicit.
- Do not use `any` unless the field is intentionally external or raw input.
- Add comments only for domain rules or non-obvious decisions.
- Keep mock fixtures readable and deterministic.
- Keep changes scoped to the current session's allowed files.

## Evidence Requirements

Every completed session must report:

1. Summary
2. Files changed
3. Commands run
4. Acceptance evidence
5. Linear self-check result
6. Known limitations
7. Next session candidate

Evidence files belong under `docs/evidence/<milestone>/` when the session
requires a durable artifact.

## Human Review Expectations

Before considering a task complete, review:

- Did the change preserve AgentEvent as source of truth?
- Did it respect the session allowed files?
- Did it avoid hidden implementation from later sessions?
- Did it run required commands or document why they are unavailable?
- Did it record the acceptance evidence Linear asks for?
- Did it leave the next session unblocked?

## Anti-Patterns

Avoid prompts or implementation choices like:

```text
Build the whole product.
```

Use session-scoped prompts like:

```text
Implement S06 / MDL-136 only: reducer, selectors, routing, validators, and
determinism tests. Do not touch Phaser, adapters, visual assets, or timeline UI.
```

## Current Scaffold Note

The scaffold is intentionally minimal. It exists so later sessions can add
ontology, fixtures, reducers, renderers, state stores, and adapters without
changing the project foundation again.
