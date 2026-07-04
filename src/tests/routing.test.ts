import { describe, expect, it } from "vitest";

import {
  getDefaultLocationForEventType,
  routeEventToLocation,
} from "../events/routing";
import type { AgentEvent, AgentEventType } from "../events/types";

const eventTypes: Array<[AgentEventType, string]> = [
  ["thinking", "town_hall"],
  ["message", "square"],
  ["tool_call", "workshop"],
  ["handoff", "dispatch_board"],
  ["memory_read", "archive"],
  ["memory_write", "archive"],
  ["decision", "town_hall"],
  ["blocked", "review_room"],
  ["error", "review_room"],
  ["done", "square"],
];

describe("event routing", () => {
  it("maps every event type to a default town location", () => {
    for (const [type, location] of eventTypes) {
      expect(getDefaultLocationForEventType(type)).toBe(location);
    }
  });

  it("uses explicit locationHint when the fixture provides one", () => {
    expect(routeEventToLocation({ type: "tool_call", locationHint: "library" })).toBe(
      "library",
    );
  });

  it("falls back to unknown for unsupported event types", () => {
    const event = { type: "sleeping" } as unknown as AgentEvent;

    expect(routeEventToLocation(event)).toBe("unknown");
  });
});
