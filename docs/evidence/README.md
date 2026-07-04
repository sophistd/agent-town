# Evidence Convention

Evidence proves that a session met its Notion scope and Linear acceptance checks.
It is not a place for product scope expansion.

## Folder Layout

Evidence is grouped by milestone:

```text
docs/evidence/
  README.md
  M1/
  M2/
  M3/
  M4/
  M5/
```

Empty milestone folders do not need placeholder files. Create each folder when
the first evidence artifact for that milestone exists.

The canonical metric framework lives in `docs/METRICS.md`.

## What Counts As Evidence

- command output for required checks
- screenshots or recordings when a visual session requires them
- fixture counts and coverage matrices
- replay snapshots
- reducer or adapter audit notes
- performance measurements
- links to Notion session pages and Linear issues
- explicit notes for commands that could not run

## Planned Milestone Evidence

These filenames mirror the Notion Metrics & Acceptance Measurement convention:

```text
docs/evidence/
  M1/
    test-output.md
    reducer-snapshot.md
  M2/
    town-view.png
    bubble-detail.png
    comprehension-checklist.md
  M3/
    replay-recording.mp4
    error-jump.gif
    debuggability-checklist.md
  M4/
    jsonl-import-recording.mp4
    invalid-event-quarantine.md
  M5/
    final-demo.mp4
    screenshots/
    performance-200-events.md
```

The exact artifact can vary by session, but every variation must still prove the
same acceptance question from Notion and Linear.

## Required Command Status Format

Each session evidence note should record:

```text
Command:
Result:
Reason if not run:
Relevant output:
```

Do not claim a command passed unless it was run in the current worktree.

## Session Self-Check Format

Each session should end with:

```text
Summary
Files changed
Commands run
Acceptance evidence
Linear self-check result
Known limitations
Next session candidate
```

## Historical S00-S02 Command Gap

S00 runs before the S03 scaffold. If `package.json` or package scripts do not
exist yet, the required commands are recorded as unavailable and must be rerun
after S03 introduces the project scaffold.

After S03, `pnpm typecheck`, `pnpm test`, and `pnpm build` should run directly.

## Boundary

Evidence should point back to AgentEvent, WorldState, and projection behavior.
It should not create alternate facts outside the event pipeline.
