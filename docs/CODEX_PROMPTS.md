# Codex Prompt Templates

Use these templates to keep Agent Town implementation sessions scoped to one
Notion session and one Linear issue.

## Standard Session Template

```text
You are working on Agent Town.

Read AGENTS.md first.

Notion session: <session page link>
Linear implementation issue: <issue link>
Linear milestone acceptance gate: <gate link>
Linear red-check issue: <red-check link>
Milestone: <M0/M1/M2/M3/M4/M5>

Goal:
<one sentence>

Allowed files:
- <file or directory>
- <file or directory>

Forbidden scope:
- <file, directory, or behavior>
- <file, directory, or behavior>

Architecture constraints:
- AgentEvent remains the only source of truth.
- Town, Timeline, Detail, Graph, and Memory views are projections.
- Phaser consumes WorldState only.
- React does not invent runtime truth.
- Adapters produce AgentEvent and do not leak source-specific schemas to renderers.

Acceptance criteria:
- [ ] <criterion>
- [ ] <criterion>
- [ ] <criterion>

Required commands:
- pnpm typecheck
- pnpm test
- pnpm build

Required evidence:
- <artifact or note>
- <artifact or note>

Return:
- summary
- files changed
- commands run
- acceptance evidence
- Linear self-check result
- known limitations
- next session candidate
```

## S03 / MDL-133 Sample Prompt

```text
Implement S03 / MDL-133 only.

Create the initial Vite + React + TypeScript scaffold and baseline docs for
Agent Town.

Read:
- AGENTS.md
- Notion S03 session runbook
- Linear MDL-133
- Linear MDL-125 acceptance gate
- Linear MDL-147 red-check issue

Allowed files:
- AGENTS.md
- README.md
- package.json
- vite.config.ts
- tsconfig.json
- vitest.config.ts
- baseline src/ folders
- baseline docs/ folders

Forbidden scope:
- Do not implement Phaser rendering.
- Do not implement reducers.
- Do not implement adapters.
- Do not create mock fixtures.
- Do not introduce visual assets.

Acceptance criteria:
- [ ] Vite + React + TypeScript app scaffold exists.
- [ ] pnpm dev, pnpm typecheck, pnpm test, and pnpm build scripts exist.
- [ ] AGENTS.md contains product invariant, architecture boundaries, commands,
      testing expectations, and final-response expectations.
- [ ] README includes product one-liner, local setup, architecture skeleton, and
      Notion root spec link.
- [ ] docs/evidence convention is present.
- [ ] Empty module folders exist for events, game, ui, state, and adapters.
- [ ] Required baseline commands run or failures are documented honestly.

Required commands:
- pnpm typecheck
- pnpm test
- pnpm build

Return:
- summary
- files changed
- commands run
- acceptance evidence
- Linear self-check result
- known limitations
- next session candidate
```

## Anti-Pattern

Do not use broad prompts like:

```text
Build Agent Town.
```

Replace them with a bounded session prompt:

```text
Implement S04 / MDL-134 only: AgentEvent ontology types and schema docs. Do not
implement reducer, fixtures, Phaser, adapters, or UI behavior.
```
