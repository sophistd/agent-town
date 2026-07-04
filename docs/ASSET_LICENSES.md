# Asset Licenses

This file is the required manifest for any external visual asset imported into
Agent Town.

## Current Status

No external visual assets are imported in S00.

M1 through M3 must use generated placeholders so event-engine, projection, and
replay-debugger work cannot be blocked by pixel-art availability or unclear
licenses.

## Placeholder-First Policy

Use generated placeholders unless a session explicitly requires imported art:

- buildings: generated shapes and labels
- agents: generated marks, initials, or simple local shapes
- bubbles: CSS or generated rectangles
- handoff/message edges: generated lines
- status markers: generated symbols or local CSS

Imported assets are a M5 concern unless an earlier session documents why they
are necessary and records full license evidence here.

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
| Town tilemap | Tiled JSON | deferred | introduce or document defer in M5 |
| Tileset | PNG | deferred | must include license and attribution status |
| Agent spritesheet | PNG | deferred | optional until product polish |
| Event icons | SVG or PNG | deferred | generated icons are acceptable first |
| Bubble frame | PNG, SVG, or CSS | deferred | CSS first is acceptable |
| Status markers | SVG, PNG, or CSS | deferred | generated markers are acceptable first |

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
