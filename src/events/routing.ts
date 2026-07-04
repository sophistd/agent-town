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
  town_hall: { x: 240, y: 160 },
  library: { x: 520, y: 160 },
  workshop: { x: 520, y: 360 },
  archive: { x: 240, y: 360 },
  review_room: { x: 760, y: 260 },
  dispatch_board: { x: 400, y: 80 },
  square: { x: 400, y: 260 },
  unknown: { x: 80, y: 80 },
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
