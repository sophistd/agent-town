import { describe, expect, it } from "vitest";

import {
  buildDeterministicLlmPlannerResult,
  buildSmallvilleLlmPlannerRequest,
  parseLlmPlannerResponse,
} from "../adapters/llmPlannerAdapter";
import { extractPersistentMemoryRecords } from "../events/persistentMemory";
import { replay } from "../events/reducer";
import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";

const savedAt = "2026-07-04T19:10:00.000Z";
const records = extractPersistentMemoryRecords(mockSmallvilleRoutineRun, savedAt);

describe("llm planner adapter", () => {
  it("builds a model-ready request without giving the renderer runtime facts", () => {
    const request = buildSmallvilleLlmPlannerRequest({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });

    expect(request.constraints.source).toBe("llm");
    expect(request.constraints.allowedEventTypes).toContain("memory_read");
    expect(request.constraints.allowedLocations).toContain("library");
    expect(request.constraints.rules).toContain(
      "The response is accepted only after adapter validation.",
    );
    expect(request.priorRun).toMatchObject({
      eventCount: 150,
      memoryActionCount: 75,
      runId: "run-smallville-routine-001",
    });
    expect(request.agents.length).toBeGreaterThan(0);
    expect(request.memory.selectedRecords.length).toBeGreaterThan(0);
    expect(request.promptHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("turns the deterministic model-shaped response into canonical replayable events", () => {
    const result = buildDeterministicLlmPlannerResult({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("llm");
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.events.map((event) => event.type)).toEqual([
      "memory_read",
      "thinking",
      "decision",
      "message",
      "tool_call",
      "thinking",
      "memory_write",
      "done",
    ]);
    expect(result.events[0]?.metadata?.source).toBe("llm");
    expect(result.events[0]?.metadata?.llmPlanner).toMatchObject({
      contractVersion: 1,
      generatedBy: "deterministic-contract-fixture",
      previousEventCount: 150,
    });
    expect(result.events[3]).toMatchObject({
      type: "message",
      targetAgentId: expect.any(String),
    });
    expect(result.events[4]).toMatchObject({
      toolName: "validate_llm_planner_contract",
      locationHint: "workshop",
    });
    expect(finalState.warnings).toHaveLength(0);
    expect(finalState.runSummary).toMatchObject({
      totalEvents: 8,
      memoryActionCount: 2,
      toolCallCount: 1,
      blockedCount: 0,
      errorCount: 0,
    });
  });

  it("quarantines invalid model JSON without throwing", () => {
    const result = parseLlmPlannerResponse({
      previousEvents: mockSmallvilleRoutineRun,
      records,
      response: "{not json",
    });

    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({
        code: "invalid_llm_planner_json",
        source: "llm",
      }),
    ]);
  });

  it("keeps valid model steps while quarantining invalid AgentEvent mappings", () => {
    const request = buildSmallvilleLlmPlannerRequest({
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const result = parseLlmPlannerResponse({
      request,
      response: {
        requestId: request.requestId,
        runId: "run-llm-partial-unit",
        taskId: "task-llm-partial-unit",
        model: "unit-test-model",
        generatedAt: "2026-07-04T19:00:00.000Z",
        steps: [
          {
            agentId: "agent-isabella",
            agentName: "Isabella",
            agentRole: "planner",
            content: "This message is missing the required target agent.",
            locationHint: "town_hall",
            type: "message",
          },
          {
            agentId: "agent-sam",
            agentName: "Sam",
            agentRole: "reviewer",
            content: "Sam closes the partial model parse.",
            locationHint: "review_room",
            status: "done",
            type: "done",
          },
        ],
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      agentId: "agent-sam",
      type: "done",
    });
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({
        code: "invalid_llm_planner_event",
        source: "llm",
      }),
    ]);
  });
});
