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

const expectedLocationIds: RenderedLocationId[] = [
  "dispatch_board",
  "town_hall",
  "library",
  "archive",
  "square",
  "workshop",
  "review_room",
];

function readTownMapFixture(): unknown {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "public/maps/town-v1.tiled.json"),
      "utf8",
    ),
  ) as unknown;
}

describe("town map asset", () => {
  it("parses the public Tiled-compatible map with every stable projection zone", () => {
    const map = parseTiledTownMap(readTownMapFixture());

    expect(map).toBeDefined();
    expect(map?.source).toBe("asset");
    expect(map === undefined ? [] : getTownMapLocationIds(map)).toEqual(expectedLocationIds);
    expect(map === undefined ? false : hasCompleteTownMapLocations(map)).toBe(true);
    expect(map?.routes).toHaveLength(6);
    expect(map?.decor.length).toBeGreaterThan(DEFAULT_TOWN_MAP.decor.length);
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
