import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LOCATION_COORDINATES } from "../events/routing";
import {
  DEFAULT_TOWN_MAP,
  getTownMapLocationIds,
  hasCompleteTownMapLocations,
  parseTiledTownMap,
  type RenderedLocationId,
} from "../game/townMap";

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

const expectedLocationIds: RenderedLocationId[] = [
  "dispatch_board",
  "town_hall",
  "library",
  "archive",
  "square",
  "workshop",
  "review_room",
];

const expectedInteriorIds = [
  "dispatch_queue",
  "dispatch_notice_wall",
  "town_hall_table",
  "town_hall_office",
  "library_stacks",
  "library_reading_nook",
  "archive_shelves",
  "archive_writing_desk",
  "square_cafe",
  "square_fountain_edge",
  "workshop_bench",
  "workshop_debug_desk",
  "review_table",
  "review_evidence_wall",
];

function readTownMapFixture(): unknown {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "public/maps/town-v1.tiled.json"),
      "utf8",
    ),
  ) as unknown;
}

function expectPngAsset(path: string): void {
  const bytes = readFileSync(join(process.cwd(), path));

  expect([...bytes.subarray(0, 8)]).toEqual(pngSignature);
}

describe("town map asset", () => {
  it("parses the public Tiled-compatible map with every stable projection zone", () => {
    const map = parseTiledTownMap(readTownMapFixture());

    expect(map).toBeDefined();
    expect(map?.source).toBe("asset");
    expect(map?.id).toBe("town-v1-original-pixel-town");
    expect(map?.width).toBe(1040);
    expect(map?.height).toBe(896);
    expect(map?.backgroundImageUrl).toBe("/maps/town-v1-preview.png");
    expect(map?.agentSpritesheetUrl).toBe("/sprites/agent-roles-v1.png");
    expect(map?.buildingSpritesheetUrl).toBe("/sprites/buildings-v1.png");
    expect(map?.tilesets).toHaveLength(1);
    expect(map?.tilesets[0]?.imageUrl).toBe("/tilesets/agent-town-v1.png");
    expect(map?.tileLayers.map((layer) => layer.name)).toEqual([
      "base",
      "paths-and-plaza",
      "detail",
    ]);
    expect(map === undefined ? [] : getTownMapLocationIds(map)).toEqual(expectedLocationIds);
    expect(map === undefined ? false : hasCompleteTownMapLocations(map)).toBe(true);
    expect(map?.interiors.map((interior) => interior.interiorId)).toEqual(expectedInteriorIds);
    expect(map?.routes).toHaveLength(6);
    expect(map?.decor.length).toBeGreaterThan(DEFAULT_TOWN_MAP.decor.length);
  });

  it("keeps interior anchors as projection targets for stable locations", () => {
    const map = parseTiledTownMap(readTownMapFixture());

    if (map === undefined) {
      throw new Error("town-v1.tiled.json did not parse");
    }

    const locationIds = new Set(getTownMapLocationIds(map));

    for (const interior of map.interiors) {
      expect(locationIds.has(interior.locationId)).toBe(true);
      expect(interior.activityRole.length).toBeGreaterThan(0);
      expect(interior.anchorX).toBeGreaterThan(interior.x);
      expect(interior.anchorX).toBeLessThan(interior.x + interior.width);
      expect(interior.anchorY).toBeGreaterThan(interior.y);
      expect(interior.anchorY).toBeLessThan(interior.y + interior.height);
    }
  });

  it("keeps the generated project-authored PNG assets readable", () => {
    expectPngAsset("public/maps/town-v1-preview.png");
    expectPngAsset("public/tilesets/agent-town-v1.png");
    expectPngAsset("public/sprites/agent-roles-v1.png");
    expectPngAsset("public/sprites/buildings-v1.png");
  });

  it("keeps map anchors aligned with event routing coordinates", () => {
    const map = parseTiledTownMap(readTownMapFixture());

    if (map === undefined) {
      throw new Error("town-v1.tiled.json did not parse");
    }

    for (const location of map.locations) {
      const routingCoordinates = LOCATION_COORDINATES[location.locationId];

      expect(location.anchorX).toBe(routingCoordinates.x);
      expect(location.anchorY).toBe(routingCoordinates.y);
    }
  });

  it("rejects maps that do not preserve stable location ids", () => {
    const input = readTownMapFixture();

    if (typeof input !== "object" || input === null || !("layers" in input)) {
      throw new Error("town map fixture shape changed");
    }

    const invalidMap = {
      ...input,
      layers: [],
    };

    expect(parseTiledTownMap(invalidMap)).toBeUndefined();
  });
});
