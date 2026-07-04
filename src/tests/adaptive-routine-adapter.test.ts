import { describe, expect, it } from "vitest";

import {
  buildAdaptiveRoutinePlanResult,
  summarizeAdaptiveRoutineRevisions,
} from "../adapters/adaptiveRoutineAdapter";
import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";
import { mockFailureRun } from "../events/mockFailureRun";
import { replay } from "../events/reducer";
import { validateEventStream } from "../events/validators";

describe("adaptive routine adapter", () => {
  it("turns prior routine evidence into canonical revised daily-plan events", () => {
    const result = buildAdaptiveRoutinePlanResult({
      now: "2026-07-04T20:15:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
    });
    const validation = validateEventStream(result.events);
    const summary = summarizeAdaptiveRoutineRevisions(result.events);
    const state = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("custom");
    expect(result.warnings).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(validation.quarantinedEvents).toHaveLength(0);
    expect(result.events).toHaveLength(150);
    expect(summary).toMatchObject({
      agentCount: 25,
      revisionCount: 25,
      observationCount: 25,
      memoryReadCount: 25,
      memoryWriteCount: 50,
      sourceRunIds: ["run-smallville-routine-001"],
    });
    expect(summary.revisedSubLocationIds.length).toBeGreaterThan(1);
    expect(state.warnings).toHaveLength(0);
    expect(state.runSummary).toMatchObject({
      totalEvents: 150,
      memoryActionCount: 75,
      blockedCount: 0,
      errorCount: 0,
    });
    expect(Object.keys(state.agents)).toHaveLength(25);
    expect(Object.values(state.agents).every((agent) => agent.status === "done")).toBe(true);
  });

  it("keeps each revised plan tied to prior routine, observation, and memory evidence", () => {
    const result = buildAdaptiveRoutinePlanResult({
      previousEvents: mockSmallvilleRoutineRun,
    });
    const revisionEvents = result.events.filter(
      (event) => event.metadata?.routineRevision !== undefined,
    );
    const decisionEvents = result.events.filter((event) => event.type === "decision");

    expect(revisionEvents).toHaveLength(result.events.length);
    expect(
      revisionEvents.every((event) => {
        const revision = event.metadata?.routineRevision as Record<string, unknown>;
        const routine = event.metadata?.routine as Record<string, unknown>;

        return (
          revision.previousRunId === "run-smallville-routine-001" &&
          typeof revision.previousEventId === "string" &&
          Array.isArray(revision.previousRoutineEventIds) &&
          Array.isArray(revision.selectedMemoryEventIds) &&
          typeof revision.observationId === "string" &&
          event.metadata?.subLocationId === routine.scheduledSubLocationId &&
          typeof revision.revisedSubLocationId === "string"
        );
      }),
    ).toBe(true);
    expect(
      decisionEvents.every((event) => {
        const planStep = event.metadata?.planStep as Record<string, unknown>;
        const revision = event.metadata?.routineRevision as Record<string, unknown>;

        return planStep.expectedLocation === revision.revisedSubLocationId;
      }),
    ).toBe(true);
  });

  it("uses the deterministic routine seed when the supplied stream has no routine evidence", () => {
    const result = buildAdaptiveRoutinePlanResult({
      previousEvents: mockFailureRun,
    });

    expect(result.events).toHaveLength(150);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "adaptive_routine_default_seed",
        source: "custom",
      }),
    ]);
  });
});
