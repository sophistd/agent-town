import { describe, expect, it } from "vitest";

import { mockSmallvilleCognitiveRun } from "../events/generativeRuntime";
import { invalidEvents } from "../events/invalidEvents";
import { mockEvents } from "../events/mockEvents";
import { replayValidated } from "../events/reducer";
import { validateAgentEvent, validateEventStream } from "../events/validators";

describe("event validators", () => {
  it("accepts canonical mock events", () => {
    const result = validateEventStream(mockEvents);

    expect(result.events).toHaveLength(mockEvents.length);
    expect(result.quarantinedEvents).toHaveLength(0);
  });

  it("accepts cognitive runtime events with rich metadata", () => {
    const result = validateEventStream(mockSmallvilleCognitiveRun);

    expect(result.events).toHaveLength(mockSmallvilleCognitiveRun.length);
    expect(result.quarantinedEvents).toHaveLength(0);
  });

  it("quarantines invalid fixtures without throwing", () => {
    for (const fixture of invalidEvents) {
      const result = validateAgentEvent(fixture.input);

      expect(result.ok, fixture.name).toBe(false);
    }
  });

  it("quarantines duplicate run sequence while keeping playable events", () => {
    const duplicate = { ...mockEvents[1], id: "happy-duplicate-sequence" };
    const result = validateEventStream([mockEvents[0], mockEvents[1], duplicate]);

    expect(result.events).toHaveLength(2);
    expect(result.quarantinedEvents).toHaveLength(1);
    expect(result.quarantinedEvents[0]?.issues[0]?.path).toBe("sequence");
  });

  it("replays valid events and carries quarantine evidence forward", () => {
    const state = replayValidated(
      [mockEvents[0], invalidEvents[0]?.input, mockEvents[1], mockEvents[2]],
      2,
    );

    expect(state.runSummary.totalEvents).toBe(3);
    expect(state.quarantinedEvents).toHaveLength(1);
    expect(state.currentEventId).toBe("happy-002");
  });
});
