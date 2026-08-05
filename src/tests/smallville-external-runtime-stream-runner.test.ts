import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import {
  runSmallvilleExternalRuntimeStream,
  type SmallvilleExternalRuntimeStreamSummary,
} from "../server/smallvilleExternalRuntimeStreamRunner";

const startTimestamp = "2026-07-04T22:00:00.000Z";

async function withTempDirectory<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-runtime-stream-"));

  try {
    return await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

describe("smallville external runtime stream runner", () => {
  it("streams runtime ticks through the live provider-loop route without an API key", async () => {
    await withTempDirectory(async (directory) => {
      const memoryFilePath = join(directory, "world-memory.json");
      const outputPath = join(directory, "summary.json");
      const eventLogPath = join(directory, "events.jsonl");
      let providerCalled = false;
      const fetchImpl: OpenAiResponsesFetch = async () => {
        providerCalled = true;
        throw new Error("provider should not be called without an API key");
      };

      const result = await runSmallvilleExternalRuntimeStream({
        batchSize: 10,
        eventLogPath,
        fetchImpl,
        maxAgents: 2,
        maxEvents: 30,
        maxMemoryRecords: 8,
        memoryFilePath,
        outputPath,
        scenario: "social",
        startTimestamp,
      });
      const savedSummary = JSON.parse(
        await readFile(outputPath, "utf8"),
      ) as SmallvilleExternalRuntimeStreamSummary;
      const eventLog = await readFile(eventLogPath, "utf8");

      expect(providerCalled).toBe(false);
      expect(result.summary).toMatchObject({
        apiKeyProvided: false,
        batchSize: 10,
        emittedEventCount: 30,
        eventLogPath,
        memoryFilePath,
        outputPath,
        scenario: "social",
        source: "smallville-external-runtime-stream",
        startTimestamp,
        tickCount: 3,
      });
      expect(result.emittedEvents.every((event) => event.metadata?.source === "custom")).toBe(
        true,
      );
      expect(result.emittedEvents[0]?.metadata?.externalRuntime).toMatchObject({
        originalEventId: expect.any(String),
        scenario: "social",
        stream: "smallville-external-runtime-stream",
      });
      expect(result.summary.totals.acceptedInputEventCount).toBe(30);
      expect(result.summary.totals.finalPersistedRecordCount).toBeGreaterThan(0);
      expect(result.summary.totals.memoryPlanEventCount).toBeGreaterThan(0);
      expect(result.summary.totals.providerEventCount).toBe(0);
      expect(result.summary.warningCodes).toContain("missing_openai_api_key");
      expect(result.summary.ticks).toHaveLength(3);
      expect(
        result.summary.ticks.every(
          (tick) => tick.providerResult.warningCodes[0] === "missing_openai_api_key",
        ),
      ).toBe(true);
      expect(savedSummary).toEqual(result.summary);
      expect(eventLog.trim().split("\n")).toHaveLength(30);
      expect(JSON.stringify(savedSummary)).not.toContain("test-api-key");
    });
  });

  it("returns provider events for each runtime tick through the parser path", async () => {
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
              id: `resp_external_runtime_${providerCallCount}`,
              output_text: JSON.stringify({
                generatedAt: startTimestamp,
                requestId: body.metadata?.request_id,
                runId: "run-external-runtime-provider-unit",
                steps: [
                  {
                    agentId: "agent-isabella",
                    agentName: "Isabella",
                    agentRole: "planner",
                    content: `Isabella plans from external runtime tick ${providerCallCount}.`,
                    locationHint: "archive",
                    status: "running",
                    summary: "Plan from external runtime tick",
                    type: "decision",
                  },
                ],
                taskId: "task-external-runtime-provider-unit",
              }),
            }),
        };
      };

      const result = await runSmallvilleExternalRuntimeStream({
        apiKey: "test-api-key",
        batchSize: 8,
        fetchImpl,
        maxAgents: 2,
        maxEvents: 16,
        maxMemoryRecords: 8,
        memoryFilePath,
        scenario: "routine",
        startTimestamp,
      });

      expect(providerCallCount).toBe(2);
      expect(result.summary.apiKeyProvided).toBe(true);
      expect(result.summary.tickCount).toBe(2);
      expect(result.summary.totals.providerEventCount).toBe(2);
      expect(
        result.providerLoopResults.flatMap((providerLoopResult) =>
          providerLoopResult.events.map((event) => event.type),
        ),
      ).toEqual(["decision", "decision"]);
      expect(
        result.summary.ticks.every((tick) =>
          tick.providerResult.warningCodes.includes("openai_responses_provider_call"),
        ),
      ).toBe(true);
      expect(JSON.stringify(result.summary)).not.toContain("test-api-key");
    });
  });
});
