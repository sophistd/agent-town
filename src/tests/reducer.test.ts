import { describe, expect, it } from "vitest";

import { mockEvents } from "../events/mockEvents";
import { mockFailureRun } from "../events/mockFailureRun";
import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import { mockSmallvilleDayRun } from "../events/mockSmallvilleDayRun";
import { mockStressRun } from "../events/mockStressRun";
import { createInitialWorldState, reduceEvent, replay } from "../events/reducer";
import { LOCATION_COORDINATES } from "../events/routing";
import {
  selectAgentState,
  selectActiveAgentCount,
  selectAgentRelationships,
  selectBlockedEvents,
  selectCurrentEvent,
  selectEdges,
  selectErrorEvents,
  selectFirstBlockedEvent,
  selectFirstErrorEvent,
  selectPreviousEvent,
  selectRelationshipCount,
  selectRelationships,
  selectRunSummary,
  selectSelectedEvent,
  selectTopRelationships,
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
    expect(state.relationships).toEqual({});
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
    expect(selectRelationshipCount(state)).toBe(2);
    expect(state.relationships["agent-coder__agent-planner"]).toMatchObject({
      agentIds: ["agent-coder", "agent-planner"],
      strength: 4,
      interactionCount: 1,
      messageCount: 1,
      handoffCount: 0,
      lastEventId: "unit-message",
      lastInteractionKind: "message",
    });
    expect(state.relationships["agent-planner__agent-reviewer"]).toMatchObject({
      agentIds: ["agent-planner", "agent-reviewer"],
      strength: 3,
      interactionCount: 1,
      messageCount: 0,
      handoffCount: 1,
      lastEventId: "unit-handoff-2",
      lastInteractionKind: "handoff",
    });
  });

  it("derives relationships from metadata and social diffusion evidence", () => {
    const event = eventOf("memory_write", {
      id: "unit-social-evidence",
      metadata: {
        source: "mock",
        relationships: ["agent-coder"],
        socialDiffusion: {
          heardFromAgentId: "agent-memory",
          spreadsToAgentIds: ["agent-reviewer"],
        },
        tags: ["smallville-social", "relationship-proof"],
      },
    });

    const state = reduceEvent(createInitialWorldState("run-unit"), event);

    expect(selectRelationshipCount(state)).toBe(3);
    expect(state.relationships["agent-coder__agent-planner"]).toMatchObject({
      declaredCount: 1,
      diffusionCount: 0,
      lastInteractionKind: "declared",
      strength: 1,
      tags: ["relationship-proof", "smallville-social"],
    });
    expect(state.relationships["agent-memory__agent-planner"]).toMatchObject({
      declaredCount: 0,
      diffusionCount: 1,
      lastInteractionKind: "diffusion",
      strength: 2,
    });
    expect(state.relationships["agent-planner__agent-reviewer"]).toMatchObject({
      diffusionCount: 1,
      evidenceEventIds: ["unit-social-evidence"],
    });
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

  it("projects sub-location and activity metadata into agent state", () => {
    const first = eventOf("thinking", {
      id: "unit-interior-0",
      locationHint: "library",
      metadata: {
        source: "mock",
        subLocationId: "library_stacks",
        activity: "reads stacks",
      },
    });
    const second = eventOf("tool_call", {
      id: "unit-interior-1",
      sequence: 1,
      locationHint: "workshop",
      metadata: {
        source: "mock",
        subLocationId: "workshop_bench",
        activity: "assembles sprites",
      },
    });

    const state = replay([first, second], 1);
    const agent = state.agents["agent-planner"];

    expect(agent?.location).toBe("workshop");
    expect(agent?.subLocationId).toBe("workshop_bench");
    expect(agent?.activity).toBe("assembles sprites");
    expect(agent?.previousX).toBe(LOCATION_COORDINATES.library.x);
    expect(agent?.previousY).toBe(LOCATION_COORDINATES.library.y);
  });

  it("replays happy, failure, Smallville day, and stress fixtures deterministically", () => {
    expect(replay(mockEvents, mockEvents.length - 1)).toEqual(
      replay(mockEvents, mockEvents.length - 1),
    );
    expect(replay(mockFailureRun, mockFailureRun.length - 1)).toEqual(
      replay(mockFailureRun, mockFailureRun.length - 1),
    );
    expect(replay(mockStressRun, mockStressRun.length - 1)).toEqual(
      replay(mockStressRun, mockStressRun.length - 1),
    );
    expect(replay(mockSmallvilleDayRun, mockSmallvilleDayRun.length - 1)).toEqual(
      replay(mockSmallvilleDayRun, mockSmallvilleDayRun.length - 1),
    );
    expect(replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1)).toEqual(
      replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1),
    );
    expect(replay(mockStressRun, mockStressRun.length - 1).runSummary.totalEvents).toBe(200);
  });

  it("keeps the Smallville day run event-driven and warning-free", () => {
    const state = replay(mockSmallvilleDayRun, mockSmallvilleDayRun.length - 1);

    expect(state.runSummary.totalEvents).toBe(37);
    expect(state.warnings).toHaveLength(0);
    expect(Object.keys(state.agents)).toHaveLength(5);
    expect(state.agents["agent-isabella"]).toMatchObject({
      activity: "closes day",
      location: "town_hall",
      status: "done",
      subLocationId: "town_hall_table",
    });
  });

  it("projects the Social day relationship graph as replay-derived WorldState", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);
    const relationships = selectRelationships(state);
    const topRelationships = selectTopRelationships(state, 3);
    const isabellaRelationships = selectAgentRelationships(state, "agent-isabella");

    expect(state.warnings).toHaveLength(0);
    expect(selectRelationshipCount(state)).toBeGreaterThanOrEqual(40);
    expect(relationships[0]?.strength).toBeGreaterThanOrEqual(relationships[1]?.strength ?? 0);
    expect(topRelationships).toHaveLength(3);
    expect(isabellaRelationships.length).toBeGreaterThan(0);
    expect(
      isabellaRelationships.some((relationship) =>
        relationship.agentIds.includes("agent-klaus"),
      ),
    ).toBe(true);
    expect(
      relationships.every((relationship) => relationship.evidenceEventIds.length <= 12),
    ).toBe(true);
  });

  it("selects current, selected, agent, summary, bubbles, edges, relationships, blocked, and error views", () => {
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
    expect(selectRelationshipCount(state)).toBeGreaterThan(0);
    expect(selectTopRelationships(state, 2)).toHaveLength(2);
    expect(selectBlockedEvents(mockFailureRun)).toHaveLength(2);
    expect(selectErrorEvents(mockFailureRun)).toHaveLength(1);
    expect(selectActiveAgentCount(state)).toBe(5);
    expect(selectFirstErrorEvent(mockFailureRun)?.id).toBe("failure-008");
    expect(selectFirstBlockedEvent(mockFailureRun)?.id).toBe("failure-009");
    expect(selectPreviousEvent(mockFailureRun, "failure-008")?.id).toBe("failure-007");
  });
});
