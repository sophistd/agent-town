import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import {
  runSmallvilleAutonomousScheduler,
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
});
