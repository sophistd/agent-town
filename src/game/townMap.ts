import { LOCATION_COORDINATES } from "../events/routing";
import type { AgentLocation } from "../events/types";

export const TOWN_MAP_ASSET_URL = "/maps/town-v1.tiled.json";
export const TOWN_MAP_BACKGROUND_KEY = "agent-town:town-v1-preview";
export const TOWN_MAP_BACKGROUND_URL = "/maps/town-v1-preview.png";
export const TOWN_MAP_TILESET_KEY = "agent-town:tileset-v1";
export const TOWN_MAP_TILESET_URL = "/tilesets/agent-town-v1.png";
export const AGENT_SPRITESHEET_KEY = "agent-town:agent-roles-v1";
export const AGENT_SPRITESHEET_URL = "/sprites/agent-roles-v1.png";
export const AGENT_SPRITE_WIDTH = 24;
export const AGENT_SPRITE_HEIGHT = 32;
export const BUILDING_SPRITESHEET_KEY = "agent-town:buildings-v1";
export const BUILDING_SPRITESHEET_URL = "/sprites/buildings-v1.png";
export const BUILDING_SPRITE_WIDTH = 160;
export const BUILDING_SPRITE_HEIGHT = 112;

export type RenderedLocationId = Exclude<AgentLocation, "unknown">;

export type TownTerrainKind = "grass" | "plaza" | "water" | "district";
export type TownDecorKind = "tree" | "lamp" | "bench" | "sign";

export type TownTerrainObject = {
  kind: TownTerrainKind;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TownRouteObject = {
  fromLocationId?: RenderedLocationId;
  toLocationId?: RenderedLocationId;
  points: Array<{ x: number; y: number }>;
};

export type TownLocationObject = {
  locationId: RenderedLocationId;
  label: string;
  projectionRole: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

export type TownDecorObject = {
  kind: TownDecorKind;
  x: number;
  y: number;
};

export type TownTilesetDefinition = {
  firstGid: number;
  name: string;
  image: string;
  imageUrl: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tileCount: number;
};

export type TownTileLayerDefinition = {
  name: string;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  data: number[];
};

export type TownMapDefinition = {
  id: string;
  source: "asset" | "generated-fallback";
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  backgroundImageUrl?: string;
  agentSpritesheetUrl?: string;
  buildingSpritesheetUrl?: string;
  tilesets: TownTilesetDefinition[];
  tileLayers: TownTileLayerDefinition[];
  terrain: TownTerrainObject[];
  routes: TownRouteObject[];
  locations: TownLocationObject[];
  decor: TownDecorObject[];
};

const RENDERED_LOCATION_ORDER: RenderedLocationId[] = [
  "dispatch_board",
  "town_hall",
  "library",
  "archive",
  "square",
  "workshop",
  "review_room",
];

const LOCATION_ID_SET = new Set<AgentLocation>([
  "town_hall",
  "library",
  "workshop",
  "archive",
  "review_room",
  "dispatch_board",
  "square",
]);

const TERRAIN_KINDS = new Set<TownTerrainKind>([
  "grass",
  "plaza",
  "water",
  "district",
]);

const DECOR_KINDS = new Set<TownDecorKind>(["tree", "lamp", "bench", "sign"]);

const fallbackLocationSizes: Record<RenderedLocationId, { width: number; height: number }> = {
  dispatch_board: { width: 158, height: 66 },
  town_hall: { width: 174, height: 98 },
  library: { width: 174, height: 98 },
  archive: { width: 174, height: 98 },
  square: { width: 174, height: 98 },
  workshop: { width: 174, height: 98 },
  review_room: { width: 174, height: 98 },
};

const fallbackProjectionRoles: Record<RenderedLocationId, string> = {
  town_hall: "planning",
  library: "research",
  workshop: "production",
  archive: "memory",
  review_room: "review",
  dispatch_board: "queue",
  square: "final square",
};

const fallbackLabels: Record<RenderedLocationId, string> = {
  town_hall: "Town Hall",
  library: "Library",
  workshop: "Workshop",
  archive: "Archive",
  review_room: "Review Room",
  dispatch_board: "Dispatch Board",
  square: "Square",
};

function createFallbackLocation(locationId: RenderedLocationId): TownLocationObject {
  const coordinates = LOCATION_COORDINATES[locationId];
  const size = fallbackLocationSizes[locationId];

  return {
    locationId,
    label: fallbackLabels[locationId],
    projectionRole: fallbackProjectionRoles[locationId],
    x: coordinates.x - size.width / 2,
    y: coordinates.y - size.height / 2,
    width: size.width,
    height: size.height,
    anchorX: coordinates.x,
    anchorY: coordinates.y,
  };
}

export const DEFAULT_TOWN_MAP: TownMapDefinition = {
  id: "generated-fallback-town",
  source: "generated-fallback",
  width: 1040,
  height: 900,
  tileWidth: 16,
  tileHeight: 16,
  tilesets: [],
  tileLayers: [],
  terrain: [
    { kind: "grass", x: 0, y: 0, width: 1040, height: 900 },
    { kind: "plaza", x: 392, y: 356, width: 226, height: 176 },
    { kind: "water", x: 456, y: 344, width: 98, height: 64 },
  ],
  routes: [
    {
      fromLocationId: "dispatch_board",
      toLocationId: "square",
      points: [LOCATION_COORDINATES.dispatch_board, LOCATION_COORDINATES.square],
    },
    {
      fromLocationId: "square",
      toLocationId: "workshop",
      points: [LOCATION_COORDINATES.square, LOCATION_COORDINATES.workshop],
    },
    {
      fromLocationId: "square",
      toLocationId: "town_hall",
      points: [LOCATION_COORDINATES.square, LOCATION_COORDINATES.town_hall],
    },
    {
      fromLocationId: "square",
      toLocationId: "library",
      points: [LOCATION_COORDINATES.square, LOCATION_COORDINATES.library],
    },
    {
      fromLocationId: "square",
      toLocationId: "archive",
      points: [LOCATION_COORDINATES.square, LOCATION_COORDINATES.archive],
    },
    {
      fromLocationId: "square",
      toLocationId: "review_room",
      points: [LOCATION_COORDINATES.square, LOCATION_COORDINATES.review_room],
    },
  ],
  locations: RENDERED_LOCATION_ORDER.map(createFallbackLocation),
  decor: [
    { kind: "tree", x: 92, y: 190 },
    { kind: "tree", x: 122, y: 740 },
    { kind: "tree", x: 172, y: 112 },
    { kind: "tree", x: 198, y: 808 },
    { kind: "tree", x: 328, y: 120 },
    { kind: "tree", x: 358, y: 750 },
    { kind: "tree", x: 438, y: 780 },
    { kind: "tree", x: 726, y: 146 },
    { kind: "tree", x: 770, y: 754 },
    { kind: "tree", x: 902, y: 210 },
    { kind: "tree", x: 922, y: 694 },
    { kind: "tree", x: 968, y: 374 },
    { kind: "tree", x: 84, y: 476 },
    { kind: "lamp", x: 382, y: 348 },
    { kind: "lamp", x: 620, y: 392 },
    { kind: "lamp", x: 438, y: 590 },
    { kind: "lamp", x: 704, y: 574 },
  ],
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(record: JsonRecord, key: string, fallback = 0): number {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(record: JsonRecord, key: string, fallback = ""): string {
  const value = record[key];

  return typeof value === "string" ? value : fallback;
}

function readProperties(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, unknown>>((properties, item) => {
    if (!isRecord(item)) {
      return properties;
    }

    const name = item.name;
    if (typeof name !== "string") {
      return properties;
    }

    return {
      ...properties,
      [name]: item.value,
    };
  }, {});
}

function readStringProperty(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];

  return typeof value === "string" ? value : undefined;
}

function isRenderedLocationId(value: unknown): value is RenderedLocationId {
  return typeof value === "string" && LOCATION_ID_SET.has(value as AgentLocation);
}

function readObjectLayer(map: JsonRecord, name: string): JsonRecord[] {
  const layers = map.layers;

  if (!Array.isArray(layers)) {
    return [];
  }

  const layer = layers.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.type === "objectgroup" &&
      candidate.name === name,
  );

  if (!isRecord(layer) || !Array.isArray(layer.objects)) {
    return [];
  }

  return layer.objects.filter(isRecord);
}

function readTileLayers(map: JsonRecord): TownTileLayerDefinition[] {
  const layers = map.layers;

  if (!Array.isArray(layers)) {
    return [];
  }

  return layers.flatMap((layer) => {
    if (!isRecord(layer) || layer.type !== "tilelayer" || !Array.isArray(layer.data)) {
      return [];
    }

    const width = readNumber(layer, "width");
    const height = readNumber(layer, "height");
    const data = layer.data.filter(
      (item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 0,
    );

    if (width <= 0 || height <= 0 || data.length !== width * height) {
      return [];
    }

    return [
      {
        name: readString(layer, "name", "tilelayer"),
        width,
        height,
        opacity: readNumber(layer, "opacity", 1),
        visible: layer.visible !== false,
        data,
      },
    ];
  });
}

function normalizePublicAssetPath(image: string): string {
  if (image.startsWith("/")) {
    return image;
  }

  return `/${image.replace(/^\.\.\//, "")}`;
}

function readTilesets(map: JsonRecord): TownTilesetDefinition[] {
  const tilesets = map.tilesets;

  if (!Array.isArray(tilesets)) {
    return [];
  }

  return tilesets.flatMap((tileset) => {
    if (!isRecord(tileset)) {
      return [];
    }

    const image = readString(tileset, "image");
    const firstGid = readNumber(tileset, "firstgid");
    const tileWidth = readNumber(tileset, "tilewidth");
    const tileHeight = readNumber(tileset, "tileheight");
    const columns = readNumber(tileset, "columns");
    const tileCount = readNumber(tileset, "tilecount");

    if (image === "" || firstGid <= 0 || tileWidth <= 0 || tileHeight <= 0) {
      return [];
    }

    return [
      {
        firstGid,
        name: readString(tileset, "name", "tileset"),
        image,
        imageUrl: normalizePublicAssetPath(image),
        tileWidth,
        tileHeight,
        columns,
        tileCount,
      },
    ];
  });
}

function parseTerrainObjects(objects: JsonRecord[]): TownTerrainObject[] {
  return objects.flatMap((object) => {
    const properties = readProperties(object.properties);
    const kind = readStringProperty(properties, "kind");

    if (kind === undefined || !TERRAIN_KINDS.has(kind as TownTerrainKind)) {
      return [];
    }

    const width = readNumber(object, "width");
    const height = readNumber(object, "height");

    if (width <= 0 || height <= 0) {
      return [];
    }

    return [
      {
        kind: kind as TownTerrainKind,
        x: readNumber(object, "x"),
        y: readNumber(object, "y"),
        width,
        height,
      },
    ];
  });
}

function parseRouteObjects(objects: JsonRecord[]): TownRouteObject[] {
  return objects.flatMap((object) => {
    const polyline = object.polyline;

    if (object.type !== "route" || !Array.isArray(polyline)) {
      return [];
    }

    const originX = readNumber(object, "x");
    const originY = readNumber(object, "y");
    const points = polyline
      .filter(isRecord)
      .map((point) => ({
        x: originX + readNumber(point, "x"),
        y: originY + readNumber(point, "y"),
      }));

    if (points.length < 2) {
      return [];
    }

    const properties = readProperties(object.properties);
    const fromLocationId = readStringProperty(properties, "fromLocationId");
    const toLocationId = readStringProperty(properties, "toLocationId");

    return [
      {
        fromLocationId: isRenderedLocationId(fromLocationId) ? fromLocationId : undefined,
        toLocationId: isRenderedLocationId(toLocationId) ? toLocationId : undefined,
        points,
      },
    ];
  });
}

function parseLocationObjects(objects: JsonRecord[]): TownLocationObject[] {
  const locations = objects.flatMap((object) => {
    if (object.type !== "location") {
      return [];
    }

    const properties = readProperties(object.properties);
    const locationId = readStringProperty(properties, "locationId");

    if (!isRenderedLocationId(locationId)) {
      return [];
    }

    const width = readNumber(object, "width");
    const height = readNumber(object, "height");

    if (width <= 0 || height <= 0) {
      return [];
    }

    const x = readNumber(object, "x");
    const y = readNumber(object, "y");

    return [
      {
        locationId,
        label: readString(object, "name", fallbackLabels[locationId]),
        projectionRole:
          readStringProperty(properties, "projectionRole") ?? fallbackProjectionRoles[locationId],
        x,
        y,
        width,
        height,
        anchorX: x + width / 2,
        anchorY: y + height / 2,
      },
    ];
  });

  return RENDERED_LOCATION_ORDER.flatMap((locationId) =>
    locations.find((location) => location.locationId === locationId) ?? [],
  );
}

function parseDecorObjects(objects: JsonRecord[]): TownDecorObject[] {
  return objects.flatMap((object) => {
    const kind = object.type;

    if (typeof kind !== "string" || !DECOR_KINDS.has(kind as TownDecorKind)) {
      return [];
    }

    return [
      {
        kind: kind as TownDecorKind,
        x: readNumber(object, "x"),
        y: readNumber(object, "y"),
      },
    ];
  });
}

export function getTownMapLocationIds(map: TownMapDefinition): RenderedLocationId[] {
  return map.locations.map((location) => location.locationId);
}

export function hasCompleteTownMapLocations(map: TownMapDefinition): boolean {
  const locationIds = new Set(getTownMapLocationIds(map));

  return RENDERED_LOCATION_ORDER.every((locationId) => locationIds.has(locationId));
}

export function parseTiledTownMap(input: unknown): TownMapDefinition | undefined {
  if (!isRecord(input) || input.type !== "map") {
    return undefined;
  }

  const tileWidth = readNumber(input, "tilewidth", DEFAULT_TOWN_MAP.tileWidth);
  const tileHeight = readNumber(input, "tileheight", DEFAULT_TOWN_MAP.tileHeight);
  const width = readNumber(input, "width", DEFAULT_TOWN_MAP.width / tileWidth) * tileWidth;
  const height = readNumber(input, "height", DEFAULT_TOWN_MAP.height / tileHeight) * tileHeight;
  const properties = readProperties(input.properties);
  const id = readStringProperty(properties, "mapId") ?? "town-v1-tiled-map";
  const backgroundImageUrl = readStringProperty(properties, "backgroundImage");
  const agentSpritesheetUrl = readStringProperty(properties, "agentSpritesheet");
  const buildingSpritesheetUrl = readStringProperty(properties, "buildingSpritesheet");
  const tilesets = readTilesets(input);
  const tileLayers = readTileLayers(input);
  const terrain = parseTerrainObjects(readObjectLayer(input, "terrain"));
  const routes = parseRouteObjects(readObjectLayer(input, "routes"));
  const locations = parseLocationObjects(readObjectLayer(input, "locations"));
  const decor = parseDecorObjects(readObjectLayer(input, "decor"));

  if (
    !RENDERED_LOCATION_ORDER.every((locationId) =>
      locations.some((location) => location.locationId === locationId),
    )
  ) {
    return undefined;
  }

  const map: TownMapDefinition = {
    id,
    source: "asset",
    width,
    height,
    tileWidth,
    tileHeight,
    backgroundImageUrl,
    agentSpritesheetUrl,
    buildingSpritesheetUrl,
    tilesets,
    tileLayers,
    terrain: terrain.length > 0 ? terrain : DEFAULT_TOWN_MAP.terrain,
    routes: routes.length > 0 ? routes : DEFAULT_TOWN_MAP.routes,
    locations,
    decor: decor.length > 0 ? decor : DEFAULT_TOWN_MAP.decor,
  };

  return map;
}

export async function loadTownMap(url = TOWN_MAP_ASSET_URL): Promise<TownMapDefinition> {
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return DEFAULT_TOWN_MAP;
    }

    return parseTiledTownMap((await response.json()) as unknown) ?? DEFAULT_TOWN_MAP;
  } catch {
    return DEFAULT_TOWN_MAP;
  }
}
