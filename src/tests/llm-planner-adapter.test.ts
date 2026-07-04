import { describe, expect, it } from "vitest";

import {
  buildOpenAiResponsesPlannerBody,
  callOpenAiLlmPlanner,
  buildDeterministicLlmPlannerResult,
  buildSmallvilleLlmPlannerRequest,
  parseLlmPlannerResponse,
  type OpenAiResponsesFetch,
} from "../adapters/llmPlannerAdapter";
import { extractPersistentMemoryRecords } from "../events/persistentMemory";
import { replay } from "../events/reducer";
import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";

const savedAt = "2026-07-04T19:10:00.000Z";
const records = extractPersistentMemoryRecords(mockSmallvilleRoutineRun, savedAt);

describe("llm planner adapter", () => {
  it("builds a model-ready request without giving the renderer runtime facts", () => {
    const request = buildSmallvilleLlmPlannerRequest({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });

    expect(request.constraints.source).toBe("llm");
    expect(request.constraints.allowedEventTypes).toContain("memory_read");
    expect(request.constraints.allowedLocations).toContain("library");
    expect(request.constraints.rules).toContain(
      "The response is accepted only after adapter validation.",
    );
    expect(request.priorRun).toMatchObject({
      eventCount: 150,
      memoryActionCount: 75,
      runId: "run-smallville-routine-001",
    });
    expect(request.agents.length).toBeGreaterThan(0);
    expect(request.memory.selectedRecords.length).toBeGreaterThan(0);
    expect(request.promptHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("builds an OpenAI Responses request without exposing API keys to the body", () => {
    const request = buildSmallvilleLlmPlannerRequest({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const body = buildOpenAiResponsesPlannerBody({
      model: "gpt-5.1-mini",
      request,
    });
    const serializedBody = JSON.stringify(body);

    expect(body.model).toBe("gpt-5.1-mini");
    expect(body.store).toBe(false);
    expect(body.metadata).toMatchObject({
      agent_town_contract: "llm_planner_v1",
      prompt_hash: request.promptHash,
      request_id: request.requestId,
    });
    expect(body.input.map((message) => message.role)).toEqual(["developer", "user"]);
    expect(body.text.format).toMatchObject({
      name: "agent_town_llm_planner_response",
      strict: false,
      type: "json_schema",
    });
    expect(serializedBody).toContain(request.requestId);
    expect(serializedBody).not.toContain("OPENAI_API_KEY");
    expect(serializedBody).not.toContain("test-provider-key");
  });

  it("turns the deterministic model-shaped response into canonical replayable events", () => {
    const result = buildDeterministicLlmPlannerResult({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("llm");
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.events.map((event) => event.type)).toEqual([
      "memory_read",
      "thinking",
      "decision",
      "message",
      "tool_call",
      "thinking",
      "memory_write",
      "done",
    ]);
    expect(result.events[0]?.metadata?.source).toBe("llm");
    expect(result.events[0]?.metadata?.llmPlanner).toMatchObject({
      contractVersion: 1,
      generatedBy: "deterministic-contract-fixture",
      previousEventCount: 150,
    });
    expect(result.events[3]).toMatchObject({
      type: "message",
      targetAgentId: expect.any(String),
    });
    expect(result.events[4]).toMatchObject({
      toolName: "validate_llm_planner_contract",
      locationHint: "workshop",
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

  it("parses provider-backed OpenAI Responses output through the same quarantine gate", async () => {
    const request = buildSmallvilleLlmPlannerRequest({
      now: "2026-07-04T19:00:00.000Z",
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const providerPlannerResponse = {
      requestId: request.requestId,
      runId: "run-openai-provider-unit",
      taskId: "task-openai-provider-unit",
      model: "gpt-5.1-mini",
      generatedAt: "2026-07-04T19:00:00.000Z",
      steps: [
        {
          agentId: "agent-isabella",
          agentName: "Isabella",
          agentRole: "planner",
          cognitiveStage: "closure",
          content: "Isabella closes a provider-backed planner step as canonical evidence.",
          locationHint: "square",
          status: "done",
          summary: "Close provider-backed plan",
          type: "done",
        },
      ],
    };
    const calls: Array<{
      body?: string;
      headers?: Record<string, string>;
      input: string | URL;
      method?: string;
    }> = [];
    const fetchImpl: OpenAiResponsesFetch = async (input, init) => {
      calls.push({ input, ...init });

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            id: "resp_provider_unit",
            output: [
              {
                content: [
                  {
                    text: JSON.stringify(providerPlannerResponse),
                    type: "output_text",
                  },
                ],
                role: "assistant",
                type: "message",
              },
            ],
          }),
      };
    };
    const result = await callOpenAiLlmPlanner({
      apiKey: "test-provider-key",
      fetchImpl,
      request,
    });
    const finalState = replay(result.events, result.events.length - 1);

    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.input)).toBe("https://api.openai.com/v1/responses");
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers?.Authorization).toBe("Bearer test-provider-key");
    expect(calls[0]?.body).toContain("\"store\":false");
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      agentId: "agent-isabella",
      runId: "run-openai-provider-unit",
      type: "done",
    });
    expect(result.events[0]?.metadata?.llmPlanner).toMatchObject({
      generatedBy: "gpt-5.1-mini",
      requestId: request.requestId,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "openai_responses_provider_call",
      }),
    ]);
    expect(finalState.warnings).toHaveLength(0);
  });

  it("does not attempt a provider call without an API key", async () => {
    let called = false;
    const result = await callOpenAiLlmPlanner({
      fetchImpl: async () => {
        called = true;
        throw new Error("fetch should not be called without a key");
      },
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });

    expect(called).toBe(false);
    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "missing_openai_api_key",
      }),
    ]);
  });

  it("quarantines invalid model JSON without throwing", () => {
    const result = parseLlmPlannerResponse({
      previousEvents: mockSmallvilleRoutineRun,
      records,
      response: "{not json",
    });

    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({
        code: "invalid_llm_planner_json",
        source: "llm",
      }),
    ]);
  });

  it("keeps valid model steps while quarantining invalid AgentEvent mappings", () => {
    const request = buildSmallvilleLlmPlannerRequest({
      previousEvents: mockSmallvilleRoutineRun,
      records,
    });
    const result = parseLlmPlannerResponse({
      request,
      response: {
        requestId: request.requestId,
        runId: "run-llm-partial-unit",
        taskId: "task-llm-partial-unit",
        model: "unit-test-model",
        generatedAt: "2026-07-04T19:00:00.000Z",
        steps: [
          {
            agentId: "agent-isabella",
            agentName: "Isabella",
            agentRole: "planner",
            content: "This message is missing the required target agent.",
            locationHint: "town_hall",
            type: "message",
          },
          {
            agentId: "agent-sam",
            agentName: "Sam",
            agentRole: "reviewer",
            content: "Sam closes the partial model parse.",
            locationHint: "review_room",
            status: "done",
            type: "done",
          },
        ],
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      agentId: "agent-sam",
      type: "done",
    });
    expect(result.quarantinedEvents).toEqual([
      expect.objectContaining({
        code: "invalid_llm_planner_event",
        source: "llm",
      }),
    ]);
  });
});
