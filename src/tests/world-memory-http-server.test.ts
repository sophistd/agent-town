import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import type { AdapterResult } from "../adapters/types";
import type { FileWorldMemoryIngestResult } from "../adapters/worldMemoryRuntime";
import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import {
  startWorldMemoryHttpServer,
  type StartedWorldMemoryHttpServer,
  type WorldMemoryProviderLoopHttpResult,
  type WorldMemoryHttpServerListenOptions,
} from "../server/worldMemoryHttpServer";

const savedAt = "2026-07-04T19:00:00.000Z";

type JsonEnvelope<T> =
  | {
      data: T;
      ok: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      ok: false;
    };

async function readEnvelope<T>(response: Response): Promise<JsonEnvelope<T>> {
  return (await response.json()) as JsonEnvelope<T>;
}

function expectData<T>(envelope: JsonEnvelope<T>): T {
  expect(envelope.ok).toBe(true);

  if (!envelope.ok) {
    throw new Error(envelope.error.message);
  }

  return envelope.data;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<JsonEnvelope<T>> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  return readEnvelope<T>(response);
}

async function withTempWorldMemoryServer<T>(
  run: (input: {
    filePath: string;
    server: StartedWorldMemoryHttpServer;
  }) => Promise<T>,
  options: Partial<WorldMemoryHttpServerListenOptions> = {},
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-world-memory-http-"));
  const server = await startWorldMemoryHttpServer({
    filePath: join(directory, "world-memory.json"),
    host: "127.0.0.1",
    now: () => savedAt,
    port: 0,
    ...options,
  });

  try {
    return await run({
      filePath: join(directory, "world-memory.json"),
      server,
    });
  } finally {
    await server.close();
    await rm(directory, { force: true, recursive: true });
  }
}

describe("world memory HTTP server", () => {
  it("keeps file-backed memory available across ingest, recall, and plan requests", async () => {
    await withTempWorldMemoryServer(async ({ filePath, server }) => {
      const healthResponse = await fetch(`${server.url}/health`);
      const health = expectData<{
        filePath: string;
        service: string;
      }>(await readEnvelope(healthResponse));

      expect(health).toEqual({
        filePath,
        service: "agent-town-world-memory",
      });

      const ingest = expectData<FileWorldMemoryIngestResult>(
        await postJson(`${server.url}/memory/ingest`, {
          events: mockSmallvilleSocialRun,
          savedAt,
        }),
      );

      expect(ingest).toMatchObject({
        acceptedEventCount: 150,
        incomingRecordCount: 50,
        persistedRecordCount: 50,
        source: "memory",
      });
      expect(ingest.quarantinedEvents).toHaveLength(0);

      const recallResponse = await fetch(
        `${server.url}/memory/recall?now=2026-07-04T19:10:00.000Z`,
      );
      const recall = expectData<AdapterResult>(await readEnvelope(recallResponse));

      expect(recall.warnings).toHaveLength(0);
      expect(recall.events).toHaveLength(50);
      expect(recall.events.every((event) => event.type === "memory_read")).toBe(
        true,
      );

      const plan = expectData<AdapterResult>(
        await postJson(`${server.url}/memory/plan`, {
          maxAgents: 25,
          memoriesPerAgent: 3,
          now: "2026-07-04T19:20:00.000Z",
          previousEvents: mockSmallvilleSocialRun,
        }),
      );
      const planState = replay(plan.events, plan.events.length - 1);

      expect(plan.warnings).toHaveLength(0);
      expect(plan.quarantinedEvents).toHaveLength(0);
      expect(plan.events).toHaveLength(75);
      expect(planState.runSummary.memoryActionCount).toBe(25);
    });
  });

  it("quarantines invalid plan context events instead of trusting raw HTTP input", async () => {
    await withTempWorldMemoryServer(async ({ server }) => {
      const validEvent = mockSmallvilleSocialRun[0];

      expectData<FileWorldMemoryIngestResult>(
        await postJson(`${server.url}/memory/ingest`, {
          events: mockSmallvilleSocialRun.slice(0, 12),
          savedAt,
        }),
      );

      const plan = expectData<AdapterResult>(
        await postJson(`${server.url}/memory/plan`, {
          previousEvents: [
            validEvent,
            {
              ...validEvent,
              id: "",
              sequence: 1,
            },
          ],
        }),
      );

      expect(plan.quarantinedEvents).toEqual([
        expect.objectContaining({
          code: "invalid_world_memory_plan_context_event",
          source: "memory",
        }),
      ]);
      expect(plan.events.length).toBeGreaterThan(0);
    });
  });

  it("rejects malformed JSON with an explicit server error response", async () => {
    await withTempWorldMemoryServer(async ({ server }) => {
      const response = await fetch(`${server.url}/memory/ingest`, {
        body: "{",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const envelope = await readEnvelope<never>(response);

      expect(response.status).toBe(400);
      expect(envelope).toEqual({
        error: expect.objectContaining({
          code: "invalid_world_memory_json",
        }),
        ok: false,
      });
    });
  });

  it("accepts live provider-loop HTTP sender events without calling a missing-key provider", async () => {
    let providerCalled = false;
    const fetchImpl: OpenAiResponsesFetch = async () => {
      providerCalled = true;
      throw new Error("provider should not be called without an API key");
    };

    await withTempWorldMemoryServer(
      async ({ server }) => {
        const result = expectData<WorldMemoryProviderLoopHttpResult>(
          await postJson(`${server.url}/provider-loop`, {
            events: mockSmallvilleSocialRun.slice(0, 30),
            maxAgents: 2,
            maxMemoryRecords: 8,
            now: "2026-07-04T19:30:00.000Z",
            savedAt,
          }),
        );

        expect(providerCalled).toBe(false);
        expect(result.events).toHaveLength(0);
        expect(result.recallEvents.length).toBeGreaterThan(0);
        expect(result.memoryPlanEvents.length).toBeGreaterThan(0);
        expect(result.summary).toMatchObject({
          acceptedInputEventCount: 30,
          apiKeyProvided: false,
          source: "world-memory-provider-loop-http",
        });
        expect(result.summary.providerRequest.memoryRecordCount).toBeGreaterThan(0);
        expect(result.summary.providerResult).toMatchObject({
          eventCount: 0,
          warningCodes: ["missing_openai_api_key"],
        });
        expect(result.summary.warningCodes).toEqual([
          "persistent_memory_file_missing",
          "missing_openai_api_key",
        ]);
      },
      {
        providerLoop: {
          fetchImpl,
        },
      },
    );
  });

  it("returns provider events from the live HTTP sender through the parser path", async () => {
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
            id: "resp_world_memory_provider_http_unit",
            output_text: JSON.stringify({
              generatedAt: "2026-07-04T19:35:00.000Z",
              requestId: body.metadata?.request_id,
              runId: "run-world-memory-provider-http-unit",
              steps: [
                {
                  agentId: "agent-isabella",
                  agentName: "Isabella",
                  agentRole: "planner",
                  content:
                    "Isabella turns live HTTP runtime memory into a next plan.",
                  locationHint: "archive",
                  status: "running",
                  summary: "Plan from live HTTP sender memory",
                  type: "decision",
                },
              ],
              taskId: "task-world-memory-provider-http-unit",
            }),
          }),
      };
    };

    await withTempWorldMemoryServer(
      async ({ server }) => {
        const result = expectData<WorldMemoryProviderLoopHttpResult>(
          await postJson(`${server.url}/provider-loop`, {
            events: mockSmallvilleSocialRun.slice(0, 30),
            maxAgents: 2,
            maxMemoryRecords: 8,
            now: "2026-07-04T19:35:00.000Z",
            savedAt,
          }),
        );

        expect(result.events).toHaveLength(1);
        expect(result.events[0]).toMatchObject({
          agentId: "agent-isabella",
          type: "decision",
        });
        expect(result.summary.apiKeyProvided).toBe(true);
        expect(result.summary.providerResult.warningCodes).toEqual([
          "openai_responses_provider_call",
        ]);
        expect(JSON.stringify(result)).not.toContain("test-api-key");
      },
      {
        providerLoop: {
          apiKey: "test-api-key",
          fetchImpl,
          model: "gpt-5.1-mini",
        },
      },
    );
  });

  it("rejects provider-loop API keys in live HTTP request bodies", async () => {
    await withTempWorldMemoryServer(async ({ server }) => {
      const response = await fetch(`${server.url}/provider-loop`, {
        body: JSON.stringify({
          apiKey: "test-api-key",
          events: mockSmallvilleSocialRun.slice(0, 2),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const envelope = await readEnvelope<never>(response);

      expect(response.status).toBe(400);
      expect(envelope).toEqual({
        error: expect.objectContaining({
          code: "world_memory_provider_loop_secret_in_request",
        }),
        ok: false,
      });
    });
  });
});
