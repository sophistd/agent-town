import { AGENT_EVENT_TYPES, AGENT_LOCATIONS } from "./constants";
import type { AgentEvent, AgentEventType, AgentLocation } from "./types";

export type Coordinates = {
  x: number;
  y: number;
};

type RoutableEvent = Partial<Omit<AgentEvent, "type" | "locationHint">> & {
  type?: unknown;
  locationHint?: unknown;
};

export const LOCATION_COORDINATES: Record<AgentLocation, Coordinates> = {
  town_hall: { x: 120, y: 96 },
  library: { x: 320, y: 88 },
  workshop: { x: 520, y: 132 },
  archive: { x: 264, y: 280 },
  review_room: { x: 468, y: 292 },
  dispatch_board: { x: 184, y: 216 },
  square: { x: 360, y: 200 },
  unknown: { x: 40, y: 40 },
};

export function isKnownLocation(input: unknown): input is AgentLocation {
  return AGENT_LOCATIONS.includes(input as AgentLocation);
}

export function isKnownEventType(input: unknown): input is AgentEventType {
  return AGENT_EVENT_TYPES.includes(input as AgentEventType);
}

export function getLocationCoordinates(location: AgentLocation): Coordinates {
  return LOCATION_COORDINATES[location];
}

export function getDefaultLocationForEventType(type: unknown): AgentLocation {
  if (!isKnownEventType(type)) {
    return "unknown";
  }

  switch (type) {
    case "thinking":
    case "decision":
      return "town_hall";
    case "message":
      return "square";
    case "tool_call":
      return "workshop";
    case "handoff":
      return "dispatch_board";
    case "memory_read":
    case "memory_write":
      return "archive";
    case "blocked":
    case "error":
      return "review_room";
    case "done":
      return "square";
  }
}

export function routeEventToLocation(event: RoutableEvent): AgentLocation {
  if (!isKnownEventType(event.type)) {
    return "unknown";
  }

  if (isKnownLocation(event.locationHint)) {
    return event.locationHint;
  }

  return getDefaultLocationForEventType(event.type);
}
