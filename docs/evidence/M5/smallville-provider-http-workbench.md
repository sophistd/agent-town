# Smallville Provider HTTP Workbench Evidence

Date: 2026-07-10

Branch: `codex/smallville-asset-pipeline`

PR: https://github.com/sophistd/agent-town/pull/1

## Summary

This continuation connects the browser workbench to the live
`POST /provider-loop` route.

The previous slice added the local/server HTTP route. This slice makes that
route usable from the existing dense workbench: the Import Source panel now has
a `Provider HTTP` source that posts the current canonical event stream to
`/provider-loop`, validates returned canonical events again, and replays the
returned evidence.

## Files Changed

- `src/adapters/providerLoopHttpAdapter.ts`
- `src/ui/App.tsx`
- `src/ui/ImportPanel.tsx`
- `src/server/worldMemoryHttpServer.ts`
- `src/tests/adapters.test.ts`
- `src/tests/world-memory-http-server.test.ts`
- `README.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/EVENT_SCHEMA.md`
- `docs/SMALLVILLE_PARITY.md`
- `docs/NEXT_PHASE.md`
- `docs/evidence/M5/smallville-provider-http-workbench.md`
- `docs/evidence/M5/smallville-provider-http-workbench-desktop.png`
- `docs/evidence/M5/smallville-provider-http-workbench-desktop-map.png`
- `docs/evidence/M5/smallville-provider-http-workbench-mobile.png`
- `docs/evidence/M5/smallville-provider-http-workbench-mobile-map.png`
- `docs/evidence/M5/smallville-provider-http-workbench-qa.json`

## Acceptance Evidence

- The Import Source panel includes `Provider HTTP`.
- The workbench posts the current canonical event stream to the configured
  `/provider-loop` URL.
- The browser adapter never sends provider credentials.
- The local world-memory server allows localhost browser CORS preflight and
  does not grant CORS access to remote origins.
- The browser adapter validates returned recall, Memory plan, and provider
  events before replay.
- When no local/server API key is configured, provider events may be empty, but
  server-backed recall and Memory plan events still replay as canonical
  evidence.
- HTTP failures and server error envelopes become warnings rather than hidden
  success.

## Verification

Commands run:

- `pnpm exec vitest run src/tests/adapters.test.ts src/tests/world-memory-http-server.test.ts`:
  passed, 2 files / 20 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 18 files / 103 tests.
- `pnpm build`: passed. Vite emitted the existing large chunk warning.
- `git diff --check`: passed.

Browser QA:

- Tool path: Python Playwright. Node `require('playwright')` was unavailable
  in this repository, so Python Playwright was used for durable visual
  evidence.
- Scenario: start the Vite workbench and local world-memory server with a
  temporary memory file, load `Social day`, set `Provider loop HTTP URL` to the
  live local `/provider-loop` route, click `Provider HTTP`, and wait for
  `Provider HTTP loop:` plus `missing_openai_api_key` to be visible.
- Desktop 1440x960:
  `docs/evidence/M5/smallville-provider-http-workbench-desktop.png`.
- Desktop canvas crop:
  `docs/evidence/M5/smallville-provider-http-workbench-desktop-map.png`.
- Mobile 390x844:
  `docs/evidence/M5/smallville-provider-http-workbench-mobile.png`.
- Mobile canvas crop:
  `docs/evidence/M5/smallville-provider-http-workbench-mobile-map.png`.
- QA JSON:
  `docs/evidence/M5/smallville-provider-http-workbench-qa.json`.
- QA checks passed: no horizontal overflow, nonblank varied canvas screenshot,
  no console errors, no page errors, `Provider HTTP loop:` visible, and
  `missing_openai_api_key` visible.

Pixel evidence from the canvas screenshots:

- Desktop canvas crop: 446 sampled colors, 25,891 opaque samples.
- Mobile canvas crop: 499 sampled colors, 30,039 opaque samples.

## Scope Truth

- This connects the browser workbench to a local/server Provider HTTP source.
- This is not a deployed service.
- This is not a live-verified OpenAI run.
- No API key was created, requested, printed, stored, or written.
- Provider credentials are not sent from the browser.
- This is not a real external runtime stream yet; it posts the current
  workbench event stream through the live route.
- This does not claim final Stanford Smallville parity.

## Next Session Candidate

Connect a real external runtime stream to `POST /provider-loop`, or run and
evidence a live provider-backed planner call through the same route using a
local/server-side API key.
