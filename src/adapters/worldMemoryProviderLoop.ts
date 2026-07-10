import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
} from "./types";
import type { FileWorldMemoryIngestResult } from "./worldMemoryRuntime";
import {
  buildSmallvilleLlmPlannerRequest,
  callOpenAiLlmPlanner,
  type LlmPlannerRequest,
  type OpenAiResponsesFetch,
} from "./llmPlannerAdapter";
import {
  type PersistentMemoryRecord,
} from "../events/persistentMemory";
import type {
  AgentEvent,
  AgentEventMetadata,
  AgentEventSource,
  QuarantinedEvent,
} from "../events/types";
import { validateEventStream } from "../events/validators";

const WORLD_MEMORY_SOURCE: AgentEventSource = "memory";
const LLM_PLANNER_SOURCE: AgentEventSource = "llm";

export type WorldMemoryServerFetchInput = string | URL;

export type WorldMemoryServerFetchInit = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
};

export type WorldMemoryServerFetchResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
};

export type WorldMemoryServerFetch = (
  input: WorldMemoryServerFetchInput,
  init?: WorldMemoryServerFetchInit,
) => Promise<WorldMemoryServerFetchResponse>;

export type WorldMemoryProviderLoopInput = {
  worldMemoryBaseUrl: string;
  events: readonly unknown[];
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: OpenAiResponsesFetch;
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoryPlanMaxAgents?: number;
  memoriesPerAgent?: number;
  model?: string;
  now?: string;
  savedAt?: string;
  worldMemoryFetchImpl?: WorldMemoryServerFetch;
};

export type WorldMemoryProviderLoopResult = {
  acceptedInputEvents: AgentEvent[];
  ingestResult: FileWorldMemoryIngestResult;
  memoryPlanResult: AdapterResult;
  providerRecords: PersistentMemoryRecord[];
  providerRequest: LlmPlannerRequest;
  providerResult: AdapterResult;
  quarantinedEvents: AdapterQuarantinedEvent[];
  recallResult: AdapterResult;
  warnings: AdapterWarning[];
};

type WorldMemoryEnvelope<T> =
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

class WorldMemoryServerClientError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function globalWorldMemoryFetch(): WorldMemoryServerFetch | undefined {
  return typeof globalThis.fetch === "function"
    ? (globalThis.fetch as unknown as WorldMemoryServerFetch)
    : undefined;
}

function loopWarning(input: {
  code: string;
  message: string;
  source?: AgentEventSource;
}): AdapterWarning {
  return {
    code: input.code,
    message: input.message,
    source: input.source ?? LLM_PLANNER_SOURCE,
  };
}

function quarantineProviderLoopInputEvent(
  event: QuarantinedEvent,
): AdapterQuarantinedEvent {
  return {
    ...event,
    code: "invalid_world_memory_provider_loop_input_event",
    source: LLM_PLANNER_SOURCE,
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function endpoint(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}${path}`;
}

async function readJsonEnvelope<T>(
  response: WorldMemoryServerFetchResponse,
  url: string,
): Promise<T> {
  const raw = await response.text();
  let envelope: unknown;

  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    throw new WorldMemoryServerClientError(
      response.status,
      "invalid_world_memory_server_json",
      error instanceof Error
        ? `World-memory server returned invalid JSON from ${url}: ${error.message}.`
        : `World-memory server returned invalid JSON from ${url}.`,
    );
  }

  if (!isRecord(envelope) || typeof envelope.ok !== "boolean") {
    throw new WorldMemoryServerClientError(
      response.status,
      "invalid_world_memory_server_envelope",
      `World-memory server returned an unsupported envelope from ${url}.`,
    );
  }

  if (!response.ok || envelope.ok === false) {
    const error = isRecord(envelope.error) ? envelope.error : undefined;
    const code =
      typeof error?.code === "string"
        ? error.code
        : "world_memory_server_request_failed";
    const message =
      typeof error?.message === "string"
        ? error.message
        : `World-memory server request failed for ${url}.`;

    throw new WorldMemoryServerClientError(response.status, code, message);
  }

  return (envelope as WorldMemoryEnvelope<T> & { ok: true }).data;
}

async function requestWorldMemoryServer<T>(input: {
  baseUrl: string;
  body?: Record<string, unknown>;
  fetchImpl?: WorldMemoryServerFetch;
  method: "GET" | "POST";
  path: string;
}): Promise<T> {
  const fetchImpl = input.fetchImpl ?? globalWorldMemoryFetch();

  if (fetchImpl === undefined) {
    throw new WorldMemoryServerClientError(
      0,
      "missing_world_memory_fetch",
      "A fetch implementation is required to call the world-memory server.",
    );
  }

  const url = endpoint(input.baseUrl, input.path);
  const response = await fetchImpl(url, {
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    headers:
      input.body === undefined
        ? undefined
        : {
            "content-type": "application/json",
          },
    method: input.method,
  });

  return readJsonEnvelope<T>(response, url);
}

export async function ingestWorldMemoryServerEvents(input: {
  baseUrl: string;
  events: readonly unknown[];
  fetchImpl?: WorldMemoryServerFetch;
  maxRecords?: number;
  savedAt: string;
}): Promise<FileWorldMemoryIngestResult> {
  return requestWorldMemoryServer<FileWorldMemoryIngestResult>({
    baseUrl: input.baseUrl,
    body: {
      events: input.events,
      maxRecords: input.maxRecords,
      savedAt: input.savedAt,
    },
    fetchImpl: input.fetchImpl,
    method: "POST",
    path: "/memory/ingest",
  });
}

export async function recallWorldMemoryServer(input: {
  baseUrl: string;
  fetchImpl?: WorldMemoryServerFetch;
  now?: string;
}): Promise<AdapterResult> {
  const search = input.now === undefined ? "" : `?now=${encodeURIComponent(input.now)}`;

  return requestWorldMemoryServer<AdapterResult>({
    baseUrl: input.baseUrl,
    fetchImpl: input.fetchImpl,
    method: "GET",
    path: `/memory/recall${search}`,
  });
}

export async function planWorldMemoryServer(input: {
  baseUrl: string;
  fetchImpl?: WorldMemoryServerFetch;
  maxAgents?: number;
  memoriesPerAgent?: number;
  now?: string;
  previousEvents?: readonly unknown[];
}): Promise<AdapterResult> {
  return requestWorldMemoryServer<AdapterResult>({
    baseUrl: input.baseUrl,
    body: {
      maxAgents: input.maxAgents,
      memoriesPerAgent: input.memoriesPerAgent,
      now: input.now,
      previousEvents: input.previousEvents,
    },
    fetchImpl: input.fetchImpl,
    method: "POST",
    path: "/memory/plan",
  });
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];

  return typeof field === "string" && field.trim().length > 0 ? field : undefined;
}

function readNumber(value: Record<string, unknown>, key: string): number | undefined {
  const field = value[key];

  return typeof field === "number" && Number.isFinite(field) ? field : undefined;
}

function readStringArray(value: Record<string, unknown>, key: string): string[] {
  const field = value[key];

  return Array.isArray(field)
    ? field.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readMemorySourceType(
  value: Record<string, unknown>,
  fallback: AgentEvent["type"],
): PersistentMemoryRecord["sourceType"] | undefined {
  const sourceType = readString(value, "sourceType") ?? fallback;

  return sourceType === "memory_read" || sourceType === "memory_write"
    ? sourceType
    : undefined;
}

function durableMemoryMetadata(event: AgentEvent): Record<string, unknown> | undefined {
  const metadata: AgentEventMetadata | undefined = event.metadata;
  const durableMemory = metadata?.durableMemory;

  return isRecord(durableMemory) ? durableMemory : undefined;
}

export function extractProviderRecordsFromRecallEvents(
  events: readonly AgentEvent[],
  savedAt: string,
): PersistentMemoryRecord[] {
  return events.flatMap((event): PersistentMemoryRecord[] => {
    if (event.type !== "memory_read" && event.type !== "memory_write") {
      return [];
    }

    const durableMemory = durableMemoryMetadata(event);

    if (durableMemory === undefined) {
      return [];
    }

    const sourceType = readMemorySourceType(durableMemory, event.type);

    if (sourceType === undefined) {
      return [];
    }

    return [
      {
        id: readString(durableMemory, "recordId") ?? `memory:${event.runId}:${event.id}`,
        sourceEventId: readString(durableMemory, "sourceEventId") ?? event.id,
        sourceRunId: readString(durableMemory, "sourceRunId") ?? event.runId,
        sourceTaskId: readString(durableMemory, "sourceTaskId") ?? event.taskId,
        sourceSequence: readNumber(durableMemory, "sourceSequence") ?? event.sequence,
        sourceTimestamp:
          readString(durableMemory, "sourceTimestamp") ?? event.timestamp,
        sourceType,
        agentId: event.agentId,
        agentName: event.agentName,
        agentRole: event.agentRole,
        content: readString(durableMemory, "content") ?? event.content,
        summary: readString(durableMemory, "summary") ?? event.summary,
        locationHint: readString(durableMemory, "originalLocationHint") as
          | PersistentMemoryRecord["locationHint"]
          | undefined,
        subLocationId: readString(durableMemory, "originalSubLocationId"),
        activity: readString(durableMemory, "originalActivity"),
        memoryId: readString(durableMemory, "memoryId"),
        memoryKind: readString(durableMemory, "memoryKind"),
        retrievalQuery: readString(durableMemory, "retrievalQuery"),
        retrievedMemoryIds: readStringArray(durableMemory, "retrievedMemoryIds"),
        importance: readNumber(durableMemory, "importance"),
        tags: readStringArray(durableMemory, "tags"),
        savedAt: readString(durableMemory, "savedAt") ?? savedAt,
      },
    ];
  });
}

export async function runWorldMemoryProviderLoop(
  input: WorldMemoryProviderLoopInput,
): Promise<WorldMemoryProviderLoopResult> {
  const savedAt = input.savedAt ?? input.now ?? new Date().toISOString();
  const validation = validateEventStream(input.events);
  const acceptedInputEvents = validation.events;
  const invalidInputEvents = validation.quarantinedEvents.map(
    quarantineProviderLoopInputEvent,
  );
  const ingestResult = await ingestWorldMemoryServerEvents({
    baseUrl: input.worldMemoryBaseUrl,
    events: input.events,
    fetchImpl: input.worldMemoryFetchImpl,
    maxRecords: input.maxRecords,
    savedAt,
  });
  const recallResult = await recallWorldMemoryServer({
    baseUrl: input.worldMemoryBaseUrl,
    fetchImpl: input.worldMemoryFetchImpl,
    now: input.now,
  });
  const providerRecords = extractProviderRecordsFromRecallEvents(
    recallResult.events,
    savedAt,
  );
  const memoryPlanResult = await planWorldMemoryServer({
    baseUrl: input.worldMemoryBaseUrl,
    fetchImpl: input.worldMemoryFetchImpl,
    maxAgents: input.memoryPlanMaxAgents ?? input.maxAgents,
    memoriesPerAgent: input.memoriesPerAgent,
    now: input.now,
    previousEvents: acceptedInputEvents,
  });
  const providerPreviousEvents = [
    ...acceptedInputEvents,
    ...memoryPlanResult.events,
  ];
  const providerRequest = buildSmallvilleLlmPlannerRequest({
    maxAgents: input.maxAgents,
    maxMemoryRecords: input.maxMemoryRecords,
    now: input.now,
    previousEvents: providerPreviousEvents,
    records: providerRecords,
  });
  const providerResult = await callOpenAiLlmPlanner({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    fetchImpl: input.fetchImpl,
    maxAgents: input.maxAgents,
    maxMemoryRecords: input.maxMemoryRecords,
    maxOutputTokens: input.maxOutputTokens,
    model: input.model,
    now: input.now,
    previousEvents: providerPreviousEvents,
    records: providerRecords,
    request: providerRequest,
  });
  const warnings = [
    ...ingestResult.warnings,
    ...recallResult.warnings,
    ...memoryPlanResult.warnings,
    ...providerResult.warnings,
  ];
  const quarantinedEvents = [
    ...invalidInputEvents,
    ...ingestResult.quarantinedEvents,
    ...recallResult.quarantinedEvents,
    ...memoryPlanResult.quarantinedEvents,
    ...providerResult.quarantinedEvents,
  ];

  if (providerRecords.length === 0) {
    warnings.push(
      loopWarning({
        code: "world_memory_provider_loop_no_recall_records",
        message:
          "World-memory server recall returned no durable records for the provider request.",
        source: WORLD_MEMORY_SOURCE,
      }),
    );
  }

  return {
    acceptedInputEvents,
    ingestResult,
    memoryPlanResult,
    providerRecords,
    providerRequest,
    providerResult,
    quarantinedEvents,
    recallResult,
    warnings,
  };
}
