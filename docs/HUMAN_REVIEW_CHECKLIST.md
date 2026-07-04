# Human Review Checklist

Use this checklist before accepting a Codex session or advancing to the next
Linear issue.

## Scope

- [ ] The work maps to exactly one Notion session.
- [ ] The work maps to exactly one Linear implementation issue.
- [ ] The touched files match the session allowed files.
- [ ] The change does not silently implement future-session scope.
- [ ] Broad product, renderer, adapter, asset, and docs changes are not mixed in
      one uncontrolled task.

## Architecture

- [ ] AgentEvent remains the only source of truth.
- [ ] Town, Timeline, Detail, Graph, and Memory views are projections.
- [ ] Phaser does not own business facts.
- [ ] React does not invent runtime facts.
- [ ] Adapters convert external sources into AgentEvent and stop there.
- [ ] Renderer code has no source-specific adapter branches.
- [ ] Reducer code has no DOM, React, Phaser, or canvas dependencies.

## Testing And Evidence

- [ ] `pnpm typecheck` was run or the missing-script reason is recorded.
- [ ] `pnpm test` was run or the missing-script reason is recorded.
- [ ] `pnpm build` was run or the missing-script reason is recorded.
- [ ] Session-specific tests or screenshots were produced when required.
- [ ] Evidence lives in the expected README, docs, or `docs/evidence/*` path.
- [ ] Command failures are described honestly and not treated as passes.

## Documentation

- [ ] README changed when setup, architecture, or user-facing behavior changed.
- [ ] `docs/ASSET_LICENSES.md` changed when external assets were introduced.
- [ ] `docs/EVENT_SCHEMA.md` changed when event schema changed.
- [ ] `docs/VISUAL_MAPPING.md` changed when event-to-visual mapping changed.
- [ ] `docs/ADAPTER_GUIDE.md` changed when adapter behavior changed.
- [ ] Docs link to relevant Notion or Linear sources where useful.

## Linear Self-Check

- [ ] Implementation issue checklist is satisfied or gaps are listed.
- [ ] Milestone acceptance gate was read and no boundary violation was found.
- [ ] Red-check issue was read and no blocker applies to this session.
- [ ] If a gate cannot pass yet because later sessions remain, that limitation is
      stated explicitly.
- [ ] Next session candidate is identified from the runbook index.

## Final Response

- [ ] Summary
- [ ] Files changed
- [ ] Commands run
- [ ] Acceptance evidence
- [ ] Linear self-check result
- [ ] Known limitations
- [ ] Next session candidate
