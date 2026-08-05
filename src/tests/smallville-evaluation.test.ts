import { describe, expect, it } from "vitest";

import { buildAdaptiveRoutinePlanResult } from "../adapters/adaptiveRoutineAdapter";
import { buildDeterministicLlmPlannerResult } from "../adapters/llmPlannerAdapter";
import {
  mockSmallvilleRoutineRun,
  mockSmallvilleSocialRun,
} from "../events/generativeRuntime";
import { mockFailureRun } from "../events/mockFailureRun";
import { extractPersistentMemoryRecords } from "../events/persistentMemory";
import { replay } from "../events/reducer";
import {
  evaluateSmallvilleRun,
  type SmallvilleBelievabilityCriterion,
  type SmallvilleBelievabilityCriterionKey,
} from "../events/smallvilleEvaluation";

function rubricCriterion(
  criteria: readonly SmallvilleBelievabilityCriterion[],
  key: SmallvilleBelievabilityCriterionKey,
): SmallvilleBelievabilityCriterion {
  const criterion = criteria.find((item) => item.key === key);
  expect(criterion).toBeDefined();

  return criterion as SmallvilleBelievabilityCriterion;
}

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
    expect(
      rubricCriterion(report.humanReviewRubric.criteria, "identity_continuity"),
    ).toMatchObject({ status: "missing", score: 0 });
    expect(
      rubricCriterion(report.humanReviewRubric.criteria, "experience_action_chain"),
    ).toMatchObject({ status: "missing", score: 0 });
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
    const socialRubric = rubricCriterion(
      report.humanReviewRubric.criteria,
      "social_propagation",
    );
    expect(socialRubric).toMatchObject({ status: "passed", score: 4 });
    expect(socialRubric.evidenceAgentIds).toHaveLength(25);
    expect(
      rubricCriterion(report.humanReviewRubric.criteria, "experience_action_chain"),
    ).toMatchObject({ status: "passed", score: 4, evidenceCount: 25 });
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
      rubricCriterion(report.humanReviewRubric.criteria, "routine_continuity"),
    ).toMatchObject({ status: "passed", score: 4, evidenceCount: 6 });
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
    expect(rubricCriterion(report.humanReviewRubric.criteria, "adaptive_response")).toMatchObject({
      status: "passed",
      score: 4,
      evidenceCount: 8,
    });
    expect(report.humanReviewRubric.summary).toContain("human-review criteria");
    expect(
      report.ablationChecks.find((check) => check.component === "LLM planner contract"),
    ).toMatchObject({ status: "passed", evidenceCount: 8 });
  });

  it("recognizes adaptive routine revisions as schedule evidence", () => {
    const result = buildAdaptiveRoutinePlanResult({
      previousEvents: mockSmallvilleRoutineRun,
    });
    const state = replay(result.events, result.events.length - 1);
    const report = evaluateSmallvilleRun(result.events, state);

    expect(report.isSmallvilleLike).toBe(true);
    expect(report.evidenceSummary.adaptiveRoutineRevisionCount).toBe(25);
    expect(
      report.capabilityScores.find((score) => score.key === "adaptive_routine"),
    ).toMatchObject({ status: "passed", score: 100 });
    expect(rubricCriterion(report.humanReviewRubric.criteria, "adaptive_response")).toMatchObject({
      status: "passed",
      score: 4,
    });
    expect(
      report.ablationChecks.find((check) => check.component === "Adaptive routine"),
    ).toMatchObject({ status: "passed", evidenceCount: 25 });
  });
});
