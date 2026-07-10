import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";
import {
  runWorldMemoryProviderLoopFromJsonl,
  type WorldMemoryProviderLoopRunSummary,
} from "../server/worldMemoryProviderLoopRunner";

const now = "2026-07-04T21:00:00.000Z";
const savedAt = "2026-07-04T20:55:00.000Z";

async function withTempDirectory<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-provider-runner-"));

  try {
    return await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function writeJsonlFile(
  filePath: string,
  events = mockSmallvilleRoutineRun.slice(0, 30),
): Promise<void> {
  await writeFile(
    filePath,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8",
  );
}

describe("world memory provider loop runner", () => {
  it("runs a JSONL external sender into the world-memory provider loop without an API key", async () => {
    await withTempDirectory(async (directory) => {
      const inputPath = join(directory, "runtime-events.jsonl");
      const memoryFilePath = join(directory, "world-memory.json");
      const outputPath = join(directory, "summary.json");
      let providerCalled = false;
      const fetchImpl: OpenAiResponsesFetch = async () => {
        providerCalled = true;
        throw new Error("provider should not be called without an API key");
      };

      await writeJsonlFile(inputPath);

      const result = await runWorldMemoryProviderLoopFromJsonl({
        fetchImpl,
        inputPath,
        maxAgents: 2,
        maxMemoryRecords: 8,
        memoryFilePath,
        now,
        outputPath,
        savedAt,
      });
      const savedSummary = JSON.parse(
        await readFile(outputPath, "utf8"),
      ) as WorldMemoryProviderLoopRunSummary;

      expect(providerCalled).toBe(false);
      expect(result.jsonlQuarantinedEvents).toHaveLength(0);
      expect(result.summary).toMatchObject({
        acceptedInputEventCount: 30,
        apiKeyProvided: false,
        inputPath,
        memoryFilePath,
        source: "world-memory-provider-loop",
      });
      expect(result.summary.worldMemoryIngest.incomingRecordCount).toBeGreaterThan(0);
      expect(result.summary.providerRecordCount).toBeGreaterThan(0);
      expect(result.summary.providerRequest.memoryRecordCount).toBeGreaterThan(0);
      expect(result.summary.providerResult).toMatchObject({
        eventCount: 0,
        warningCodes: ["missing_openai_api_key"],
      });
      expect(result.summary.warningCodes).toEqual([
        "persistent_memory_file_missing",
        "missing_openai_api_key",
      ]);
      expect(savedSummary).toEqual(result.summary);
      expect(JSON.stringify(savedSummary)).not.toContain("test-api-key");
    });
  });

  it("quarantines malformed JSONL while still sending valid events", async () => {
    await withTempDirectory(async (directory) => {
      const inputPath = join(directory, "runtime-events.jsonl");
      const memoryFilePath = join(directory, "world-memory.json");

      await writeFile(
        inputPath,
        [
          JSON.stringify(mockSmallvilleRoutineRun[0]),
          "{not-json",
          JSON.stringify(mockSmallvilleRoutineRun[1]),
        ].join("\n"),
        "utf8",
      );

      const result = await runWorldMemoryProviderLoopFromJsonl({
        inputPath,
        memoryFilePath,
        now,
        savedAt,
      });

      expect(result.summary.acceptedInputEventCount).toBe(2);
      expect(result.summary.jsonlQuarantineCodes).toEqual(["invalid_json"]);
      expect(result.summary.providerRequest.memoryRecordCount).toBeGreaterThan(0);
      expect(result.summary.providerResult.warningCodes).toEqual([
        "missing_openai_api_key",
      ]);
    });
  });

  it("can run the sender with a mock provider response", async () => {
    await withTempDirectory(async (directory) => {
      const inputPath = join(directory, "runtime-events.jsonl");
      const memoryFilePath = join(directory, "world-memory.json");
      const fetchImpl: OpenAiResponsesFetch = async (_input, init) => {
        const body = JSON.parse(init.body ?? "{}") as {
          metadata?: { request_id?: string };
        };

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            JSON.stringify({
              id: "resp_provider_runner_unit",
              output_text: JSON.stringify({
                generatedAt: now,
                requestId: body.metadata?.request_id,
                runId: "run-provider-runner-unit",
                steps: [
                  {
                    agentId: "agent-isabella",
                    agentName: "Isabella",
                    agentRole: "planner",
                    content:
                      "Isabella turns external runtime memory into a next provider-backed plan.",
                    locationHint: "archive",
                    status: "running",
                    summary: "Plan from external runtime memory",
                    type: "decision",
                  },
                ],
                taskId: "task-provider-runner-unit",
              }),
            }),
        };
      };

      await writeJsonlFile(inputPath);

      const result = await runWorldMemoryProviderLoopFromJsonl({
        apiKey: "test-api-key",
        fetchImpl,
        inputPath,
        maxAgents: 2,
        maxMemoryRecords: 8,
        memoryFilePath,
        now,
        savedAt,
      });

      expect(result.summary.apiKeyProvided).toBe(true);
      expect(result.summary.providerResult).toMatchObject({
        eventCount: 1,
        warningCodes: ["openai_responses_provider_call"],
      });
      expect(result.loopResult.providerResult.events[0]).toMatchObject({
        agentId: "agent-isabella",
        type: "decision",
      });
      expect(JSON.stringify(result.summary)).not.toContain("test-api-key");
    });
  });
});
