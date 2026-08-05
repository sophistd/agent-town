import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import {
  mockSmallvilleCognitiveRun,
  mockSmallvilleRoutineRun,
  mockSmallvilleSocialRun,
} from "../events/generativeRuntime";
import type {
  AgentEvent,
  AgentEventMetadata,
  AgentEventSource,
} from "../events/types";
import { validateEventStream } from "../events/validators";
import {
  startWorldMemoryHttpServer,
  type StartedWorldMemoryHttpServer,
  type WorldMemoryProviderLoopHttpResult,
} from "./worldMemoryHttpServer";

const DEFAULT_BATCH_SIZE = 30;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_START_TIMESTAMP = "2026-07-04T22:00:00.000Z";
const EXTERNAL_RUNTIME_SOURCE: AgentEventSource = "custom";

export type SmallvilleExternalRuntimeScenario =
  | "cognitive"
  | "routine"
  | "social";

export type SmallvilleExternalRuntimeStreamInput = {
  apiKey?: string;
  baseUrl?: string;
  batchSize?: number;
  eventLogPath?: string;
  fetchImpl?: OpenAiResponsesFetch;
  host?: string;
  maxAgents?: number;
  maxEvents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryFilePath: string;
  memoryPlanMaxAgents?: number;
  model?: string;
  outputPath?: string;
  port?: number;
  scenario?: SmallvilleExternalRuntimeScenario;
  startTimestamp?: string;
  tickMinutes?: number;
};

export type SmallvilleExternalRuntimeTickSummary = {
  acceptedInputEventCount: number;
  batchId: string;
  emittedEventCount: number;
  firstSequence: number;
  lastSequence: number;
  memoryPlanEventCount: number;
  providerRecordCount: number;
  providerRequest: {
    memoryRecordCount: number;
    promptHash: string;
    requestId: string;
    retrievalCount: number;
    selectedRecordCount: number;
  };
  providerResult: {
    eventCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
  quarantinedEventCodes: string[];
  recallEventCount: number;
  tickIndex: number;
  warningCodes: string[];
  worldMemoryIngest: {
    acceptedEventCount: number;
    incomingRecordCount: number;
    persistedRecordCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
};

export type SmallvilleExternalRuntimeStreamSummary = {
  apiKeyProvided: boolean;
  batchSize: number;
  emittedEventCount: number;
  eventLogPath?: string;
  memoryFilePath: string;
  outputPath?: string;
  runId: string;
  scenario: SmallvilleExternalRuntimeScenario;
  server: {
    url: string;
  };
  source: "smallville-external-runtime-stream";
  startTimestamp: string;
  taskId: string;
  tickCount: number;
  ticks: SmallvilleExternalRuntimeTickSummary[];
  totals: {
    acceptedInputEventCount: number;
    finalPersistedRecordCount: number;
    memoryPlanEventCount: number;
    providerEventCount: number;
    providerRecordCount: number;
    quarantinedEventCount: number;
    recallEventCount: number;
    warningCount: number;
  };
  warningCodes: string[];
};

export type SmallvilleExternalRuntimeStreamResult = {
  emittedEvents: AgentEvent[];
  providerLoopResults: WorldMemoryProviderLoopHttpResult[];
  summary: SmallvilleExternalRuntimeStreamSummary;
};

type ProviderLoopEnvelope =
  | {
      data: WorldMemoryProviderLoopHttpResult;
      ok: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      ok: false;
    };

class SmallvilleExternalRuntimeStreamError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function codes(items: readonly { code: string }[]): string[] {
  return items.map((item) => item.code);
}

function uniqueCodes(results: readonly WorldMemoryProviderLoopHttpResult[]): string[] {
  return Array.from(new Set(results.flatMap((result) => codes(result.warnings))));
}

function sourceEventsForScenario(
  scenario: SmallvilleExternalRuntimeScenario,
): readonly AgentEvent[] {
  switch (scenario) {
    case "cognitive":
      return mockSmallvilleCognitiveRun;
    case "routine":
      return mockSmallvilleRoutineRun;
    case "social":
      return mockSmallvilleSocialRun;
  }
}

function timestampAt(
  startTimestamp: string,
  sequence: number,
  tickMinutes: number,
): string {
  const timestamp = new Date(startTimestamp);
  timestamp.setUTCMinutes(timestamp.getUTCMinutes() + sequence * tickMinutes);

  return timestamp.toISOString();
}

function tagsForEvent(metadata: AgentEventMetadata | undefined): string[] {
  const tags = Array.isArray(metadata?.tags)
    ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return Array.from(new Set([...tags, "external-runtime", "provider-loop"]));
}

function normalizeExternalRuntimeEvents(input: {
  maxEvents?: number;
  scenario: SmallvilleExternalRuntimeScenario;
  startTimestamp: string;
  tickMinutes: number;
}): AgentEvent[] {
  const sourceEvents = sourceEventsForScenario(input.scenario);
  const selectedEvents =
    input.maxEvents === undefined ? sourceEvents : sourceEvents.slice(0, input.maxEvents);
  const runId = `run-external-runtime-${input.scenario}`;
  const taskId = `task-external-runtime-${input.scenario}`;

  return selectedEvents.map((event, sequence): AgentEvent => ({
    ...event,
    id: `external-runtime-${input.scenario}-${String(sequence).padStart(3, "0")}`,
    metadata: {
      ...event.metadata,
      externalRuntime: {
        originalEventId: event.id,
        originalRunId: event.runId,
        originalSequence: event.sequence,
        scenario: input.scenario,
        stream: "smallville-external-runtime-stream",
      },
      source: EXTERNAL_RUNTIME_SOURCE,
      tags: tagsForEvent(event.metadata),
    },
    parentEventId: undefined,
    runId,
    sequence,
    taskId,
    timestamp: timestampAt(input.startTimestamp, sequence, input.tickMinutes),
  }));
}

function batches<T>(items: readonly T[], batchSize: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    result.push(items.slice(index, index + batchSize));
  }

  return result;
}

async function readProviderLoopEnvelope(
  response: Response,
): Promise<WorldMemoryProviderLoopHttpResult> {
  const raw = await response.text();
  let envelope: ProviderLoopEnvelope;

  try {
    envelope = JSON.parse(raw) as ProviderLoopEnvelope;
  } catch (error) {
    throw new SmallvilleExternalRuntimeStreamError(
      response.status,
      "invalid_external_runtime_provider_loop_json",
      error instanceof Error
        ? `Provider-loop response must be JSON: ${error.message}.`
        : "Provider-loop response must be JSON.",
    );
  }

  if (!response.ok || envelope.ok === false) {
    const code =
      envelope.ok === false
        ? envelope.error.code
        : "external_runtime_provider_loop_request_failed";
    const message =
      envelope.ok === false
        ? envelope.error.message
        : `Provider-loop request failed with status ${response.status}.`;

    throw new SmallvilleExternalRuntimeStreamError(response.status, code, message);
  }

  return envelope.data;
}

async function postProviderLoopTick(input: {
  batch: readonly AgentEvent[];
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryPlanMaxAgents?: number;
  model?: string;
  now: string;
  savedAt: string;
  server: StartedWorldMemoryHttpServer;
}): Promise<WorldMemoryProviderLoopHttpResult> {
  const response = await fetch(`${input.server.url}/provider-loop`, {
    body: JSON.stringify({
      events: input.batch,
      maxAgents: input.maxAgents,
      maxMemoryRecords: input.maxMemoryRecords,
      maxOutputTokens: input.maxOutputTokens,
      maxRecords: input.maxRecords,
      memoriesPerAgent: input.memoriesPerAgent,
      memoryPlanMaxAgents: input.memoryPlanMaxAgents,
      model: input.model,
      now: input.now,
      savedAt: input.savedAt,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  return readProviderLoopEnvelope(response);
}

function tickSummary(input: {
  batch: readonly AgentEvent[];
  result: WorldMemoryProviderLoopHttpResult;
  tickIndex: number;
}): SmallvilleExternalRuntimeTickSummary {
  const first = input.batch[0];
  const last = input.batch[input.batch.length - 1] ?? first;
  const summary = input.result.summary;

  return {
    acceptedInputEventCount: summary.acceptedInputEventCount,
    batchId: `runtime-tick-${String(input.tickIndex).padStart(2, "0")}`,
    emittedEventCount: input.batch.length,
    firstSequence: first?.sequence ?? 0,
    lastSequence: last?.sequence ?? 0,
    memoryPlanEventCount: summary.memoryPlanEventCount,
    providerRecordCount: summary.providerRecordCount,
    providerRequest: summary.providerRequest,
    providerResult: summary.providerResult,
    quarantinedEventCodes: summary.quarantinedEventCodes,
    recallEventCount: summary.recallEventCount,
    tickIndex: input.tickIndex,
    warningCodes: summary.warningCodes,
    worldMemoryIngest: summary.worldMemoryIngest,
  };
}

function totalWarnings(results: readonly WorldMemoryProviderLoopHttpResult[]): number {
  return results.reduce((count, result) => count + result.warnings.length, 0);
}

function totalQuarantines(results: readonly WorldMemoryProviderLoopHttpResult[]): number {
  return results.reduce(
    (count, result) => count + result.quarantinedEvents.length,
    0,
  );
}

function buildSummary(input: {
  apiKeyProvided: boolean;
  batchSize: number;
  emittedEvents: readonly AgentEvent[];
  eventLogPath?: string;
  memoryFilePath: string;
  outputPath?: string;
  providerLoopResults: readonly WorldMemoryProviderLoopHttpResult[];
  scenario: SmallvilleExternalRuntimeScenario;
  server: StartedWorldMemoryHttpServer;
  startTimestamp: string;
  tickSummaries: SmallvilleExternalRuntimeTickSummary[];
}): SmallvilleExternalRuntimeStreamSummary {
  const providerLoopResults = input.providerLoopResults;
  const finalTick = input.tickSummaries[input.tickSummaries.length - 1];

  return {
    apiKeyProvided: input.apiKeyProvided,
    batchSize: input.batchSize,
    emittedEventCount: input.emittedEvents.length,
    eventLogPath: input.eventLogPath,
    memoryFilePath: input.memoryFilePath,
    outputPath: input.outputPath,
    runId: input.emittedEvents[0]?.runId ?? `run-external-runtime-${input.scenario}`,
    scenario: input.scenario,
    server: {
      url: input.server.url,
    },
    source: "smallville-external-runtime-stream",
    startTimestamp: input.startTimestamp,
    taskId: input.emittedEvents[0]?.taskId ?? `task-external-runtime-${input.scenario}`,
    tickCount: input.tickSummaries.length,
    ticks: input.tickSummaries,
    totals: {
      acceptedInputEventCount: input.tickSummaries.reduce(
        (count, tick) => count + tick.acceptedInputEventCount,
        0,
      ),
      finalPersistedRecordCount:
        finalTick?.worldMemoryIngest.persistedRecordCount ?? 0,
      memoryPlanEventCount: input.tickSummaries.reduce(
        (count, tick) => count + tick.memoryPlanEventCount,
        0,
      ),
      providerEventCount: providerLoopResults.reduce(
        (count, result) => count + result.events.length,
        0,
      ),
      providerRecordCount: input.tickSummaries.reduce(
        (count, tick) => count + tick.providerRecordCount,
        0,
      ),
      quarantinedEventCount: totalQuarantines(providerLoopResults),
      recallEventCount: input.tickSummaries.reduce(
        (count, tick) => count + tick.recallEventCount,
        0,
      ),
      warningCount: totalWarnings(providerLoopResults),
    },
    warningCodes: uniqueCodes(providerLoopResults),
  };
}

async function writeJsonFile(
  outputPath: string | undefined,
  value: unknown,
): Promise<void> {
  if (outputPath === undefined) {
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeEventLog(
  eventLogPath: string | undefined,
  events: readonly AgentEvent[],
): Promise<void> {
  if (eventLogPath === undefined) {
    return;
  }

  await mkdir(dirname(eventLogPath), { recursive: true });
  await writeFile(
    eventLogPath,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8",
  );
}

function requirePositiveInteger(value: number | undefined, fallback: number): number {
  const selectedValue = value ?? fallback;

  if (!Number.isInteger(selectedValue) || selectedValue <= 0) {
    throw new Error(`Expected a positive integer, received ${selectedValue}.`);
  }

  return selectedValue;
}

export async function runSmallvilleExternalRuntimeStream(
  input: SmallvilleExternalRuntimeStreamInput,
): Promise<SmallvilleExternalRuntimeStreamResult> {
  const scenario = input.scenario ?? "social";
  const batchSize = requirePositiveInteger(input.batchSize, DEFAULT_BATCH_SIZE);
  const tickMinutes = requirePositiveInteger(input.tickMinutes, 1);
  const startTimestamp = input.startTimestamp ?? DEFAULT_START_TIMESTAMP;
  const emittedEvents = normalizeExternalRuntimeEvents({
    maxEvents: input.maxEvents,
    scenario,
    startTimestamp,
    tickMinutes,
  });
  const validation = validateEventStream(emittedEvents);

  if (validation.quarantinedEvents.length > 0) {
    throw new Error("External runtime generated invalid canonical AgentEvent output.");
  }

  const apiKey = input.apiKey?.trim();
  const server = await startWorldMemoryHttpServer({
    filePath: input.memoryFilePath,
    host: input.host ?? DEFAULT_HOST,
    maxRecords: input.maxRecords,
    port: input.port ?? 0,
    providerLoop: {
      apiKey,
      baseUrl: input.baseUrl,
      fetchImpl: input.fetchImpl,
      maxAgents: input.maxAgents,
      maxMemoryRecords: input.maxMemoryRecords,
      maxOutputTokens: input.maxOutputTokens,
      memoriesPerAgent: input.memoriesPerAgent,
      memoryPlanMaxAgents: input.memoryPlanMaxAgents,
      model: input.model,
    },
  });

  try {
    const providerLoopResults: WorldMemoryProviderLoopHttpResult[] = [];
    const tickSummaries: SmallvilleExternalRuntimeTickSummary[] = [];

    for (const [tickIndex, batch] of batches(emittedEvents, batchSize).entries()) {
      const tickNow = batch[batch.length - 1]?.timestamp ?? startTimestamp;
      const result = await postProviderLoopTick({
        batch,
        maxAgents: input.maxAgents,
        maxMemoryRecords: input.maxMemoryRecords,
        maxOutputTokens: input.maxOutputTokens,
        maxRecords: input.maxRecords,
        memoriesPerAgent: input.memoriesPerAgent,
        memoryPlanMaxAgents: input.memoryPlanMaxAgents,
        model: input.model,
        now: tickNow,
        savedAt: tickNow,
        server,
      });

      providerLoopResults.push(result);
      tickSummaries.push(tickSummary({ batch, result, tickIndex }));
    }

    const summary = buildSummary({
      apiKeyProvided: apiKey !== undefined && apiKey.length > 0,
      batchSize,
      emittedEvents,
      eventLogPath: input.eventLogPath,
      memoryFilePath: input.memoryFilePath,
      outputPath: input.outputPath,
      providerLoopResults,
      scenario,
      server,
      startTimestamp,
      tickSummaries,
    });

    await writeEventLog(input.eventLogPath, emittedEvents);
    await writeJsonFile(input.outputPath, summary);

    return {
      emittedEvents,
      providerLoopResults,
      summary,
    };
  } finally {
    await server.close();
  }
}
