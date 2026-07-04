import { describe, expect, it } from "vitest";

import {
  mockSmallvilleCognitiveRun,
  mockSmallvilleRoutineRun,
  mockSmallvilleSocialRun,
  retrieveMemories,
  scoreMemoryRecord,
  summarizeRoutineDay,
  summarizeSocialDiffusion,
  type MemoryRecord,
} from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import { validateEventStream } from "../events/validators";

const memoryFixture: MemoryRecord[] = [
  {
    id: "old-important",
    agentId: "agent-test",
    content: "Smallville reflection requires a memory stream and planning loop.",
    createdAtSequence: 0,
    importance: 10,
    kind: "observation",
    lastAccessedSequence: 0,
    tags: ["smallville", "reflection", "planning"],
  },
  {
    id: "recent-irrelevant",
    agentId: "agent-test",
    content: "The town fountain was repainted yesterday.",
    createdAtSequence: 20,
    importance: 3,
    kind: "observation",
    lastAccessedSequence: 20,
    tags: ["decor"],
  },
  {
    id: "recent-relevant",
    agentId: "agent-test",
    content: "Browser evidence should show planning and memory retrieval.",
    createdAtSequence: 21,
    importance: 7,
    kind: "reflection",
    lastAccessedSequence: 21,
    tags: ["evidence", "planning", "memory"],
  },
];

describe("deterministic generative runtime", () => {
  it("scores memory with relevance, importance, and recency components", () => {
    const scored = scoreMemoryRecord(
      memoryFixture[0],
      "smallville memory planning",
      24,
    );

    expect(scored.memoryId).toBe("old-important");
    expect(scored.relevanceScore).toBeGreaterThan(0);
    expect(scored.importanceScore).toBe(1);
    expect(scored.recencyScore).toBeGreaterThan(0);
    expect(scored.score).toBeGreaterThan(0.5);
  });

  it("retrieves the most relevant memories deterministically", () => {
    const retrieved = retrieveMemories(memoryFixture, "smallville memory planning", 24, 2);

    expect(retrieved.map((memory) => memory.memoryId)).toEqual([
      "old-important",
      "recent-relevant",
    ]);
    expect(retrieved[0]?.score).toBeGreaterThanOrEqual(retrieved[1]?.score ?? 0);
  });

  it("generates a canonical cognitive AgentEvent run", () => {
    const validation = validateEventStream(mockSmallvilleCognitiveRun);

    expect(validation.quarantinedEvents).toHaveLength(0);
    expect(validation.events).toHaveLength(30);
    expect(validation.events[0]?.metadata?.cognitiveStage).toBe("observation");
    expect(
      validation.events.some((event) => event.metadata?.cognitiveStage === "retrieval"),
    ).toBe(true);
    expect(
      validation.events.some((event) => event.metadata?.cognitiveStage === "reflection"),
    ).toBe(true);
    expect(
      validation.events.some((event) => event.metadata?.cognitiveStage === "planning"),
    ).toBe(true);
    expect(
      validation.events.some((event) => event.metadata?.cognitiveStage === "action"),
    ).toBe(true);
  });

  it("replays the cognitive run without renderer-owned facts", () => {
    const state = replay(mockSmallvilleCognitiveRun, mockSmallvilleCognitiveRun.length - 1);

    expect(state.warnings).toHaveLength(0);
    expect(state.runSummary).toMatchObject({
      totalEvents: 30,
      memoryActionCount: 10,
      toolCallCount: 3,
      handoffCount: 1,
      blockedCount: 0,
      errorCount: 0,
    });
    expect(Object.values(state.agents).every((agent) => agent.status === "done")).toBe(true);
    expect(state.agents["agent-mei"]?.subLocationId).toBe("square_fountain_edge");
  });

  it("keeps retrieval evidence inspectable in event metadata", () => {
    const retrievalEvent = mockSmallvilleCognitiveRun.find(
      (event) => event.metadata?.cognitiveStage === "retrieval",
    );

    expect(retrievalEvent).toBeDefined();
    expect(retrievalEvent?.metadata?.retrievalQuery).toBe("smallville evidence memory planning review");
    expect(retrievalEvent?.metadata?.retrievedMemories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memoryId: expect.any(String),
          score: expect.any(Number),
          relevanceScore: expect.any(Number),
          recencyScore: expect.any(Number),
          importanceScore: expect.any(Number),
        }),
      ]),
    );
  });

  it("generates a 25-agent Smallville-style social diffusion run", () => {
    const validation = validateEventStream(mockSmallvilleSocialRun);
    const agentIds = new Set(validation.events.map((event) => event.agentId));
    const summary = summarizeSocialDiffusion(validation.events);

    expect(validation.quarantinedEvents).toHaveLength(0);
    expect(validation.events).toHaveLength(150);
    expect(agentIds.size).toBe(25);
    expect(summary.agentCount).toBe(25);
    expect(summary.invitationMessageCount).toBe(25);
    expect(summary.maxWave).toBe(4);
  });

  it("keeps social diffusion replay deterministic and warning-free", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);

    expect(state.warnings).toHaveLength(0);
    expect(state.runSummary).toMatchObject({
      totalEvents: 150,
      memoryActionCount: 50,
      blockedCount: 0,
      errorCount: 0,
    });
    expect(Object.keys(state.agents)).toHaveLength(25);
    expect(Object.values(state.agents).every((agent) => agent.status === "done")).toBe(true);
    expect(state.agents["agent-diego"]?.subLocationId).toBe("square_fountain_edge");
  });

  it("keeps the user intervention and invitation path inspectable", () => {
    const firstEvent = mockSmallvilleSocialRun[0];
    const messageEvents = mockSmallvilleSocialRun.filter((event) => event.type === "message");

    expect(firstEvent?.metadata?.intervention).toMatchObject({
      source: "user",
      prompt: "Isabella wants to host a Valentine's gathering.",
    });
    expect(firstEvent?.metadata?.socialDiffusion).toMatchObject({
      eventId: "valentine-party",
      wave: 0,
      knowsParty: true,
    });
    expect(messageEvents).toHaveLength(25);
    expect(
      messageEvents.every((event) => typeof event.targetAgentId === "string"),
    ).toBe(true);
    expect(
      messageEvents.every((event) =>
        Array.isArray(event.metadata?.relationships) &&
        event.metadata.relationships.includes(event.targetAgentId),
      ),
    ).toBe(true);
    expect(
      messageEvents.some((event) => event.targetAgentId === "agent-isabella"),
    ).toBe(true);
  });

  it("generates a 25-agent routine day with memory and schedule evidence", () => {
    const validation = validateEventStream(mockSmallvilleRoutineRun);
    const agentIds = new Set(validation.events.map((event) => event.agentId));
    const summary = summarizeRoutineDay(validation.events);

    expect(validation.quarantinedEvents).toHaveLength(0);
    expect(validation.events).toHaveLength(150);
    expect(agentIds.size).toBe(25);
    expect(summary.agentCount).toBe(25);
    expect(summary.actionCount).toBe(25);
    expect(summary.memoryReadCount).toBe(25);
    expect(summary.memoryWriteCount).toBe(50);
    expect(summary.conflictCount).toBeGreaterThan(0);
    expect(summary.phaseCounts).toEqual({
      wake: 25,
      retrieve: 25,
      work: 25,
      plan: 25,
      act: 25,
      close: 25,
    });
  });

  it("keeps routine conflicts inspectable and replay-safe", () => {
    const conflictEvents = mockSmallvilleRoutineRun.filter(
      (event) => event.metadata?.routineConflict !== undefined,
    );
    const state = replay(mockSmallvilleRoutineRun, mockSmallvilleRoutineRun.length - 1);

    expect(conflictEvents.length).toBeGreaterThan(0);
    expect(
      conflictEvents.every((event) =>
        event.type === "blocked" &&
        event.metadata?.routine !== undefined &&
        event.metadata?.cognitiveStage === "reflection",
      ),
    ).toBe(true);
    expect(state.warnings).toHaveLength(0);
    expect(state.runSummary).toMatchObject({
      totalEvents: 150,
      memoryActionCount: 75,
      blockedCount: conflictEvents.length,
      errorCount: 0,
    });
    expect(Object.keys(state.agents)).toHaveLength(25);
    expect(Object.values(state.agents).every((agent) => agent.status === "done")).toBe(true);
    expect(state.agents["agent-diego"]?.subLocationId).toBe("square_fountain_edge");
  });

  it("keeps every routine event tied to AgentEvent-owned location metadata", () => {
    expect(
      mockSmallvilleRoutineRun.every((event) => {
        const routine = event.metadata?.routine;

        return (
          typeof routine === "object" &&
          routine !== null &&
          !Array.isArray(routine) &&
          typeof (routine as Record<string, unknown>).scheduledLocation === "string" &&
          typeof (routine as Record<string, unknown>).scheduledSubLocationId === "string" &&
          (routine as Record<string, unknown>).scheduledSubLocationId ===
            event.metadata?.subLocationId
        );
      }),
    ).toBe(true);
  });
});
