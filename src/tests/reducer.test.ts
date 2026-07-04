import { describe, expect, it } from "vitest";

import { mockEvents } from "../events/mockEvents";
import { mockFailureRun } from "../events/mockFailureRun";
import { mockStressRun } from "../events/mockStressRun";
import { createInitialWorldState, reduceEvent, replay } from "../events/reducer";
import {
  selectAgentState,
  selectActiveAgentCount,
  selectBlockedEvents,
  selectCurrentEvent,
  selectEdges,
  selectErrorEvents,
  selectFirstBlockedEvent,
  selectFirstErrorEvent,
  selectPreviousEvent,
  selectRunSummary,
  selectSelectedEvent,
  selectVisibleBubbles,
} from "../events/selectors";
import type { AgentEvent, AgentEventType } from "../events/types";

const baseEvent: AgentEvent = {
  id: "unit-000",
  runId: "run-unit",
  taskId: "task-unit",
  timestamp: "2026-07-04T15:00:00.000Z",
  sequence: 0,
  agentId: "agent-planner",
  agentName: "Planner",
  agentRole: "planner",
  type: "thinking",
  content: "Planner thinks through the task.",
  summary: "Thinking",
  locationHint: "town_hall",
  status: "running",
  metadata: { source: "mock" },
};

function eventOf(type: AgentEventType, overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    ...baseEvent,
    id: `unit-${type}`,
    sequence: overrides.sequence ?? baseEvent.sequence,
    type,
    summary: overrides.summary ?? type,
    content: overrides.content ?? `Event ${type}`,
    ...overrides,
  };
}

describe("event reducer", () => {
  it("creates an empty world state for a run", () => {
    const state = createInitialWorldState("run-empty");

    expect(state.runId).toBe("run-empty");
    expect(state.cursor).toBe(-1);
    expect(state.runSummary.totalEvents).toBe(0);
  });

  it("updates status, bubble, and summary for every event type", () => {
    const cases: Array<[AgentEventType, string, string]> = [
      ["thinking", "thinking", "thought"],
      ["message", "talking", "message"],
      ["tool_call", "working", "tool"],
      ["handoff", "walking", "message"],
      ["memory_read", "working", "thought"],
      ["memory_write", "working", "tool"],
      ["decision", "thinking", "thought"],
      ["blocked", "blocked", "error"],
      ["error", "error", "error"],
      ["done", "done", "done"],
    ];

    for (const [type, status, bubbleKind] of cases) {
      const state = reduceEvent(
        createInitialWorldState("run-unit"),
        eventOf(type, {
          targetAgentId:
            type === "message" || type === "handoff" ? "agent-coder" : undefined,
          toolName: type === "tool_call" ? "run_command" : undefined,
          locationHint: undefined,
          status:
            type === "blocked"
              ? "blocked"
              : type === "error"
                ? "failed"
                : type === "done"
                  ? "done"
                  : "running",
        }),
      );

      expect(state.agents["agent-planner"]?.status).toBe(status);
      expect(state.visibleBubbles["agent-planner"]?.kind).toBe(bubbleKind);
      expect(state.runSummary.totalEvents).toBe(1);
    }
  });

  it("adds message and handoff edges", () => {
    const message = eventOf("message", {
      targetAgentId: "agent-coder",
      sequence: 1,
    });
    const handoff = eventOf("handoff", {
      id: "unit-handoff-2",
      targetAgentId: "agent-reviewer",
      sequence: 2,
    });

    const state = replay([message, handoff], 1);

    expect(state.edges).toEqual([
      {
        fromAgentId: "agent-planner",
        toAgentId: "agent-coder",
        eventId: "unit-message",
        kind: "message",
      },
      {
        fromAgentId: "agent-planner",
        toAgentId: "agent-reviewer",
        eventId: "unit-handoff-2",
        kind: "handoff",
      },
    ]);
  });

  it("sorts by sequence and records an ordering warning", () => {
    const unordered = [
      eventOf("done", { id: "unit-002", sequence: 2, status: "done" }),
      eventOf("thinking", { id: "unit-000", sequence: 0 }),
      eventOf("decision", { id: "unit-001", sequence: 1 }),
    ];

    const state = replay(unordered, 2);

    expect(state.currentEventId).toBe("unit-002");
    expect(state.cursor).toBe(2);
    expect(state.warnings.some((warning) => warning.code === "replay_input_out_of_order")).toBe(
      true,
    );
  });

  it("does not crash on unsupported event types", () => {
    const unsupported = {
      ...baseEvent,
      id: "unit-unsupported",
      type: "sleeping",
    } as unknown as AgentEvent;

    expect(() => reduceEvent(createInitialWorldState("run-unit"), unsupported)).not.toThrow();

    const state = reduceEvent(createInitialWorldState("run-unit"), unsupported);
    expect(state.warnings[0]?.code).toBe("unsupported_event_type");
    expect(state.agents["agent-planner"]?.location).toBe("unknown");
  });

  it("replays happy, failure, and stress fixtures deterministically", () => {
    expect(replay(mockEvents, mockEvents.length - 1)).toEqual(
      replay(mockEvents, mockEvents.length - 1),
    );
    expect(replay(mockFailureRun, mockFailureRun.length - 1)).toEqual(
      replay(mockFailureRun, mockFailureRun.length - 1),
    );
    expect(replay(mockStressRun, mockStressRun.length - 1)).toEqual(
      replay(mockStressRun, mockStressRun.length - 1),
    );
    expect(replay(mockStressRun, mockStressRun.length - 1).runSummary.totalEvents).toBe(200);
  });

  it("selects current, selected, agent, summary, bubbles, edges, blocked, and error views", () => {
    const state = replay(mockFailureRun, mockFailureRun.length - 1);

    expect(selectCurrentEvent(state, mockFailureRun)?.id).toBe("failure-029");
    expect(selectSelectedEvent(state, mockFailureRun)?.id).toBe("failure-029");
    expect(selectAgentState(state, "agent-planner")?.status).toBe("done");
    expect(selectRunSummary(state)).toMatchObject({
      totalEvents: 30,
      blockedCount: 2,
      errorCount: 1,
    });
    expect(state.warnings).toHaveLength(0);
    expect(state.quarantinedEvents).toHaveLength(0);
    expect(Object.keys(selectVisibleBubbles(state))).toHaveLength(5);
    expect(selectEdges(state)).toHaveLength(10);
    expect(selectBlockedEvents(mockFailureRun)).toHaveLength(2);
    expect(selectErrorEvents(mockFailureRun)).toHaveLength(1);
    expect(selectActiveAgentCount(state)).toBe(5);
    expect(selectFirstErrorEvent(mockFailureRun)?.id).toBe("failure-008");
    expect(selectFirstBlockedEvent(mockFailureRun)?.id).toBe("failure-009");
    expect(selectPreviousEvent(mockFailureRun, "failure-008")?.id).toBe("failure-007");
  });
});
