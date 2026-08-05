import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import {
  extractProviderRecordsFromRecallEvents,
  runWorldMemoryProviderLoop,
} from "../adapters/worldMemoryProviderLoop";
import type { PersistentMemoryRecord } from "../events/persistentMemory";
import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import {
  startWorldMemoryHttpServer,
  type StartedWorldMemoryHttpServer,
} from "../server/worldMemoryHttpServer";

const now = "2026-07-04T20:00:00.000Z";
const savedAt = "2026-07-04T19:55:00.000Z";

type PlannerPayload = {
  plannerRequest: {
    memory: {
      recordCount: number;
      retrievals: Array<{
        selectedRecordIds: string[];
      }>;
      selectedRecords: PersistentMemoryRecord[];
    };
    requestId: string;
  };
};

function expectRecord(value: unknown): Record<string, unknown> {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
  expect(typeof value).toBe("object");
  expect(Array.isArray(value)).toBe(false);

  return value as Record<string, unknown>;
}

function readPlannerPayload(rawBody: string | undefined): PlannerPayload {
  const body = expectRecord(JSON.parse(rawBody ?? "{}"));
  const input = body.input;

  expect(Array.isArray(input)).toBe(true);

  const userMessage = (input as unknown[])
    .map(expectRecord)
    .find((message) => message.role === "user");
  const content = userMessage?.content;

  expect(Array.isArray(content)).toBe(true);

  const userText = (content as unknown[])
    .map(expectRecord)
    .find((part) => part.type === "input_text")?.text;

  expect(typeof userText).toBe("string");

  return JSON.parse(String(userText)) as PlannerPayload;
}

async function withTempWorldMemoryServer<T>(
  run: (server: StartedWorldMemoryHttpServer) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-provider-loop-"));
  const server = await startWorldMemoryHttpServer({
    filePath: join(directory, "world-memory.json"),
    host: "127.0.0.1",
    now: () => savedAt,
    port: 0,
  });

  try {
    return await run(server);
  } finally {
    await server.close();
    await rm(directory, { force: true, recursive: true });
  }
}

describe("world memory provider loop", () => {
  it("feeds server-backed memory into the provider planner boundary", async () => {
    await withTempWorldMemoryServer(async (server) => {
      let plannerPayload: PlannerPayload | undefined;
      const fetchImpl: OpenAiResponsesFetch = async (_input, init) => {
        plannerPayload = readPlannerPayload(init.body);

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            JSON.stringify({
              id: "resp_world_memory_provider_loop_unit",
              output_text: JSON.stringify({
                generatedAt: now,
                model: "gpt-5.1-mini",
                requestId: plannerPayload?.plannerRequest.requestId,
                runId: "run-world-memory-provider-loop-unit",
                steps: [
                  {
                    agentId: "agent-isabella",
                    agentName: "Isabella",
                    agentRole: "planner",
                    cognitiveStage: "planning",
                    content:
                      "Isabella plans from memory retrieved through the world-memory server.",
                    locationHint: "archive",
                    selectedMemoryRecordIds:
                      plannerPayload?.plannerRequest.memory.selectedRecords
                        .slice(0, 2)
                        .map((record) => record.id) ?? [],
                    status: "running",
                    summary: "Plan from server memory",
                    type: "decision",
                  },
                ],
                taskId: "task-world-memory-provider-loop-unit",
              }),
            }),
        };
      };

      const result = await runWorldMemoryProviderLoop({
        apiKey: "test-api-key",
        events: mockSmallvilleRoutineRun,
        fetchImpl,
        maxAgents: 3,
        maxMemoryRecords: 12,
        model: "gpt-5.1-mini",
        now,
        savedAt,
        worldMemoryBaseUrl: server.url,
      });
      const finalState = replay(result.providerResult.events, 0);

      expect(result.ingestResult).toMatchObject({
        acceptedEventCount: 150,
        incomingRecordCount: 75,
        persistedRecordCount: 75,
      });
      expect(result.recallResult.events).toHaveLength(75);
      expect(result.memoryPlanResult.events.length).toBeGreaterThan(0);
      expect(result.providerRecords.length).toBe(75);
      expect(result.providerRequest.memory.recordCount).toBe(75);
      expect(result.providerRequest.memory.selectedRecords.length).toBeGreaterThan(0);
      expect(
        result.providerRequest.memory.retrievals.some(
          (retrieval) => retrieval.selectedRecordIds.length > 0,
        ),
      ).toBe(true);
      expect(plannerPayload?.plannerRequest.memory.recordCount).toBe(75);
      expect(result.providerResult.quarantinedEvents).toHaveLength(0);
      expect(result.providerResult.events).toHaveLength(1);
      expect(result.providerResult.events[0]).toMatchObject({
        agentId: "agent-isabella",
        type: "decision",
      });
      expect(result.providerResult.warnings).toEqual([
        expect.objectContaining({
          code: "openai_responses_provider_call",
        }),
      ]);
      expect(result.quarantinedEvents).toHaveLength(0);
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: "persistent_memory_file_missing",
        }),
        expect.objectContaining({
          code: "openai_responses_provider_call",
        }),
      ]);
      expect(finalState.warnings).toHaveLength(0);
      expect(finalState.runSummary.totalEvents).toBe(1);
    });
  });

  it("builds server-backed provider request evidence without calling a provider when the key is missing", async () => {
    await withTempWorldMemoryServer(async (server) => {
      let providerCalled = false;
      const fetchImpl: OpenAiResponsesFetch = async () => {
        providerCalled = true;
        throw new Error("provider should not be called without an API key");
      };

      const result = await runWorldMemoryProviderLoop({
        events: mockSmallvilleRoutineRun,
        fetchImpl,
        maxAgents: 2,
        maxMemoryRecords: 8,
        now,
        savedAt,
        worldMemoryBaseUrl: server.url,
      });

      expect(providerCalled).toBe(false);
      expect(result.providerRecords.length).toBeGreaterThan(0);
      expect(result.providerRequest.memory.recordCount).toBeGreaterThan(0);
      expect(result.providerResult.events).toHaveLength(0);
      expect(result.providerResult.warnings).toEqual([
        expect.objectContaining({
          code: "missing_openai_api_key",
        }),
      ]);
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: "persistent_memory_file_missing",
        }),
        expect.objectContaining({
          code: "missing_openai_api_key",
        }),
      ]);
    });
  });

  it("reconstructs provider records from canonical recall events", async () => {
    await withTempWorldMemoryServer(async (server) => {
      const result = await runWorldMemoryProviderLoop({
        events: mockSmallvilleRoutineRun.slice(0, 12),
        maxAgents: 1,
        now,
        savedAt,
        worldMemoryBaseUrl: server.url,
      });
      const records = extractProviderRecordsFromRecallEvents(
        result.recallResult.events,
        savedAt,
      );

      expect(records).toHaveLength(result.providerRecords.length);
      expect(records[0]).toMatchObject({
        content: expect.stringMatching(/Valentine|routine|memory|day/i),
        sourceRunId: "run-smallville-routine-001",
      });
    });
  });
});
