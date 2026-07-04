import {
  AGENT_EVENT_STATUSES,
  AGENT_EVENT_TYPES,
  AGENT_LOCATIONS,
  AGENT_ROLES,
} from "../events/constants";
import {
  comparePersistentMemoryRecords,
  type PersistentMemoryRecord,
} from "../events/persistentMemory";
import type {
  AgentEvent,
  AgentEventSource,
  AgentEventStatus,
  AgentEventType,
  AgentLocation,
  AgentRole,
} from "../events/types";
import { validateEventStream } from "../events/validators";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const LLM_PLANNER_SOURCE: AgentEventSource = "llm";
const LLM_PLANNER_CONTRACT_VERSION = 1;
const DEFAULT_LLM_PLAN_TIMESTAMP = "2026-07-04T19:00:00.000Z";
const DEFAULT_MAX_REQUEST_AGENTS = 8;
const DEFAULT_MAX_REQUEST_MEMORIES = 12;
const DEFAULT_OPENAI_RESPONSES_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_RESPONSES_MODEL = "gpt-5.1-mini";

export type LlmPlannerCognitiveStage =
  | "observation"
  | "retrieval"
  | "reflection"
  | "planning"
  | "action"
  | "conversation"
  | "closure";

export type LlmPlannerAgentSnapshot = {
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  firstSequence: number;
  latestEventId?: string;
  latestRunId?: string;
  latestTaskId?: string;
  latestSequence?: number;
  latestSummary?: string;
  latestContent?: string;
  locationHint: AgentLocation;
  subLocationId?: string;
  activity?: string;
  previousEventCount: number;
  selectedMemoryRecordIds: string[];
};

export type LlmPlannerMemorySnapshot = {
  recordId: string;
  sourceEventId: string;
  sourceRunId: string;
  sourceType: "memory_read" | "memory_write";
  sourceTimestamp: string;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  content: string;
  summary?: string;
  importance?: number;
  tags: string[];
};

export type LlmPlannerRequest = {
  schemaVersion: number;
  contractVersion: number;
  requestId: string;
  promptHash: string;
  generatedAt: string;
  modelRole: "planner";
  instructions: string[];
  constraints: {
    source: AgentEventSource;
    allowedEventTypes: readonly AgentEventType[];
    allowedAgentRoles: readonly AgentRole[];
    allowedLocations: readonly AgentLocation[];
    allowedStatuses: readonly AgentEventStatus[];
    allowedCognitiveStages: readonly LlmPlannerCognitiveStage[];
    outputShape: {
      root: "object";
      steps: "array";
      stepMustMapTo: "AgentEvent";
    };
    rules: string[];
  };
  priorRun: {
    runId?: string;
    eventCount: number;
    memoryActionCount: number;
    agentCount: number;
    latestEventId?: string;
    latestSequence?: number;
  };
  agents: readonly LlmPlannerAgentSnapshot[];
  memory: {
    recordCount: number;
    selectedRecords: readonly LlmPlannerMemorySnapshot[];
  };
};

export type LlmPlannerStep = {
  stepId?: string;
  eventId?: string;
  parentEventId?: string;
  timestamp?: string;
  sequence?: number;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  type: AgentEventType;
  content: string;
  summary?: string;
  targetAgentId?: string;
  targetTaskId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  artifactIds?: string[];
  filePath?: string;
  locationHint?: AgentLocation;
  status?: AgentEventStatus;
  cognitiveStage?: LlmPlannerCognitiveStage;
  subLocationId?: string;
  activity?: string;
  selectedMemoryRecordIds?: string[];
  derivedFromStepIds?: string[];
  planStep?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type LlmPlannerResponse = {
  requestId?: string;
  runId?: string;
  taskId?: string;
  model?: string;
  generatedAt?: string;
  steps: readonly LlmPlannerStep[];
  warnings?: readonly string[];
};

export type LlmPlannerRequestInput = {
  previousEvents?: readonly AgentEvent[];
  records?: readonly PersistentMemoryRecord[];
  now?: string;
  maxAgents?: number;
  maxMemoryRecords?: number;
};

export type LlmPlannerAdapterInput = LlmPlannerRequestInput & {
  request?: LlmPlannerRequest;
  response: LlmPlannerResponse | string | unknown;
};

export type OpenAiResponsesFetchInput = string | URL;

export type OpenAiResponsesFetchInit = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
};

export type OpenAiResponsesFetchResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
};

export type OpenAiResponsesFetch = (
  input: OpenAiResponsesFetchInput,
  init: OpenAiResponsesFetchInit,
) => Promise<OpenAiResponsesFetchResponse>;

export type OpenAiPlannerCallInput = LlmPlannerRequestInput & {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: OpenAiResponsesFetch;
  maxOutputTokens?: number;
  model?: string;
  request?: LlmPlannerRequest;
};

export type OpenAiPlannerRequestBody = {
  input: Array<{
    content: Array<{
      text: string;
      type: "input_text";
    }>;
    role: "developer" | "user";
    type: "message";
  }>;
  instructions: string;
  max_output_tokens: number;
  metadata: Record<string, string>;
  model: string;
  store: false;
  text: {
    format: {
      name: string;
      schema: Record<string, unknown>;
      strict: false;
      type: "json_schema";
    };
  };
};

const LLM_COGNITIVE_STAGES = [
  "observation",
  "retrieval",
  "reflection",
  "planning",
  "action",
  "conversation",
  "closure",
] as const satisfies readonly LlmPlannerCognitiveStage[];

const fallbackAgents: readonly LlmPlannerAgentSnapshot[] = [
  {
    agentId: "agent-isabella",
    agentName: "Isabella",
    agentRole: "planner",
    firstSequence: 0,
    locationHint: "town_hall",
    subLocationId: "town_hall_table",
    activity: "plans from model contract",
    previousEventCount: 0,
    selectedMemoryRecordIds: [],
  },
  {
    agentId: "agent-maria",
    agentName: "Maria",
    agentRole: "coder",
    firstSequence: 1,
    locationHint: "workshop",
    subLocationId: "workshop_debug_desk",
    activity: "validates model event stream",
    previousEventCount: 0,
    selectedMemoryRecordIds: [],
  },
  {
    agentId: "agent-sam",
    agentName: "Sam",
    agentRole: "reviewer",
    firstSequence: 2,
    locationHint: "review_room",
    subLocationId: "review_evidence_wall",
    activity: "reviews model contract",
    previousEventCount: 0,
    selectedMemoryRecordIds: [],
  },
  {
    agentId: "agent-mei",
    agentName: "Mei",
    agentRole: "memory",
    firstSequence: 3,
    locationHint: "archive",
    subLocationId: "archive_writing_desk",
    activity: "records model limitation",
    previousEventCount: 0,
    selectedMemoryRecordIds: [],
  },
];

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = record[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : undefined;
}

function readRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];

  return isRecord(value) ? value : undefined;
}

function validTimestampOrFallback(timestamp: string | undefined, fallback: string): string {
  return timestamp !== undefined && !Number.isNaN(Date.parse(timestamp))
    ? timestamp
    : fallback;
}

function hashText(input: string): string {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

function timestampAt(startTimestamp: string, sequence: number): string {
  const start = new Date(startTimestamp);
  start.setUTCMinutes(start.getUTCMinutes() + sequence);

  return start.toISOString();
}

function readEventMetadataString(event: AgentEvent, key: string): string | undefined {
  const value = event.metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function summarizePriorRun(previousEvents: readonly AgentEvent[]): LlmPlannerRequest["priorRun"] {
  const sortedEvents = [...previousEvents].sort((left, right) => left.sequence - right.sequence);
  const latestEvent = sortedEvents[sortedEvents.length - 1];
  const agentIds = new Set(previousEvents.map((event) => event.agentId));
  const memoryActionCount = previousEvents.filter(
    (event) => event.type === "memory_read" || event.type === "memory_write",
  ).length;

  return {
    runId: latestEvent?.runId,
    eventCount: previousEvents.length,
    memoryActionCount,
    agentCount: agentIds.size,
    latestEventId: latestEvent?.id,
    latestSequence: latestEvent?.sequence,
  };
}

function selectMemoryRecords(
  records: readonly PersistentMemoryRecord[],
  limit: number,
): LlmPlannerMemorySnapshot[] {
  return [...records]
    .sort((left, right) => {
      const importanceDiff = (right.importance ?? 0) - (left.importance ?? 0);

      if (importanceDiff !== 0) {
        return importanceDiff;
      }

      return comparePersistentMemoryRecords(left, right);
    })
    .slice(0, Math.max(0, limit))
    .map((record) => ({
      recordId: record.id,
      sourceEventId: record.sourceEventId,
      sourceRunId: record.sourceRunId,
      sourceType: record.sourceType,
      sourceTimestamp: record.sourceTimestamp,
      agentId: record.agentId,
      agentName: record.agentName,
      agentRole: record.agentRole,
      content: record.content,
      summary: record.summary,
      importance: record.importance,
      tags: record.tags,
    }));
}

function buildAgentSnapshots(input: {
  previousEvents: readonly AgentEvent[];
  selectedRecords: readonly LlmPlannerMemorySnapshot[];
  maxAgents: number;
}): LlmPlannerAgentSnapshot[] {
  const contexts = new Map<string, LlmPlannerAgentSnapshot>();
  const recordsByAgent = new Map<string, string[]>();

  for (const record of input.selectedRecords) {
    recordsByAgent.set(record.agentId, [
      ...(recordsByAgent.get(record.agentId) ?? []),
      record.recordId,
    ]);
  }

  for (const event of [...input.previousEvents].sort(
    (left, right) => left.sequence - right.sequence,
  )) {
    const current = contexts.get(event.agentId);
    const previousEventCount = (current?.previousEventCount ?? 0) + 1;

    contexts.set(event.agentId, {
      agentId: event.agentId,
      agentName: event.agentName,
      agentRole: event.agentRole,
      firstSequence: current?.firstSequence ?? event.sequence,
      latestEventId: event.id,
      latestRunId: event.runId,
      latestTaskId: event.taskId,
      latestSequence: event.sequence,
      latestSummary: event.summary,
      latestContent: event.content,
      locationHint: event.locationHint ?? current?.locationHint ?? "unknown",
      subLocationId:
        readEventMetadataString(event, "subLocationId") ?? current?.subLocationId,
      activity: readEventMetadataString(event, "activity") ?? current?.activity,
      previousEventCount,
      selectedMemoryRecordIds: recordsByAgent.get(event.agentId) ?? [],
    });
  }

  for (const record of input.selectedRecords) {
    if (contexts.has(record.agentId)) {
      continue;
    }

    contexts.set(record.agentId, {
      agentId: record.agentId,
      agentName: record.agentName,
      agentRole: record.agentRole,
      firstSequence: Number.MAX_SAFE_INTEGER,
      latestEventId: record.sourceEventId,
      latestRunId: record.sourceRunId,
      latestSummary: record.summary,
      latestContent: record.content,
      locationHint: "archive",
      subLocationId: "archive_shelves",
      activity: "plans from durable memory",
      previousEventCount: 0,
      selectedMemoryRecordIds: recordsByAgent.get(record.agentId) ?? [],
    });
  }

  const snapshots = [...contexts.values()]
    .sort((left, right) => {
      if (left.firstSequence !== right.firstSequence) {
        return left.firstSequence - right.firstSequence;
      }

      return left.agentId.localeCompare(right.agentId);
    })
    .slice(0, Math.max(1, input.maxAgents));

  return snapshots.length > 0 ? snapshots : [...fallbackAgents];
}

export function buildSmallvilleLlmPlannerRequest(
  input: LlmPlannerRequestInput = {},
): LlmPlannerRequest {
  const previousEvents = input.previousEvents ?? [];
  const records = input.records ?? [];
  const generatedAt = validTimestampOrFallback(input.now, DEFAULT_LLM_PLAN_TIMESTAMP);
  const selectedRecords = selectMemoryRecords(
    records,
    input.maxMemoryRecords ?? DEFAULT_MAX_REQUEST_MEMORIES,
  );
  const agents = buildAgentSnapshots({
    maxAgents: input.maxAgents ?? DEFAULT_MAX_REQUEST_AGENTS,
    previousEvents,
    selectedRecords,
  });
  const priorRun = summarizePriorRun(previousEvents);
  const promptPayload = JSON.stringify({
    agents,
    generatedAt,
    priorRun,
    selectedRecordIds: selectedRecords.map((record) => record.recordId),
  });
  const promptHash = hashText(promptPayload);

  return {
    schemaVersion: 1,
    contractVersion: LLM_PLANNER_CONTRACT_VERSION,
    requestId: `llm-plan-request-${promptHash}`,
    promptHash,
    generatedAt,
    modelRole: "planner",
    instructions: [
      "Return JSON only.",
      "Every step must map to one canonical AgentEvent.",
      "Use AgentEvent as the only source of runtime facts.",
      "Do not invent locations outside the canonical AgentLocation vocabulary.",
      "Include cognitive evidence in metadata; do not rely on renderer state.",
    ],
    constraints: {
      source: LLM_PLANNER_SOURCE,
      allowedEventTypes: AGENT_EVENT_TYPES,
      allowedAgentRoles: AGENT_ROLES,
      allowedLocations: AGENT_LOCATIONS,
      allowedStatuses: AGENT_EVENT_STATUSES,
      allowedCognitiveStages: LLM_COGNITIVE_STAGES,
      outputShape: {
        root: "object",
        steps: "array",
        stepMustMapTo: "AgentEvent",
      },
      rules: [
        "message and handoff steps must include targetAgentId.",
        "tool_call steps must include toolName.",
        "memory_read and memory_write steps must keep memory evidence inspectable.",
        "The response is accepted only after adapter validation.",
      ],
    },
    priorRun,
    agents,
    memory: {
      recordCount: records.length,
      selectedRecords,
    },
  };
}

function buildOpenAiPlannerSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: true,
    required: ["steps"],
    properties: {
      requestId: { type: "string" },
      runId: { type: "string" },
      taskId: { type: "string" },
      model: { type: "string" },
      generatedAt: { type: "string" },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 16,
        items: {
          type: "object",
          additionalProperties: true,
          required: ["agentId", "agentName", "agentRole", "type", "content"],
          properties: {
            stepId: { type: "string" },
            eventId: { type: "string" },
            parentEventId: { type: "string" },
            timestamp: { type: "string" },
            sequence: { type: "number" },
            agentId: { type: "string" },
            agentName: { type: "string" },
            agentRole: { enum: AGENT_ROLES },
            type: { enum: AGENT_EVENT_TYPES },
            content: { type: "string" },
            summary: { type: "string" },
            targetAgentId: { type: "string" },
            targetTaskId: { type: "string" },
            toolName: { type: "string" },
            toolInput: { type: "object", additionalProperties: true },
            toolOutputSummary: { type: "string" },
            artifactIds: {
              type: "array",
              items: { type: "string" },
            },
            filePath: { type: "string" },
            locationHint: { enum: AGENT_LOCATIONS },
            status: { enum: AGENT_EVENT_STATUSES },
            cognitiveStage: { enum: LLM_COGNITIVE_STAGES },
            subLocationId: { type: "string" },
            activity: { type: "string" },
            selectedMemoryRecordIds: {
              type: "array",
              items: { type: "string" },
            },
            derivedFromStepIds: {
              type: "array",
              items: { type: "string" },
            },
            planStep: { type: "object", additionalProperties: true },
            metadata: { type: "object", additionalProperties: true },
          },
        },
      },
    },
  };
}

function openAiResponsesEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/responses`;
}

function buildOpenAiPlannerInstructions(request: LlmPlannerRequest): string {
  return [
    "You are the provider-backed planner for Agent Town.",
    "Return one JSON object that matches the provided schema.",
    "Every step must be accepted later as one canonical AgentEvent.",
    "Use only the allowed event types, roles, locations, statuses, and cognitive stages.",
    "Do not make the renderer, sprites, map objects, or UI state own runtime facts.",
    "Use memory and agent context from the planner request when selecting actions.",
    "If a message or handoff targets another agent, include targetAgentId.",
    "If a step calls a tool, include toolName.",
    `Request id: ${request.requestId}.`,
    `Prompt hash: ${request.promptHash}.`,
  ].join("\n");
}

function buildOpenAiPlannerUserPayload(request: LlmPlannerRequest): string {
  return JSON.stringify(
    {
      outputContract: {
        root: "LlmPlannerResponse",
        steps: "Every step maps to one AgentEvent after adapter validation.",
      },
      plannerRequest: request,
    },
    null,
    2,
  );
}

export function buildOpenAiResponsesPlannerBody(input: {
  maxOutputTokens?: number;
  model?: string;
  request: LlmPlannerRequest;
}): OpenAiPlannerRequestBody {
  return {
    input: [
      {
        role: "developer",
        type: "message",
        content: [
          {
            type: "input_text",
            text: input.request.instructions.join("\n"),
          },
        ],
      },
      {
        role: "user",
        type: "message",
        content: [
          {
            type: "input_text",
            text: buildOpenAiPlannerUserPayload(input.request),
          },
        ],
      },
    ],
    instructions: buildOpenAiPlannerInstructions(input.request),
    max_output_tokens: input.maxOutputTokens ?? 1800,
    metadata: {
      agent_town_contract: "llm_planner_v1",
      prompt_hash: input.request.promptHash,
      request_id: input.request.requestId,
    },
    model: input.model ?? DEFAULT_OPENAI_RESPONSES_MODEL,
    store: false,
    text: {
      format: {
        name: "agent_town_llm_planner_response",
        schema: buildOpenAiPlannerSchema(),
        strict: false,
        type: "json_schema",
      },
    },
  };
}

export function extractOpenAiResponsesText(response: unknown): string | undefined {
  if (!isRecord(response)) {
    return undefined;
  }

  const directText = response.output_text;
  if (typeof directText === "string" && directText.trim().length > 0) {
    return directText;
  }

  const output = response.output;
  if (!Array.isArray(output)) {
    return undefined;
  }

  const textParts: string[] = [];

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!isRecord(content)) {
        continue;
      }

      const text = content.text;
      if (
        content.type === "output_text" &&
        typeof text === "string" &&
        text.trim().length > 0
      ) {
        textParts.push(text);
      }
    }
  }

  return textParts.length > 0 ? textParts.join("\n") : undefined;
}

function pickAgent(
  request: LlmPlannerRequest,
  role: AgentRole,
  fallbackIndex: number,
  avoidAgentId?: string,
): LlmPlannerAgentSnapshot {
  const roleMatch = request.agents.find(
    (agent) => agent.agentRole === role && agent.agentId !== avoidAgentId,
  );

  if (roleMatch !== undefined) {
    return roleMatch;
  }

  return (
    request.agents.find((agent) => agent.agentId !== avoidAgentId) ??
    request.agents[fallbackIndex] ??
    fallbackAgents[fallbackIndex] ??
    fallbackAgents[0]
  );
}

function stepAgentFields(agent: LlmPlannerAgentSnapshot): Pick<
  LlmPlannerStep,
  "agentId" | "agentName" | "agentRole"
> {
  return {
    agentId: agent.agentId,
    agentName: agent.agentName,
    agentRole: agent.agentRole,
  };
}

export function buildDeterministicLlmPlannerResponse(
  request: LlmPlannerRequest,
): LlmPlannerResponse {
  const planner = pickAgent(request, "planner", 0);
  const coder = pickAgent(request, "coder", 1, planner.agentId);
  const reviewer = pickAgent(request, "reviewer", 2, coder.agentId);
  const memoryAgent = pickAgent(request, "memory", 3, reviewer.agentId);
  const selectedMemoryRecordIds = request.memory.selectedRecords.map(
    (record) => record.recordId,
  );
  const selectedMemoryText =
    selectedMemoryRecordIds.length > 0
      ? selectedMemoryRecordIds.slice(0, 3).join(", ")
      : "no durable memory records";

  return {
    requestId: request.requestId,
    runId: `run-llm-plan-${request.promptHash}`,
    taskId: "task-llm-planner-contract",
    model: "deterministic-contract-fixture",
    generatedAt: request.generatedAt,
    steps: [
      {
        stepId: "retrieve-context",
        ...stepAgentFields(planner),
        type: "memory_read",
        content: `${planner.agentName} reviews model-planning context with ${selectedMemoryText}.`,
        summary: "Retrieve LLM planning context",
        locationHint: "archive",
        status: "running",
        cognitiveStage: "retrieval",
        subLocationId: "archive_shelves",
        activity: "retrieves planner contract",
        selectedMemoryRecordIds,
      },
      {
        stepId: "reflect-contract",
        ...stepAgentFields(planner),
        type: "thinking",
        content:
          "The model response must become AgentEvent evidence before the town projection sees it.",
        summary: "Reflect on event boundary",
        locationHint: "town_hall",
        status: "running",
        cognitiveStage: "reflection",
        subLocationId: "town_hall_table",
        activity: "checks source boundary",
        derivedFromStepIds: ["retrieve-context"],
      },
      {
        stepId: "choose-slice",
        ...stepAgentFields(planner),
        type: "decision",
        content:
          "Plan the smallest LLM-backed slice: parse model steps, quarantine invalid output, and replay accepted events.",
        summary: "Plan model adapter slice",
        locationHint: "town_hall",
        status: "running",
        cognitiveStage: "planning",
        subLocationId: "town_hall_office",
        activity: "plans adapter slice",
        planStep: {
          goal: "Preserve AgentEvent as the source of truth for model output.",
          nextAction: "Ask the coder to validate the LLM planner adapter path.",
          expectedLocation: "workshop_debug_desk",
        },
      },
      {
        stepId: "send-implementation",
        ...stepAgentFields(planner),
        type: "message",
        targetAgentId: coder.agentId,
        targetTaskId: "task-llm-planner-contract",
        content: `${planner.agentName} asks ${coder.agentName} to validate model output through the adapter, not the renderer.`,
        summary: "Ask coder to validate adapter",
        locationHint: "dispatch_board",
        status: "running",
        cognitiveStage: "conversation",
        subLocationId: "dispatch_notice_wall",
        activity: "sends planner instruction",
      },
      {
        stepId: "validate-adapter",
        ...stepAgentFields(coder),
        type: "tool_call",
        toolName: "validate_llm_planner_contract",
        toolInput: {
          adapter: "src/adapters/llmPlannerAdapter.ts",
          invariant: "External source -> Adapter -> AgentEvent -> WorldState",
        },
        toolOutputSummary:
          "Model-shaped steps are accepted only after canonical AgentEvent validation.",
        content: `${coder.agentName} validates that the LLM planner contract emits canonical events.`,
        summary: "Validate LLM planner adapter",
        locationHint: "workshop",
        status: "running",
        cognitiveStage: "action",
        subLocationId: "workshop_debug_desk",
        activity: "validates model adapter",
      },
      {
        stepId: "review-contract",
        ...stepAgentFields(reviewer),
        type: "thinking",
        content:
          "The slice proves an LLM output contract, but it still does not call a real provider or claim autonomous agents.",
        summary: "Review remaining gap",
        locationHint: "review_room",
        status: "running",
        cognitiveStage: "reflection",
        subLocationId: "review_evidence_wall",
        activity: "reviews LLM limitation",
      },
      {
        stepId: "write-limitation",
        ...stepAgentFields(memoryAgent),
        type: "memory_write",
        content:
          "LLM planner contract exists as canonical event evidence; provider-backed generation remains a future gap.",
        summary: "Record LLM contract limitation",
        locationHint: "archive",
        status: "running",
        cognitiveStage: "closure",
        subLocationId: "archive_writing_desk",
        activity: "records model limitation",
        selectedMemoryRecordIds,
      },
      {
        stepId: "close-loop",
        ...stepAgentFields(planner),
        type: "done",
        content:
          "LLM planner contract replay closes with parser, quarantine, and projection evidence visible.",
        summary: "Close LLM planner contract",
        locationHint: "square",
        status: "done",
        cognitiveStage: "closure",
        subLocationId: "square_fountain_edge",
        activity: "closes planner contract",
      },
    ],
  };
}

function quarantine(input: {
  code: string;
  raw?: string;
  input: unknown;
  path: string;
  message: string;
}): AdapterQuarantinedEvent {
  return {
    code: input.code,
    input: input.input,
    issues: [{ path: input.path, message: input.message }],
    raw: input.raw,
    source: LLM_PLANNER_SOURCE,
  };
}

function normalizeResponse(
  response: LlmPlannerAdapterInput["response"],
): {
  response?: Record<string, unknown>;
  quarantinedEvents: AdapterQuarantinedEvent[];
} {
  if (typeof response === "string") {
    try {
      const parsed = JSON.parse(response) as unknown;

      if (!isRecord(parsed)) {
        return {
          quarantinedEvents: [
            quarantine({
              code: "invalid_llm_planner_response",
              input: parsed,
              message: "LLM planner response must be a JSON object.",
              path: "$",
              raw: response,
            }),
          ],
        };
      }

      return { response: parsed, quarantinedEvents: [] };
    } catch (error) {
      return {
        quarantinedEvents: [
          quarantine({
            code: "invalid_llm_planner_json",
            input: response,
            message:
              error instanceof Error
                ? `LLM planner response must be valid JSON: ${error.message}`
                : "LLM planner response must be valid JSON.",
            path: "$",
            raw: response,
          }),
        ],
      };
    }
  }

  if (!isRecord(response)) {
    return {
      quarantinedEvents: [
        quarantine({
          code: "invalid_llm_planner_response",
          input: response,
          message: "LLM planner response must be an object.",
          path: "$",
        }),
      ],
    };
  }

  return { response, quarantinedEvents: [] };
}

function buildCandidateEvents(input: {
  request: LlmPlannerRequest;
  response: Record<string, unknown>;
}): {
  events: Record<string, unknown>[];
  quarantinedEvents: AdapterQuarantinedEvent[];
  warnings: AdapterWarning[];
} {
  const rawSteps = input.response.steps;
  const quarantinedEvents: AdapterQuarantinedEvent[] = [];
  const warnings: AdapterWarning[] = [];

  if (!Array.isArray(rawSteps)) {
    return {
      events: [],
      quarantinedEvents: [
        quarantine({
          code: "invalid_llm_planner_steps",
          input: input.response,
          message: "LLM planner response must include a steps array.",
          path: "steps",
        }),
      ],
      warnings,
    };
  }

  const responseRequestId = readString(input.response, "requestId") ?? input.request.requestId;
  const generatedAt = validTimestampOrFallback(
    readString(input.response, "generatedAt"),
    input.request.generatedAt,
  );
  const model = readString(input.response, "model") ?? "unknown-model";
  const runId =
    readString(input.response, "runId") ??
    `run-llm-plan-${hashText(`${responseRequestId}:${JSON.stringify(rawSteps)}`)}`;
  const taskId = readString(input.response, "taskId") ?? "task-llm-planner-contract";
  const selectedMemoryRecordIds = input.request.memory.selectedRecords.map(
    (record) => record.recordId,
  );
  const responseWarnings = readStringArray(input.response, "warnings") ?? [];

  warnings.push(
    ...responseWarnings.map((message, index) => ({
      code: "llm_planner_response_warning",
      message,
      sequence: index,
      source: LLM_PLANNER_SOURCE,
    })),
  );

  const events = rawSteps.flatMap((rawStep, index): Record<string, unknown>[] => {
    if (!isRecord(rawStep)) {
      quarantinedEvents.push(
        quarantine({
          code: "invalid_llm_planner_step",
          input: rawStep,
          message: `LLM planner step ${index} must be an object.`,
          path: `steps.${index}`,
        }),
      );
      return [];
    }

    const stepSequence = readNumber(rawStep, "sequence");
    const sequence =
      stepSequence !== undefined && Number.isInteger(stepSequence) && stepSequence >= 0
        ? stepSequence
        : index;
    const timestamp = readString(rawStep, "timestamp") ?? timestampAt(generatedAt, sequence);
    const metadata = readRecord(rawStep, "metadata") ?? {};
    const cognitiveStage = readString(rawStep, "cognitiveStage");
    const subLocationId = readString(rawStep, "subLocationId");
    const activity = readString(rawStep, "activity");
    const stepId = readString(rawStep, "stepId") ?? `step-${String(index).padStart(3, "0")}`;
    const stepSelectedMemoryIds =
      readStringArray(rawStep, "selectedMemoryRecordIds") ?? selectedMemoryRecordIds;
    const tags = [
      "llm-planner",
      "smallville-contract",
      ...(cognitiveStage !== undefined ? [cognitiveStage] : []),
      ...stepSelectedMemoryIds.slice(0, 4),
    ];

    return [
      {
        id: readString(rawStep, "eventId") ?? `${runId}-${String(index).padStart(3, "0")}`,
        runId,
        taskId,
        parentEventId: readString(rawStep, "parentEventId"),
        timestamp,
        sequence,
        agentId: readString(rawStep, "agentId"),
        agentName: readString(rawStep, "agentName"),
        agentRole: rawStep.agentRole,
        type: rawStep.type,
        content: readString(rawStep, "content"),
        summary: readString(rawStep, "summary"),
        targetAgentId: readString(rawStep, "targetAgentId"),
        targetTaskId: readString(rawStep, "targetTaskId"),
        toolName: readString(rawStep, "toolName"),
        toolInput: rawStep.toolInput,
        toolOutputSummary: readString(rawStep, "toolOutputSummary"),
        artifactIds: readStringArray(rawStep, "artifactIds"),
        filePath: readString(rawStep, "filePath"),
        locationHint: rawStep.locationHint,
        status: rawStep.status,
        metadata: {
          ...metadata,
          source: LLM_PLANNER_SOURCE,
          tags: [
            ...tags,
            ...(Array.isArray(metadata.tags)
              ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
              : []),
          ],
          cognitiveStage,
          subLocationId,
          activity,
          selectedMemoryRecordIds: stepSelectedMemoryIds,
          derivedFromStepIds: readStringArray(rawStep, "derivedFromStepIds"),
          planStep: readRecord(rawStep, "planStep"),
          llmPlanner: {
            schemaVersion: 1,
            contractVersion: input.request.contractVersion,
            requestId: input.request.requestId,
            responseRequestId,
            promptHash: input.request.promptHash,
            model,
            modelRole: input.request.modelRole,
            generatedAt,
            generatedBy: model,
            stepIndex: index,
            responseStepId: stepId,
            previousRunId: input.request.priorRun.runId,
            previousEventCount: input.request.priorRun.eventCount,
            selectedMemoryRecordIds: stepSelectedMemoryIds,
          },
        },
      },
    ];
  });

  return { events, quarantinedEvents, warnings };
}

function timestampWarnings(events: readonly AgentEvent[]): AdapterWarning[] {
  return events.flatMap((event): AdapterWarning[] => {
    if (!Number.isNaN(Date.parse(event.timestamp))) {
      return [];
    }

    return [
      {
        code: "invalid_timestamp",
        eventId: event.id,
        message: `event ${event.id} has an invalid timestamp; replay will still use sequence order.`,
        sequence: event.sequence,
        source: LLM_PLANNER_SOURCE,
      },
    ];
  });
}

export function parseLlmPlannerResponse(input: LlmPlannerAdapterInput): AdapterResult {
  const request =
    input.request ??
    buildSmallvilleLlmPlannerRequest({
      maxAgents: input.maxAgents,
      maxMemoryRecords: input.maxMemoryRecords,
      now: input.now,
      previousEvents: input.previousEvents,
      records: input.records,
    });
  const normalized = normalizeResponse(input.response);

  if (normalized.response === undefined) {
    return {
      events: [],
      quarantinedEvents: normalized.quarantinedEvents,
      source: LLM_PLANNER_SOURCE,
      warnings: [],
    };
  }

  const candidates = buildCandidateEvents({
    request,
    response: normalized.response,
  });
  const validation = validateEventStream(candidates.events);
  const quarantinedEvents: AdapterQuarantinedEvent[] = [
    ...normalized.quarantinedEvents,
    ...candidates.quarantinedEvents,
    ...validation.quarantinedEvents.map((event) => ({
      ...event,
      code: "invalid_llm_planner_event",
      source: LLM_PLANNER_SOURCE,
    })),
  ];
  const warnings = [
    ...candidates.warnings,
    ...timestampWarnings(validation.events),
  ];

  return {
    events: validation.events,
    quarantinedEvents,
    source: LLM_PLANNER_SOURCE,
    warnings,
  };
}

function providerWarning(input: {
  code: string;
  message: string;
}): AdapterWarning {
  return {
    code: input.code,
    message: input.message,
    source: LLM_PLANNER_SOURCE,
  };
}

function globalFetch(): OpenAiResponsesFetch | undefined {
  return typeof globalThis.fetch === "function"
    ? (globalThis.fetch as unknown as OpenAiResponsesFetch)
    : undefined;
}

export async function callOpenAiLlmPlanner(
  input: OpenAiPlannerCallInput = {},
): Promise<AdapterResult> {
  const request =
    input.request ??
    buildSmallvilleLlmPlannerRequest({
      maxAgents: input.maxAgents,
      maxMemoryRecords: input.maxMemoryRecords,
      now: input.now,
      previousEvents: input.previousEvents,
      records: input.records,
    });
  const apiKey = input.apiKey?.trim();

  if (apiKey === undefined || apiKey.length === 0) {
    return {
      events: [],
      quarantinedEvents: [],
      source: LLM_PLANNER_SOURCE,
      warnings: [
        providerWarning({
          code: "missing_openai_api_key",
          message:
            "OPENAI_API_KEY is required for a live provider-backed LLM planner call.",
        }),
      ],
    };
  }

  const fetchImpl = input.fetchImpl ?? globalFetch();

  if (fetchImpl === undefined) {
    return {
      events: [],
      quarantinedEvents: [],
      source: LLM_PLANNER_SOURCE,
      warnings: [
        providerWarning({
          code: "missing_fetch",
          message:
            "A fetch implementation is required for a live provider-backed LLM planner call.",
        }),
      ],
    };
  }

  const body = buildOpenAiResponsesPlannerBody({
    maxOutputTokens: input.maxOutputTokens,
    model: input.model,
    request,
  });
  const response = await fetchImpl(
    openAiResponsesEndpoint(input.baseUrl ?? DEFAULT_OPENAI_RESPONSES_BASE_URL),
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const rawResponseText = await response.text();

  if (!response.ok) {
    return {
      events: [],
      quarantinedEvents: [
        quarantine({
          code: "openai_responses_http_error",
          input: {
            status: response.status,
            statusText: response.statusText,
          },
          message: `OpenAI Responses request failed with HTTP ${response.status}.`,
          path: "$",
          raw: rawResponseText,
        }),
      ],
      source: LLM_PLANNER_SOURCE,
      warnings: [],
    };
  }

  let providerResponse: unknown;

  try {
    providerResponse = JSON.parse(rawResponseText) as unknown;
  } catch (error) {
    return {
      events: [],
      quarantinedEvents: [
        quarantine({
          code: "invalid_openai_responses_json",
          input: rawResponseText,
          message:
            error instanceof Error
              ? `OpenAI Responses payload must be valid JSON: ${error.message}`
              : "OpenAI Responses payload must be valid JSON.",
          path: "$",
          raw: rawResponseText,
        }),
      ],
      source: LLM_PLANNER_SOURCE,
      warnings: [],
    };
  }

  const plannerText = extractOpenAiResponsesText(providerResponse);

  if (plannerText === undefined) {
    return {
      events: [],
      quarantinedEvents: [
        quarantine({
          code: "missing_openai_responses_text",
          input: providerResponse,
          message:
            "OpenAI Responses payload did not include output_text or message content output_text.",
          path: "output",
          raw: rawResponseText,
        }),
      ],
      source: LLM_PLANNER_SOURCE,
      warnings: [],
    };
  }

  const parsed = parseLlmPlannerResponse({
    maxAgents: input.maxAgents,
    maxMemoryRecords: input.maxMemoryRecords,
    now: input.now,
    previousEvents: input.previousEvents,
    records: input.records,
    request,
    response: plannerText,
  });
  const responseId = isRecord(providerResponse) ? readString(providerResponse, "id") : undefined;

  return {
    ...parsed,
    warnings: [
      ...parsed.warnings,
      providerWarning({
        code: "openai_responses_provider_call",
        message:
          responseId === undefined
            ? "Parsed provider-backed OpenAI Responses output through the LLM planner adapter."
            : `Parsed provider-backed OpenAI Responses output ${responseId} through the LLM planner adapter.`,
      }),
    ],
  };
}

export function buildDeterministicLlmPlannerResult(
  input: LlmPlannerRequestInput = {},
): AdapterResult {
  const request = buildSmallvilleLlmPlannerRequest(input);
  const response = buildDeterministicLlmPlannerResponse(request);

  return parseLlmPlannerResponse({
    ...input,
    request,
    response,
  });
}

export const llmPlannerAdapter: AgentEventAdapter<LlmPlannerAdapterInput> = {
  source: LLM_PLANNER_SOURCE,
  parse: parseLlmPlannerResponse,
};
