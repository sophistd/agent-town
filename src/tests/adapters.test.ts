import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseNativeJsonl } from "../adapters/jsonlAdapter";
import { parseNaturalLanguageIntervention } from "../adapters/interventionAdapter";
import { callProviderLoopHttp } from "../adapters/providerLoopHttpAdapter";
import {
  connectWebSocketIngest,
  parseWebSocketMessages,
  type WebSocketLike,
} from "../adapters/websocketAdapter";
import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import type { AgentEvent } from "../events/types";
import { replay } from "../events/reducer";

const baseEvent: AgentEvent = {
  id: "jsonl-000",
  runId: "run-jsonl-unit",
  taskId: "task-jsonl-unit",
  timestamp: "2026-07-04T16:00:00.000Z",
  sequence: 0,
  agentId: "agent-planner",
  agentName: "Planner",
  agentRole: "planner",
  type: "thinking",
  content: "Planner imports a saved run.",
  summary: "Import saved run",
  locationHint: "town_hall",
  status: "running",
};

function eventLine(overrides: Partial<AgentEvent> = {}): string {
  return JSON.stringify({ ...baseEvent, ...overrides });
}

describe("jsonl adapter", () => {
  it("parses one native AgentEvent per line and replays the imported run", () => {
    const result = parseNativeJsonl(
      [
        eventLine(),
        eventLine({
          id: "jsonl-001",
          sequence: 1,
          type: "message",
          targetAgentId: "agent-coder",
          content: "Planner sends imported work to Coder.",
        }),
        eventLine({
          id: "jsonl-002",
          sequence: 2,
          agentId: "agent-coder",
          agentName: "Coder",
          agentRole: "coder",
          type: "tool_call",
          toolName: "read_jsonl",
          content: "Coder reads the imported JSONL run.",
        }),
      ].join("\n"),
    );

    expect(result.source).toBe("jsonl");
    expect(result.events).toHaveLength(3);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events[0]?.metadata?.source).toBe("jsonl");
    expect(replay(result.events, result.events.length - 1).currentEventId).toBe("jsonl-002");
  });

  it("preserves existing canonical source metadata", () => {
    const result = parseNativeJsonl(
      eventLine({
        metadata: { source: "codex", rawEventId: "codex-run-1" },
      }),
    );

    expect(result.events[0]?.metadata?.source).toBe("codex");
    expect(result.events[0]?.metadata?.rawEventId).toBe("codex-run-1");
  });

  it("quarantines invalid JSON, missing IDs, duplicate IDs, and duplicate run sequences", () => {
    const result = parseNativeJsonl(
      [
        "{not json",
        JSON.stringify({ ...baseEvent, id: undefined }),
        eventLine(),
        eventLine({ id: "jsonl-000", sequence: 1 }),
        eventLine({ id: "jsonl-duplicate-sequence", sequence: 0 }),
      ].join("\n"),
    );

    expect(result.events).toHaveLength(1);
    expect(result.quarantinedEvents.map((event) => event.code)).toEqual([
      "invalid_json",
      "invalid_agent_event",
      "duplicate_agent_event",
      "duplicate_agent_event",
    ]);
    expect(result.quarantinedEvents.map((event) => event.line)).toEqual([1, 2, 4, 5]);
  });

  it("keeps invalid timestamp events playable and emits a warning", () => {
    const result = parseNativeJsonl(eventLine({ timestamp: "not-a-date" }));

    expect(result.events).toHaveLength(1);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "invalid_timestamp",
        eventId: "jsonl-000",
        line: 1,
      }),
    ]);
  });

  it("imports the sample native JSONL run with stable replay", () => {
    const sample = readFileSync(resolve(process.cwd(), "docs/samples/sample-native.jsonl"), "utf8");
    const result = parseNativeJsonl(sample);
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.events).toHaveLength(25);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(finalState.runSummary.totalEvents).toBe(25);
    expect(finalState).toEqual(replay(result.events, result.events.length - 1));
  });
});

describe("natural-language intervention adapter", () => {
  it("quarantines empty intervention prompts", () => {
    const result = parseNaturalLanguageIntervention({ prompt: "   " });

    expect(result.source).toBe("intervention");
    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({
        code: "invalid_intervention_prompt",
        source: "intervention",
      }),
    ]);
  });

  it("normalizes a user intervention into canonical AgentEvent evidence", () => {
    const result = parseNaturalLanguageIntervention({
      now: "2026-07-04T17:30:00.000Z",
      previousEvents: mockSmallvilleSocialRun,
      prompt:
        "Move the Valentine's gathering to the library reading nook and ask Mei to preserve the memory.",
    });
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("intervention");
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events).toHaveLength(8);
    expect(result.events.map((event) => event.type)).toEqual([
      "memory_write",
      "memory_read",
      "thinking",
      "decision",
      "message",
      "tool_call",
      "done",
      "done",
    ]);
    expect(result.events[0]?.metadata?.source).toBe("intervention");
    expect(result.events[0]?.metadata?.intervention).toMatchObject({
      source: "user",
      intentId: "memory_update",
      previousRunId: "run-smallville-social-001",
      previousEventCount: 150,
      previousMemoryActionCount: 50,
      previousAgentCount: 25,
      targetLocation: "library",
      targetSubLocationId: "library_reading_nook",
      generatedBy: "deterministic-intervention-adapter",
    });
    expect(result.events[4]).toMatchObject({
      type: "message",
      targetAgentId: "agent-isabella",
    });
    expect(result.events[5]).toMatchObject({
      agentId: "agent-isabella",
      locationHint: "library",
      metadata: expect.objectContaining({
        subLocationId: "library_reading_nook",
      }),
      toolName: "apply_natural_language_intervention",
    });
    expect(finalState.warnings).toHaveLength(0);
    expect(finalState.runSummary).toMatchObject({
      totalEvents: 8,
      memoryActionCount: 2,
      toolCallCount: 1,
      blockedCount: 0,
      errorCount: 0,
    });
  });
});

describe("websocket adapter", () => {
  it("parses native AgentEvent messages into the reducer path", () => {
    const result = parseWebSocketMessages(
      JSON.stringify({
        ...baseEvent,
        id: "ws-native-000",
        metadata: { rawEventId: "socket-0" },
      }),
    );

    expect(result.source).toBe("websocket");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.metadata?.source).toBe("websocket");
    expect(result.events[0]?.metadata?.transport).toBe("websocket");
    expect(result.events[0]?.metadata?.rawEventId).toBe("socket-0");
    expect(replay(result.events, 0).currentEventId).toBe("ws-native-000");
  });

  it("normalizes websocket source events before validation", () => {
    const result = parseWebSocketMessages({
      agent: { id: "agent-coder", name: "Coder", role: "coder" },
      eventType: "tool_call",
      id: "ws-source-001",
      locationHint: "workshop",
      message: "Coder handles a live source event.",
      metadata: { traceId: "trace-live-1" },
      runId: "run-websocket-unit",
      sequence: 0,
      status: "running",
      taskId: "task-websocket-unit",
      timestamp: "2026-07-04T16:01:00.000Z",
      tool: { input: { message: 1 }, name: "socket_read", outputSummary: "ok" },
    });

    expect(result.events).toHaveLength(1);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events[0]).toMatchObject({
      agentId: "agent-coder",
      agentName: "Coder",
      agentRole: "coder",
      content: "Coder handles a live source event.",
      id: "ws-source-001",
      toolName: "socket_read",
      type: "tool_call",
    });
    expect(result.events[0]?.metadata?.source).toBe("websocket");
    expect(result.events[0]?.metadata?.traceId).toBe("trace-live-1");
  });

  it("quarantines invalid websocket messages and duplicate batch events", () => {
    const result = parseWebSocketMessages([
      "{not json",
      JSON.stringify({ ...baseEvent, id: undefined }),
      JSON.stringify({ ...baseEvent, id: "ws-duplicate-000" }),
      JSON.stringify({ ...baseEvent, id: "ws-duplicate-000", sequence: 1 }),
      JSON.stringify({ ...baseEvent, id: "ws-duplicate-sequence", sequence: 0 }),
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.quarantinedEvents.map((event) => event.code)).toEqual([
      "invalid_json",
      "invalid_agent_event",
      "duplicate_agent_event",
      "duplicate_agent_event",
    ]);
  });

  it("routes live socket messages through the parser", () => {
    const listeners = new Map<string, (event: Event | MessageEvent) => void>();
    const results: ReturnType<typeof parseWebSocketMessages>[] = [];
    const statuses: string[] = [];
    const socket: WebSocketLike = {
      addEventListener(type, listener) {
        listeners.set(type, listener as (event: Event | MessageEvent) => void);
      },
      close() {
        listeners.get("close")?.(new Event("close"));
      },
    };

    const connection = connectWebSocketIngest({
      onResult: (result) => results.push(result),
      onStatus: (status) => statuses.push(status.status),
      socketFactory: () => socket,
      url: "ws://localhost:8765/events",
    });

    listeners.get("open")?.(new Event("open"));
    listeners.get("message")?.(
      new MessageEvent("message", {
        data: JSON.stringify({ ...baseEvent, id: "ws-live-000" }),
      }),
    );
    connection.disconnect();

    expect(statuses).toEqual(["connecting", "open", "closed"]);
    expect(results).toHaveLength(1);
    expect(results[0]?.events[0]?.id).toBe("ws-live-000");
  });
});

describe("provider-loop HTTP adapter", () => {
  it("posts canonical events to the live provider-loop route without request-body secrets", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const recallEvent: AgentEvent = {
      ...baseEvent,
      agentId: "agent-memory",
      agentName: "Memory",
      agentRole: "memory",
      id: "provider-http-recall-000",
      runId: "run-provider-http-recall",
      sequence: 0,
      type: "memory_read",
    };
    const memoryPlanEvent: AgentEvent = {
      ...baseEvent,
      id: "provider-http-memory-plan-000",
      runId: "run-provider-http-memory-plan",
      sequence: 0,
      type: "decision",
    };
    const providerEvent: AgentEvent = {
      ...baseEvent,
      id: "provider-http-provider-000",
      runId: "run-provider-http-provider",
      sequence: 0,
      type: "decision",
    };

    const result = await callProviderLoopHttp({
      events: [baseEvent],
      fetchImpl: async (_input, init) => {
        requestBody = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () =>
            JSON.stringify({
              data: {
                events: [providerEvent],
                memoryPlanEvents: [memoryPlanEvent],
                quarantinedEvents: [],
                recallEvents: [recallEvent],
                warnings: [
                  {
                    code: "missing_openai_api_key",
                    message: "Provider key is missing.",
                    source: "llm",
                  },
                ],
              },
              ok: true,
            }),
        };
      },
      maxAgents: 2,
      maxMemoryRecords: 8,
      url: "http://127.0.0.1:8787/provider-loop",
    });

    expect(requestBody).toMatchObject({
      events: [baseEvent],
      maxAgents: 2,
      maxMemoryRecords: 8,
    });
    expect(JSON.stringify(requestBody)).not.toContain("apiKey");
    expect(result.source).toBe("custom");
    expect(result.events.map((event) => event.id)).toEqual([
      "provider-http-recall-000",
      "provider-http-memory-plan-000",
      "provider-http-provider-000",
    ]);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "missing_openai_api_key",
        source: "llm",
      }),
    ]);
  });

  it("returns warnings when the live provider-loop route fails", async () => {
    const result = await callProviderLoopHttp({
      events: [baseEvent],
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () =>
          JSON.stringify({
            error: {
              code: "world_memory_provider_loop_secret_in_request",
              message: "Request body contained a secret.",
            },
            ok: false,
          }),
      }),
      url: "http://127.0.0.1:8787/provider-loop",
    });

    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "world_memory_provider_loop_secret_in_request",
      }),
    ]);
  });
});
