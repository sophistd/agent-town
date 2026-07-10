import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import {
  runSmallvilleAutonomousScheduler,
  type SmallvilleAutonomousSchedulerCheckpoint,
  type SmallvilleAutonomousSchedulerSummary,
} from "../server/smallvilleAutonomousSchedulerRunner";

const startTimestamp = "2026-07-05T07:00:00.000Z";

async function withTempDirectory<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-scheduler-"));

  try {
    return await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

describe("smallville autonomous scheduler runner", () => {
  it("runs a bounded world-clock schedule through provider-loop without an API key", async () => {
    await withTempDirectory(async (directory) => {
      const memoryFilePath = join(directory, "world-memory.json");
      const outputPath = join(directory, "summary.json");
      const eventLogPath = join(directory, "events.jsonl");
      let providerCalled = false;
      const fetchImpl: OpenAiResponsesFetch = async () => {
        providerCalled = true;
        throw new Error("provider should not be called without an API key");
      };

      const result = await runSmallvilleAutonomousScheduler({
        eventLogPath,
        eventsPerTick: 6,
        fetchImpl,
        maxAgents: 3,
        maxMemoryRecords: 10,
        memoryFilePath,
        outputPath,
        scheduleId: "unit-day",
        startTimestamp,
        tickCount: 4,
        tickMinutes: 45,
      });
      const savedSummary = JSON.parse(
        await readFile(outputPath, "utf8"),
      ) as SmallvilleAutonomousSchedulerSummary;
      const eventLog = await readFile(eventLogPath, "utf8");

      expect(providerCalled).toBe(false);
      expect(result.summary).toMatchObject({
        apiKeyProvided: false,
        bounded: true,
        emittedEventCount: 24,
        eventLogPath,
        eventsPerTick: 6,
        memoryFilePath,
        outputPath,
        scheduleId: "unit-day",
        source: "smallville-autonomous-scheduler",
        startTimestamp,
        tickCount: 4,
        tickDelayMs: 0,
        tickMinutes: 45,
      });
      expect(result.summary.phaseCounts.morning_routine).toBe(1);
      expect(result.summary.phaseCounts.work_coordination).toBe(1);
      expect(result.summary.phaseCounts.midday_social).toBe(1);
      expect(result.summary.phaseCounts.afternoon_routine).toBe(1);
      expect(result.summary.scenarioCounts.routine).toBe(2);
      expect(result.summary.scenarioCounts.cognitive).toBe(1);
      expect(result.summary.scenarioCounts.social).toBe(1);
      expect(result.summary.totals.acceptedInputEventCount).toBe(24);
      expect(result.summary.totals.finalPersistedRecordCount).toBeGreaterThan(0);
      expect(result.summary.totals.memoryPlanEventCount).toBeGreaterThan(0);
      expect(result.summary.totals.providerEventCount).toBe(0);
      expect(result.summary.warningCodes).toContain("missing_openai_api_key");
      expect(result.summary.ticks).toHaveLength(4);
      expect(result.summary.ticks[0]?.virtualClock).toMatchObject({
        dayIndex: 0,
        minuteOfDay: 420,
        timestamp: startTimestamp,
      });
      expect(
        result.emittedEvents.every((event) => event.metadata?.source === "custom"),
      ).toBe(true);
      expect(result.emittedEvents[0]?.metadata?.scheduler).toMatchObject({
        phase: "morning_routine",
        scheduleId: "unit-day",
        stream: "smallville-autonomous-scheduler",
        tickIndex: 0,
      });
      expect(result.emittedEvents[0]?.metadata?.tags).toContain(
        "autonomous-scheduler",
      );
      expect(savedSummary).toEqual(result.summary);
      expect(eventLog.trim().split("\n")).toHaveLength(24);
      expect(JSON.stringify(savedSummary)).not.toContain("test-api-key");
    });
  });

  it("calls the provider once per scheduler tick when a server-side key is configured", async () => {
    await withTempDirectory(async (directory) => {
      const memoryFilePath = join(directory, "world-memory.json");
      let providerCallCount = 0;
      const fetchImpl: OpenAiResponsesFetch = async (_input, init) => {
        providerCallCount += 1;
        const body = JSON.parse(init.body ?? "{}") as {
          metadata?: { request_id?: string };
        };

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            JSON.stringify({
              id: `resp_scheduler_${providerCallCount}`,
              output_text: JSON.stringify({
                generatedAt: startTimestamp,
                requestId: body.metadata?.request_id,
                runId: "run-smallville-scheduler-provider-unit",
                steps: [
                  {
                    agentId: "agent-isabella",
                    agentName: "Isabella",
                    agentRole: "planner",
                    content: `Isabella adjusts the autonomous schedule at tick ${providerCallCount}.`,
                    locationHint: "town_hall",
                    status: "running",
                    summary: "Provider schedule adjustment",
                    type: "decision",
                  },
                ],
                taskId: "task-smallville-scheduler-provider-unit",
              }),
            }),
        };
      };

      const result = await runSmallvilleAutonomousScheduler({
        apiKey: "test-api-key",
        eventsPerTick: 5,
        fetchImpl,
        maxAgents: 2,
        maxMemoryRecords: 8,
        memoryFilePath,
        scheduleId: "provider-unit-day",
        startTimestamp,
        tickCount: 3,
        tickMinutes: 30,
      });

      expect(providerCallCount).toBe(3);
      expect(result.summary.apiKeyProvided).toBe(true);
      expect(result.summary.tickCount).toBe(3);
      expect(result.summary.totals.providerEventCount).toBe(3);
      expect(
        result.providerLoopResults.flatMap((providerLoopResult) =>
          providerLoopResult.events.map((event) => event.type),
        ),
      ).toEqual(["decision", "decision", "decision"]);
      expect(
        result.summary.ticks.every((tick) =>
          tick.providerResult.warningCodes.includes("openai_responses_provider_call"),
        ),
      ).toBe(true);
      expect(JSON.stringify(result.summary)).not.toContain("test-api-key");
    });
  });

  it("resumes from a checkpoint and preserves cross-run memory continuity", async () => {
    await withTempDirectory(async (directory) => {
      const memoryFilePath = join(directory, "world-memory.json");
      const checkpointPath = join(directory, "checkpoint.json");
      const firstOutputPath = join(directory, "first-summary.json");
      const secondOutputPath = join(directory, "second-summary.json");

      const firstRun = await runSmallvilleAutonomousScheduler({
        checkpointPath,
        eventsPerTick: 6,
        maxAgents: 3,
        maxMemoryRecords: 12,
        memoryFilePath,
        outputPath: firstOutputPath,
        scheduleId: "resume-day",
        startTimestamp,
        tickCount: 2,
        tickMinutes: 45,
      });
      const checkpointAfterFirstRun = JSON.parse(
        await readFile(checkpointPath, "utf8"),
      ) as SmallvilleAutonomousSchedulerCheckpoint;

      expect(firstRun.summary.checkpoint).toMatchObject({
        previousCompletedTickCount: 0,
        resumeRequested: false,
        resumed: false,
        startTickIndex: 0,
        written: true,
      });
      expect(checkpointAfterFirstRun).toMatchObject({
        completedTickCount: 2,
        eventsPerTick: 6,
        nextTickIndex: 2,
        scheduleId: "resume-day",
        source: "smallville-autonomous-scheduler-checkpoint",
        startTimestamp,
        tickMinutes: 45,
      });

      const secondRun = await runSmallvilleAutonomousScheduler({
        checkpointPath,
        maxAgents: 3,
        maxMemoryRecords: 12,
        memoryFilePath,
        outputPath: secondOutputPath,
        resume: true,
        tickCount: 3,
      });
      const checkpointAfterSecondRun = JSON.parse(
        await readFile(checkpointPath, "utf8"),
      ) as SmallvilleAutonomousSchedulerCheckpoint;

      expect(secondRun.summary.checkpoint).toMatchObject({
        previousCompletedTickCount: 2,
        resumeRequested: true,
        resumed: true,
        startTickIndex: 2,
        written: true,
      });
      expect(secondRun.summary.eventsPerTick).toBe(6);
      expect(secondRun.summary.tickMinutes).toBe(45);
      expect(secondRun.summary.ticks.map((tick) => tick.tickIndex)).toEqual([
        2,
        3,
        4,
      ]);
      expect(secondRun.summary.ticks.map((tick) => tick.phase)).toEqual([
        "midday_social",
        "afternoon_routine",
        "evening_reflection",
      ]);
      expect(secondRun.emittedEvents[0]?.sequence).toBe(12);
      expect(
        secondRun.summary.totals.finalPersistedRecordCount,
      ).toBeGreaterThan(firstRun.summary.totals.finalPersistedRecordCount);
      expect(checkpointAfterSecondRun).toMatchObject({
        completedTickCount: 5,
        nextTickIndex: 5,
        scheduleId: "resume-day",
      });
      expect(checkpointAfterSecondRun.lastCompletedTick?.tickIndex).toBe(4);
      expect(JSON.stringify(secondRun.summary)).not.toContain("test-api-key");
    });
  });

  it("stops at a supervised elapsed-time limit after a completed checkpointed tick", async () => {
    await withTempDirectory(async (directory) => {
      const memoryFilePath = join(directory, "world-memory.json");
      const checkpointPath = join(directory, "checkpoint.json");
      const outputPath = join(directory, "summary.json");
      let clockMs = 1_000;
      const nowMs = () => {
        clockMs += 10;

        return clockMs;
      };

      const result = await runSmallvilleAutonomousScheduler({
        checkpointPath,
        eventsPerTick: 4,
        maxAgents: 2,
        maxElapsedMs: 35,
        maxMemoryRecords: 8,
        memoryFilePath,
        nowMs,
        outputPath,
        scheduleId: "elapsed-day",
        startTimestamp,
        tickCount: 10,
        tickMinutes: 30,
      });
      const savedSummary = JSON.parse(
        await readFile(outputPath, "utf8"),
      ) as SmallvilleAutonomousSchedulerSummary;
      const checkpoint = JSON.parse(
        await readFile(checkpointPath, "utf8"),
      ) as SmallvilleAutonomousSchedulerCheckpoint;

      expect(result.summary.tickCount).toBe(2);
      expect(result.summary.emittedEventCount).toBe(8);
      expect(result.summary.supervision).toMatchObject({
        maxElapsedMs: 35,
        requestedTickCount: 10,
        stopReason: "elapsed_time_limit_reached",
      });
      expect(result.summary.supervision.elapsedMs).toBeGreaterThanOrEqual(35);
      expect(result.summary.ticks.map((tick) => tick.tickIndex)).toEqual([0, 1]);
      expect(checkpoint).toMatchObject({
        completedTickCount: 2,
        nextTickIndex: 2,
        scheduleId: "elapsed-day",
      });
      expect(checkpoint.lastCompletedTick?.tickIndex).toBe(1);
      expect(savedSummary).toEqual(result.summary);
    });
  });
});
