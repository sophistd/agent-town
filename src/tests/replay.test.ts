import { describe, expect, it } from "vitest";

import { mockEvents } from "../events/mockEvents";
import { mockFailureRun } from "../events/mockFailureRun";
import { mockStressRun } from "../events/mockStressRun";
import { replay } from "../events/reducer";
import { clampCursor, getPlaybackEvent } from "../state/playbackStore";

describe("deterministic replay controls", () => {
  it("clamps playback cursors to valid replay positions", () => {
    expect(clampCursor(-10, mockEvents.length)).toBe(0);
    expect(clampCursor(999, mockEvents.length)).toBe(mockEvents.length - 1);
    expect(clampCursor(0, 0)).toBe(-1);
  });

  it("finds the current playback event from the cursor", () => {
    expect(getPlaybackEvent(mockEvents, 0)?.id).toBe("happy-000");
    expect(getPlaybackEvent(mockEvents, 2)?.id).toBe("happy-002");
    expect(getPlaybackEvent(mockEvents, 999)?.id).toBe("happy-024");
  });

  it("reconstructs identical WorldState for repeated jumps to the same index", () => {
    const fixtures = [mockEvents, mockFailureRun, mockStressRun];

    for (const events of fixtures) {
      const cursors = [0, Math.floor(events.length / 2), events.length - 1];

      for (const cursor of cursors) {
        expect(replay(events, cursor)).toEqual(replay(events, cursor));
      }
    }
  });

  it("replays the failure path at the error and repair checkpoints", () => {
    const errorState = replay(mockFailureRun, 8);
    const repairState = replay(mockFailureRun, 14);
    const finalState = replay(mockFailureRun, mockFailureRun.length - 1);

    expect(errorState.currentEventId).toBe("failure-008");
    expect(errorState.agents["agent-coder"]?.status).toBe("error");
    expect(repairState.currentEventId).toBe("failure-014");
    expect(repairState.runSummary.toolCallCount).toBe(4);
    expect(finalState.runSummary).toMatchObject({
      totalEvents: 30,
      blockedCount: 2,
      errorCount: 1,
    });
  });

  it("keeps the 200-event stress replay deterministic and complete", () => {
    const finalStressState = replay(mockStressRun, mockStressRun.length - 1);

    expect(finalStressState.runSummary.totalEvents).toBe(200);
    expect(finalStressState).toEqual(replay(mockStressRun, mockStressRun.length - 1));
  });
});
