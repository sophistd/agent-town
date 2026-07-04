# M3 Debuggability Checklist

Use this checklist when M3 introduces timeline, replay, detail, and failure
shortcuts.

## Source

- Metrics doc: `docs/METRICS.md`
- Notion metrics: https://app.notion.com/p/393acb4bb6e681e39b1ae49a477f27d7
- M3 acceptance gate: https://linear.app/infoark/issue/MDL-127/acceptance-gate-m3-timeline-trace-and-replay-debugger

## Test Setup

- Run or recording source:
- Event fixture:
- Viewer:
- Date:
- Reviewer:

## Replay And Detail

- [ ] Timeline lists every event in chronological order.
- [ ] Play, pause, previous, next, and jump controls work.
- [ ] Timeline cursor and Town View remain synchronized.
- [ ] Selected event and playback current event are distinguishable.
- [ ] Detail Panel shows raw event fields for selected event.
- [ ] Bubble or visual marker maps back to the selected raw event.
- [ ] Replay is deterministic for the same fixture and cursor.

## Failure Context

- [ ] Run Summary exposes first blocked event.
- [ ] Run Summary exposes first error event.
- [ ] Jump to first error takes 1 click or less from summary.
- [ ] Previous context before error is reachable in 2 clicks or less.
- [ ] Blocked and error markers remain visible long enough to inspect.
- [ ] Run summary counts match selectors.

## Result

```text
Pass / Fail:
Missing items:
Replay mismatch:
Evidence files:
Required fixes:
```
