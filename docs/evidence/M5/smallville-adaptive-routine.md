# Smallville Adaptive Routine Evidence

## Summary

This session moves Agent Town closer to the Stanford Smallville target by adding
an adapter-produced daily routine revision path.

The new `Adaptive routine` source reads previous canonical routine evidence and
new town observations, then emits revised observation, memory retrieval,
reflection, planning, action, and closure events as canonical `AgentEvent[]`.
Schedule revision remains evidence in `AgentEvent.metadata.routineRevision`;
Phaser, React state, sprites, Tiled objects, and local UI controls do not own the
runtime facts.

## Files Changed

- `src/adapters/adaptiveRoutineAdapter.ts`
- `src/ui/App.tsx`
- `src/ui/ImportPanel.tsx`
- `src/ui/RunSummary.tsx`
- `src/events/smallvilleEvaluation.ts`
- `src/tests/adaptive-routine-adapter.test.ts`
- `src/tests/smallville-evaluation.test.ts`
- `docs/ADAPTER_GUIDE.md`
- `docs/EVENT_SCHEMA.md`
- `docs/NEXT_PHASE.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/VISUAL_MAPPING.md`
- `docs/evidence/M5/smallville-adaptive-routine.md`

## Acceptance Evidence

- The adapter emits 150 canonical events for 25 agents.
- Each agent receives six revised routine phases:
  - observation / wake
  - retrieval / retrieve
  - reflection / work
  - planning / plan
  - action or conversation / act
  - closure / close
- Every event carries `metadata.routine`.
- Every event carries `metadata.routineRevision` with:
  - previous run id
  - previous event id
  - prior routine event ids
  - selected memory event ids
  - old location and sub-location
  - revised location and sub-location
  - source observation id and reason
  - deterministic adapter boundary
- If the supplied UI stream has no routine evidence, the adapter returns
  `adaptive_routine_default_seed` and uses the deterministic Routine day seed
  instead of silently claiming current-run provenance.
- `Smallville Eval` now includes `Adaptive routine` as a structural capability
  and ablation check.

## Verification

Commands:

```bash
pnpm test -- adaptive-routine-adapter
pnpm typecheck
pnpm test -- adaptive-routine-adapter smallville-evaluation
pnpm test
pnpm build
git diff --check
```

Results:

- Targeted adapter/evaluation tests passed.
- TypeScript typecheck passed.
- Full Vitest suite passed: 13 files / 78 tests.
- Production build passed with the existing Vite/Phaser large chunk warning.
- `git diff --check` passed.

Rendered verification:

- Browser plugin was used first.
- Browser `domSnapshot()` failed plugin-side with
  `TypeError: o.incrementalAriaSnapshot is not a function`, so independent
  Playwright was used for clean console, interaction, responsive, and screenshot
  evidence.
- Desktop viewport: 1440x960.
- Mobile viewport: 390x844.
- Mobile map viewport was checked after scrolling the canvas into view.
- Adaptive routine source loaded: `adaptive-routine · 150 events`.
- Status displayed: `Adaptive routine plan: 150 events accepted.`
- `Smallville Eval` displayed `routine phases 6/6; revisions 25`.
- Canvas was present and nonblank by screenshot file-size check.
- No horizontal overflow was detected on desktop or mobile.
- `Next` changed Cursor from `1 / 150` to `2 / 150`.
- `Play` advanced Cursor to `3 / 150` before pause.
- Zoom-in displayed `105%`.
- Bubble toggle changed `aria-pressed` to `false`.
- Edge toggle changed `aria-pressed` to `false`.
- Critical filter changed visible timeline events to `5/150` and the filter
  panel to `4 / 10 types visible`.
- Fresh Playwright run had no page errors and no Phaser/React runtime errors.
  The only desktop console warnings were Chromium WebGL `ReadPixels`
  performance warnings emitted during screenshot capture.

Screenshot / check artifacts:

- `docs/evidence/M5/smallville-adaptive-routine-desktop.png`
- `docs/evidence/M5/smallville-adaptive-routine-interaction.png`
- `docs/evidence/M5/smallville-adaptive-routine-mobile.png`
- `docs/evidence/M5/smallville-adaptive-routine-mobile-map.png`
- `docs/evidence/M5/smallville-adaptive-routine-pixel-check.json`

## Asset / License Status

- No external assets were added.
- No Stanford Smallville assets were copied.
- No repository `LICENSE` file was added.
- Current generated project assets remain under the existing repository-owned
  content boundary documented in `docs/ASSET_LICENSES.md`.

## Remaining Limitations

- This is deterministic adapter-produced revision, not autonomous free-running
  daily scheduling.
- No live LLM provider generated the revised plans in this session.
- Persistent memory is still browser-local, not server-backed world memory.
- Human believability ratings and empirical ablation studies are still missing.

## Next Session Candidate

Use the adaptive routine revision shape as the target contract for a
provider-backed planner call, while keeping model output behind parser
validation and quarantine before replay.
