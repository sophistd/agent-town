import { describe, expect, it } from "vitest";

import { buildDeterministicLlmPlannerResult } from "../adapters/llmPlannerAdapter";
import {
  mockSmallvilleRoutineRun,
  mockSmallvilleSocialRun,
} from "../events/generativeRuntime";
import { mockFailureRun } from "../events/mockFailureRun";
import { extractPersistentMemoryRecords } from "../events/persistentMemory";
import { replay } from "../events/reducer";
import { evaluateSmallvilleRun } from "../events/smallvilleEvaluation";

describe("Smallville evaluation report", () => {
  it("does not classify the generic failure fixture as Smallville-like", () => {
    const state = replay(mockFailureRun, mockFailureRun.length - 1);
    const report = evaluateSmallvilleRun(mockFailureRun, state);

    expect(report.isSmallvilleLike).toBe(false);
    expect(report.topGaps.map((gap) => gap.key)).toContain("observation");
    expect(report.capabilityScores.find((score) => score.key === "llm_contract")).toMatchObject({
      status: "missing",
      score: 0,
    });
  });

  it("scores the 25-agent social diffusion run with event-derived relationships", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);
    const report = evaluateSmallvilleRun(mockSmallvilleSocialRun, state);

    expect(report.isSmallvilleLike).toBe(true);
    expect(report.evidenceSummary).toMatchObject({
      agentCount: 25,
      eventCount: 150,
      socialInformedAgentCount: 25,
    });
    expect(report.evidenceSummary.relationshipCount).toBeGreaterThanOrEqual(25);
    expect(
      report.capabilityScores.find((score) => score.key === "social_coordination"),
    ).toMatchObject({ status: "passed", score: 100 });
    expect(
      report.capabilityScores.find((score) => score.key === "relationship_graph"),
    ).toMatchObject({ status: "passed", score: 100 });
    expect(report.topGaps.map((gap) => gap.key)).toContain("routine_schedule");
    expect(report.topGaps.map((gap) => gap.key)).toContain("llm_contract");
  });

  it("recognizes routine schedule coverage and routine ablation evidence", () => {
    const state = replay(mockSmallvilleRoutineRun, mockSmallvilleRoutineRun.length - 1);
    const report = evaluateSmallvilleRun(mockSmallvilleRoutineRun, state);

    expect(report.isSmallvilleLike).toBe(true);
    expect(report.evidenceSummary.routinePhaseCount).toBe(6);
    expect(
      report.capabilityScores.find((score) => score.key === "routine_schedule"),
    ).toMatchObject({ status: "passed", score: 100 });
    expect(
      report.ablationChecks.find((check) => check.component === "Routine schedule"),
    ).toMatchObject({ status: "passed", evidenceCount: 6 });
  });

  it("recognizes deterministic LLM planner contract output after replay", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleRoutineRun,
      "2026-07-04T19:10:00.000Z",
    );
    const result = buildDeterministicLlmPlannerResult({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const state = replay(result.events, result.events.length - 1);
    const report = evaluateSmallvilleRun(result.events, state);

    expect(report.isSmallvilleLike).toBe(true);
    expect(
      report.capabilityScores.find((score) => score.key === "llm_contract"),
    ).toMatchObject({ status: "passed", score: 100 });
    expect(
      report.ablationChecks.find((check) => check.component === "LLM planner contract"),
    ).toMatchObject({ status: "passed", evidenceCount: 8 });
  });
});
