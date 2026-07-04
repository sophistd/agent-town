# M3 Debuggability Checklist

## Source

- Metrics doc: `docs/METRICS.md`
- Notion metrics: https://app.notion.com/p/393acb4bb6e681e39b1ae49a477f27d7
- M3 acceptance gate: https://linear.app/infoark/issue/MDL-127/acceptance-gate-m3-timeline-trace-and-replay-debugger

## Test Setup

- Run or recording source: `src/events/mockFailureRun.ts`
- Event fixture: `mockFailureRun`
- Viewer: local Vite app at `http://127.0.0.1:5173/`
- Browser verification: Chrome DevTools Protocol on a temporary Chrome profile
- Date: 2026-07-04
- Reviewer: Codex

## Replay And Detail

- [x] Timeline lists every event in sequence order.
- [x] Play, pause, previous, next, and jump controls work.
- [x] Timeline cursor and Town View remain synchronized.
- [x] Selected event and playback current event are distinguishable.
- [x] Detail Panel shows raw event fields for selected event.
- [x] Bubble or visual marker maps back to the selected raw event.
- [x] Replay is deterministic for the same fixture and cursor.

## Failure Context

- [x] Run Summary exposes first blocked event: `failure-009`.
- [x] Run Summary exposes first error event: `failure-008`.
- [x] Jump to first error takes 1 click from summary.
- [x] Previous context before error is reachable in 2 clicks: `First error` -> `Before error`.
- [x] Blocked and error markers remain visible long enough to inspect.
- [x] Run summary counts match selectors.

## Result

```text
Pass / Fail: Pass
Missing items: none
Replay mismatch: none observed
Evidence files:
- docs/evidence/M3/failure-jump.md
- docs/evidence/M3/failure-jump.png
- docs/evidence/M3/detail-panel.png
Required fixes: none
```
