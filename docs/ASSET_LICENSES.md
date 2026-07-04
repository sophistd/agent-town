# Asset Licenses

This file is the required manifest for any external visual asset imported into
Agent Town.

## Current Status

No external visual assets are imported.

M1 through M5 use generated placeholders so event-engine, projection,
replay-debugger, runtime ingest, and demo-evidence work cannot be blocked by
pixel-art availability or unclear licenses.

The current asset/map session adds `public/maps/town-v1.tiled.json`, a
project-authored Tiled-compatible JSON object map. It contains terrain, routes,
decor markers, and location object metadata, but no third-party tileset PNG,
sprite sheet, downloaded art, or copied Stanford Smallville asset.

The repository is public but currently has no `LICENSE` file. Project-authored
map data and code should therefore be treated as repository-owned content until
the project owner chooses an explicit open-source license.

## Placeholder-First Policy

Use generated placeholders unless a session explicitly requires imported art:

- buildings: generated shapes and labels
- agents: generated marks, initials, or simple local shapes
- bubbles: CSS or generated rectangles
- handoff/message edges: generated lines
- status markers: generated symbols or local CSS

Imported assets are a M5 concern unless an earlier session documents why they
are necessary and records full license evidence here.

## Project-Authored Asset Inventory

| Asset name | Local path | Source | License / rights status | Attribution | Runtime boundary |
| --- | --- | --- | --- | --- | --- |
| Town v1 object map | `public/maps/town-v1.tiled.json` | Authored in this repository for this session | Project-owned repository content; no third-party license; no repo-level open-source license selected yet | none | Projection metadata only; `AgentEvent` remains source of truth |

## Required Fields For Every External Asset

| Field | Required value |
| --- | --- |
| Asset name | Human-readable name |
| Local path | Where the file lives in this repository |
| Source URL | Direct source page, not only a CDN URL |
| Author | Creator or publisher |
| License | License name and license URL |
| Commercial use | Allowed, disallowed, or unclear |
| Attribution | Required text or `none` |
| Modifications | Whether the asset was changed |
| Imported by session | Session ID and Linear issue |
| Replacement fallback | Generated placeholder fallback |

If any license field is unclear, do not import the asset.

## Planned M5 Asset Manifest

| Asset | Format | Status | Rule |
| --- | --- | --- | --- |
| Town tilemap | Tiled-compatible JSON | introduced as original object map | object-layer IDs must remain aligned with `src/events/routing.ts` |
| Tileset | PNG | deferred | must include license and attribution status |
| Agent spritesheet | PNG | deferred | optional until product polish |
| Event icons | SVG or PNG | deferred | generated icons are acceptable first |
| Bubble frame | PNG, SVG, or CSS | deferred | CSS first is acceptable |
| Status markers | SVG, PNG, or CSS | deferred | generated markers are acceptable first |

## Asset Pipeline Decision

The session introduces the map data layer but still defers external pixel art.
That keeps the product moving toward a Smallville-like maintained town projection
without importing ambiguous-license art into the public repository.

The current map covers the required stable zones:

- `town_hall`: planning and decisions
- `library`: research
- `workshop`: production/build
- `archive`: memory
- `review_room`: review, blocked, and error inspection
- `dispatch_board`: queue and handoff coordination
- `square`: current shared/final surface

No third-party asset has been copied into `public/`, `src/`, or `docs/`.
Therefore third-party commercial-use, attribution, and modification obligations
are currently `not applicable`.

Next asset step: create a project-authored tileset and agent sprite sheet, or
choose a third-party asset pack only after recording source URL, author, license,
commercial-use status, attribution, modifications, and fallback behavior here.

## Import Checklist

- [ ] The asset is required by the current session scope.
- [ ] Generated placeholder is insufficient and the reason is documented.
- [ ] Source URL is recorded.
- [ ] License URL is recorded.
- [ ] Commercial-use status is recorded.
- [ ] Attribution requirement is recorded.
- [ ] Local path is recorded.
- [ ] Asset is not used as a source of runtime truth.

## Boundary

Visual assets may represent WorldState, but they must never own runtime facts.
AgentEvent remains the only source of truth.
