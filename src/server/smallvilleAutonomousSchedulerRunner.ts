import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

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

const DEFAULT_EVENTS_PER_TICK = 12;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_START_TIMESTAMP = "2026-07-05T07:00:00.000Z";
const DEFAULT_TICK_COUNT = 8;
const DEFAULT_TICK_MINUTES = 60;
const SCHEDULER_SOURCE: AgentEventSource = "custom";

export type SmallvilleAutonomousSchedulerScenario =
  | "cognitive"
  | "routine"
  | "social";

export type SmallvilleAutonomousSchedulerPhase =
  | "morning_routine"
  | "work_coordination"
  | "midday_social"
  | "afternoon_routine"
  | "evening_reflection"
  | "evening_social";

export type SmallvilleAutonomousSchedulerPhasePlan = {
  intent: string;
  phase: SmallvilleAutonomousSchedulerPhase;
  scenario: SmallvilleAutonomousSchedulerScenario;
  sourceOffset?: number;
};

export type SmallvilleAutonomousSchedulerInput = {
  apiKey?: string;
  baseUrl?: string;
  checkpointPath?: string;
  eventLogPath?: string;
  eventsPerTick?: number;
  fetchImpl?: OpenAiResponsesFetch;
  host?: string;
  maxAgents?: number;
  maxElapsedMs?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryFilePath: string;
  memoryPlanMaxAgents?: number;
  model?: string;
  nowMs?: () => number;
  outputPath?: string;
  phasePlan?: readonly SmallvilleAutonomousSchedulerPhasePlan[];
  port?: number;
  resume?: boolean;
  scheduleId?: string;
  startTimestamp?: string;
  tickCount?: number;
  tickDelayMs?: number;
  tickMinutes?: number;
};

export type SmallvilleAutonomousSchedulerCheckpoint = {
  completedTickCount: number;
  eventsPerTick: number;
  lastCompletedTick?: SmallvilleAutonomousSchedulerTickSummary;
  lastEventSequence?: number;
  lastUpdatedAt: string;
  memoryFilePath: string;
  nextTickIndex: number;
  phasePlan: SmallvilleAutonomousSchedulerPhasePlan[];
  scheduleId: string;
  schemaVersion: 1;
  source: "smallville-autonomous-scheduler-checkpoint";
  startTimestamp: string;
  tickMinutes: number;
};

export type SmallvilleAutonomousSchedulerTickSummary = {
  acceptedInputEventCount: number;
  emittedEventCount: number;
  firstSequence: number;
  lastSequence: number;
  memoryPlanEventCount: number;
  phase: SmallvilleAutonomousSchedulerPhase;
  phaseIntent: string;
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
  scenario: SmallvilleAutonomousSchedulerScenario;
  sourceOffset: number;
  tickId: string;
  tickIndex: number;
  virtualClock: {
    dayIndex: number;
    minuteOfDay: number;
    timestamp: string;
  };
  warningCodes: string[];
  worldMemoryIngest: {
    acceptedEventCount: number;
    incomingRecordCount: number;
    persistedRecordCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
};

export type SmallvilleAutonomousSchedulerSummary = {
  apiKeyProvided: boolean;
  bounded: true;
  checkpoint: {
    path?: string;
    previousCompletedTickCount: number;
    resumeRequested: boolean;
    resumed: boolean;
    startTickIndex: number;
    written: boolean;
  };
  emittedEventCount: number;
  eventLogPath?: string;
  eventsPerTick: number;
  memoryFilePath: string;
  outputPath?: string;
  phaseCounts: Record<SmallvilleAutonomousSchedulerPhase, number>;
  runId: string;
  scheduleId: string;
  scenarioCounts: Record<SmallvilleAutonomousSchedulerScenario, number>;
  server: {
    url: string;
  };
  source: "smallville-autonomous-scheduler";
  startTimestamp: string;
  supervision: {
    elapsedMs: number;
    finishedAt: string;
    maxElapsedMs?: number;
    requestedTickCount: number;
    startedAt: string;
    stopReason:
      | "elapsed_time_limit_reached"
      | "tick_count_reached";
  };
  taskId: string;
  tickCount: number;
  tickDelayMs: number;
  tickMinutes: number;
  ticks: SmallvilleAutonomousSchedulerTickSummary[];
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

export type SmallvilleAutonomousSchedulerResult = {
  emittedEvents: AgentEvent[];
  providerLoopResults: WorldMemoryProviderLoopHttpResult[];
  summary: SmallvilleAutonomousSchedulerSummary;
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

class SmallvilleAutonomousSchedulerError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const defaultSmallvilleAutonomousSchedulerPhasePlan: readonly SmallvilleAutonomousSchedulerPhasePlan[] =
  [
    {
      intent: "Agents wake into planned routines and write early memory evidence.",
      phase: "morning_routine",
      scenario: "routine",
      sourceOffset: 0,
    },
    {
      intent: "Coordinators retrieve prior evidence and decide the day's shared work.",
      phase: "work_coordination",
      scenario: "cognitive",
      sourceOffset: 0,
    },
    {
      intent: "The town social graph spreads a public invitation across relationships.",
      phase: "midday_social",
      scenario: "social",
      sourceOffset: 0,
    },
    {
      intent: "Agents continue routine work with memory from the morning already persisted.",
      phase: "afternoon_routine",
      scenario: "routine",
      sourceOffset: 60,
    },
    {
      intent: "Reviewers and memory agents reflect on the day's accumulated evidence.",
      phase: "evening_reflection",
      scenario: "cognitive",
      sourceOffset: 15,
    },
    {
      intent: "Late social coordination closes the day in the public square.",
      phase: "evening_social",
      scenario: "social",
      sourceOffset: 90,
    },
  ];

function codes(items: readonly { code: string }[]): string[] {
  return items.map((item) => item.code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueCodes(results: readonly WorldMemoryProviderLoopHttpResult[]): string[] {
  return Array.from(new Set(results.flatMap((result) => codes(result.warnings))));
}

function sourceEventsForScenario(
  scenario: SmallvilleAutonomousSchedulerScenario,
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

function timestampAtMinute(startTimestamp: string, minuteOffset: number): string {
  const timestamp = new Date(startTimestamp);
  timestamp.setUTCMinutes(timestamp.getUTCMinutes() + minuteOffset);

  return timestamp.toISOString();
}

function minuteOfDay(timestamp: string): number {
  const date = new Date(timestamp);

  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function tagsForEvent(
  metadata: AgentEventMetadata | undefined,
  input: {
    phase: SmallvilleAutonomousSchedulerPhase;
    scenario: SmallvilleAutonomousSchedulerScenario;
  },
): string[] {
  const tags = Array.isArray(metadata?.tags)
    ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return Array.from(
    new Set([
      ...tags,
      "autonomous-scheduler",
      "world-clock",
      input.phase,
      input.scenario,
    ]),
  );
}

function requirePositiveInteger(value: number | undefined, fallback: number): number {
  const selectedValue = value ?? fallback;

  if (!Number.isInteger(selectedValue) || selectedValue <= 0) {
    throw new Error(`Expected a positive integer, received ${selectedValue}.`);
  }

  return selectedValue;
}

function requireNonNegativeInteger(value: number | undefined, fallback: number): number {
  const selectedValue = value ?? fallback;

  if (!Number.isInteger(selectedValue) || selectedValue < 0) {
    throw new Error(`Expected a non-negative integer, received ${selectedValue}.`);
  }

  return selectedValue;
}

function requireOptionalPositiveInteger(
  value: number | undefined,
  name: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, received ${value}.`);
  }

  return value;
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Scheduler checkpoint field ${key} must be a non-empty string.`);
  }

  return value;
}

function readIntegerField(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];

  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`Scheduler checkpoint field ${key} must be a non-negative integer.`);
  }

  return Number(value);
}

function parsePhasePlan(
  value: unknown,
): SmallvilleAutonomousSchedulerPhasePlan[] {
  if (!Array.isArray(value)) {
    throw new Error("Scheduler checkpoint phasePlan must be an array.");
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new Error("Scheduler checkpoint phasePlan entries must be objects.");
    }

    const sourceOffset = item.sourceOffset;

    if (
      sourceOffset !== undefined &&
      (!Number.isInteger(sourceOffset) || Number(sourceOffset) < 0)
    ) {
      throw new Error(
        "Scheduler checkpoint phasePlan sourceOffset must be a non-negative integer.",
      );
    }

    return {
      intent: readStringField(item, "intent"),
      phase: readStringField(item, "phase") as SmallvilleAutonomousSchedulerPhase,
      scenario: readStringField(item, "scenario") as SmallvilleAutonomousSchedulerScenario,
      sourceOffset: sourceOffset === undefined ? undefined : Number(sourceOffset),
    };
  });
}

async function readCheckpoint(
  checkpointPath: string,
): Promise<SmallvilleAutonomousSchedulerCheckpoint> {
  let raw: string;

  try {
    raw = await readFile(checkpointPath, "utf8");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Unable to read scheduler checkpoint ${checkpointPath}: ${error.message}`
        : `Unable to read scheduler checkpoint ${checkpointPath}.`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Scheduler checkpoint ${checkpointPath} is not valid JSON: ${error.message}`
        : `Scheduler checkpoint ${checkpointPath} is not valid JSON.`,
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(`Scheduler checkpoint ${checkpointPath} must be a JSON object.`);
  }

  if (parsed.source !== "smallville-autonomous-scheduler-checkpoint") {
    throw new Error(`Scheduler checkpoint ${checkpointPath} has unsupported source.`);
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error(
      `Scheduler checkpoint ${checkpointPath} has unsupported schemaVersion.`,
    );
  }

  const eventsPerTick = readIntegerField(parsed, "eventsPerTick");
  const tickMinutes = readIntegerField(parsed, "tickMinutes");

  if (eventsPerTick <= 0 || tickMinutes <= 0) {
    throw new Error(
      `Scheduler checkpoint ${checkpointPath} has invalid positive integer fields.`,
    );
  }

  return {
    completedTickCount: readIntegerField(parsed, "completedTickCount"),
    eventsPerTick,
    lastCompletedTick: isRecord(parsed.lastCompletedTick)
      ? (parsed.lastCompletedTick as SmallvilleAutonomousSchedulerTickSummary)
      : undefined,
    lastEventSequence:
      parsed.lastEventSequence === undefined
        ? undefined
        : readIntegerField(parsed, "lastEventSequence"),
    lastUpdatedAt: readStringField(parsed, "lastUpdatedAt"),
    memoryFilePath: readStringField(parsed, "memoryFilePath"),
    nextTickIndex: readIntegerField(parsed, "nextTickIndex"),
    phasePlan: parsePhasePlan(parsed.phasePlan),
    scheduleId: readStringField(parsed, "scheduleId"),
    schemaVersion: 1,
    source: "smallville-autonomous-scheduler-checkpoint",
    startTimestamp: readStringField(parsed, "startTimestamp"),
    tickMinutes,
  };
}

function assertCompatibleCheckpoint(input: {
  checkpoint: SmallvilleAutonomousSchedulerCheckpoint;
  checkpointPath: string;
  eventsPerTick: number;
  memoryFilePath: string;
  phasePlan: readonly SmallvilleAutonomousSchedulerPhasePlan[];
  scheduleId: string;
  startTimestamp: string;
  tickMinutes: number;
}): void {
  const pairs: Array<[string, unknown, unknown]> = [
    ["scheduleId", input.checkpoint.scheduleId, input.scheduleId],
    ["startTimestamp", input.checkpoint.startTimestamp, input.startTimestamp],
    ["eventsPerTick", input.checkpoint.eventsPerTick, input.eventsPerTick],
    ["tickMinutes", input.checkpoint.tickMinutes, input.tickMinutes],
    ["memoryFilePath", input.checkpoint.memoryFilePath, input.memoryFilePath],
  ];

  for (const [key, checkpointValue, requestedValue] of pairs) {
    if (checkpointValue !== requestedValue) {
      throw new Error(
        `Scheduler checkpoint ${input.checkpointPath} ${key} (${String(
          checkpointValue,
        )}) does not match requested ${key} (${String(requestedValue)}).`,
      );
    }
  }

  if (
    JSON.stringify(input.checkpoint.phasePlan) !==
    JSON.stringify([...input.phasePlan])
  ) {
    throw new Error(
      `Scheduler checkpoint ${input.checkpointPath} phasePlan does not match requested phasePlan.`,
    );
  }
}

function phasePlanAt(
  phasePlan: readonly SmallvilleAutonomousSchedulerPhasePlan[],
  tickIndex: number,
): SmallvilleAutonomousSchedulerPhasePlan {
  if (phasePlan.length === 0) {
    throw new Error("Smallville autonomous scheduler requires at least one phase.");
  }

  return phasePlan[tickIndex % phasePlan.length] ?? phasePlan[0];
}

function normalizeTickEvents(input: {
  eventsPerTick: number;
  phasePlan: SmallvilleAutonomousSchedulerPhasePlan;
  scheduleId: string;
  startTimestamp: string;
  tickIndex: number;
  tickMinutes: number;
}): AgentEvent[] {
  const sourceEvents = sourceEventsForScenario(input.phasePlan.scenario);
  const sourceOffset =
    input.phasePlan.sourceOffset ??
    (input.tickIndex * input.eventsPerTick) % sourceEvents.length;
  const tickStartedAt = timestampAtMinute(
    input.startTimestamp,
    input.tickIndex * input.tickMinutes,
  );
  const runId = `run-smallville-scheduler-${input.scheduleId}`;
  const taskId = `task-smallville-scheduler-${input.scheduleId}`;

  return Array.from({ length: input.eventsPerTick }, (_, eventIndex): AgentEvent => {
    const sourceIndex = (sourceOffset + eventIndex) % sourceEvents.length;
    const sourceEvent = sourceEvents[sourceIndex];
    const sequence = input.tickIndex * input.eventsPerTick + eventIndex;
    const eventMinuteOffset =
      input.tickIndex * input.tickMinutes +
      Math.floor((eventIndex * input.tickMinutes) / input.eventsPerTick);
    const timestamp = timestampAtMinute(input.startTimestamp, eventMinuteOffset);

    return {
      ...sourceEvent,
      id: `scheduler-${input.scheduleId}-${String(input.tickIndex).padStart(3, "0")}-${String(eventIndex).padStart(3, "0")}`,
      metadata: {
        ...sourceEvent.metadata,
        scheduler: {
          dayIndex: Math.floor(input.tickIndex / 24),
          eventIndex,
          minuteOfDay: minuteOfDay(tickStartedAt),
          originalEventId: sourceEvent.id,
          originalRunId: sourceEvent.runId,
          originalSequence: sourceEvent.sequence,
          phase: input.phasePlan.phase,
          phaseIntent: input.phasePlan.intent,
          scenario: input.phasePlan.scenario,
          scheduleId: input.scheduleId,
          sourceOffset,
          stream: "smallville-autonomous-scheduler",
          tickIndex: input.tickIndex,
          tickMinutes: input.tickMinutes,
          tickStartedAt,
        },
        source: SCHEDULER_SOURCE,
        tags: tagsForEvent(sourceEvent.metadata, {
          phase: input.phasePlan.phase,
          scenario: input.phasePlan.scenario,
        }),
      },
      parentEventId: undefined,
      runId,
      sequence,
      taskId,
      timestamp,
    };
  });
}

async function readProviderLoopEnvelope(
  response: Response,
): Promise<WorldMemoryProviderLoopHttpResult> {
  const raw = await response.text();
  let envelope: ProviderLoopEnvelope;

  try {
    envelope = JSON.parse(raw) as ProviderLoopEnvelope;
  } catch (error) {
    throw new SmallvilleAutonomousSchedulerError(
      response.status,
      "invalid_scheduler_provider_loop_json",
      error instanceof Error
        ? `Provider-loop response must be JSON: ${error.message}.`
        : "Provider-loop response must be JSON.",
    );
  }

  if (!response.ok || envelope.ok === false) {
    const code =
      envelope.ok === false
        ? envelope.error.code
        : "scheduler_provider_loop_request_failed";
    const message =
      envelope.ok === false
        ? envelope.error.message
        : `Provider-loop request failed with status ${response.status}.`;

    throw new SmallvilleAutonomousSchedulerError(response.status, code, message);
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
  phasePlan: SmallvilleAutonomousSchedulerPhasePlan;
  result: WorldMemoryProviderLoopHttpResult;
  tickIndex: number;
}): SmallvilleAutonomousSchedulerTickSummary {
  const first = input.batch[0];
  const last = input.batch[input.batch.length - 1] ?? first;
  const firstScheduler = first?.metadata?.scheduler as
    | {
        dayIndex?: number;
        minuteOfDay?: number;
        sourceOffset?: number;
        tickStartedAt?: string;
      }
    | undefined;
  const summary = input.result.summary;

  return {
    acceptedInputEventCount: summary.acceptedInputEventCount,
    emittedEventCount: input.batch.length,
    firstSequence: first?.sequence ?? 0,
    lastSequence: last?.sequence ?? 0,
    memoryPlanEventCount: summary.memoryPlanEventCount,
    phase: input.phasePlan.phase,
    phaseIntent: input.phasePlan.intent,
    providerRecordCount: summary.providerRecordCount,
    providerRequest: summary.providerRequest,
    providerResult: summary.providerResult,
    quarantinedEventCodes: summary.quarantinedEventCodes,
    recallEventCount: summary.recallEventCount,
    scenario: input.phasePlan.scenario,
    sourceOffset: firstScheduler?.sourceOffset ?? 0,
    tickId: `scheduler-tick-${String(input.tickIndex).padStart(3, "0")}`,
    tickIndex: input.tickIndex,
    virtualClock: {
      dayIndex: firstScheduler?.dayIndex ?? 0,
      minuteOfDay: firstScheduler?.minuteOfDay ?? 0,
      timestamp: firstScheduler?.tickStartedAt ?? first?.timestamp ?? "",
    },
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

function emptyPhaseCounts(): Record<SmallvilleAutonomousSchedulerPhase, number> {
  return {
    afternoon_routine: 0,
    evening_reflection: 0,
    evening_social: 0,
    midday_social: 0,
    morning_routine: 0,
    work_coordination: 0,
  };
}

function emptyScenarioCounts(): Record<SmallvilleAutonomousSchedulerScenario, number> {
  return {
    cognitive: 0,
    routine: 0,
    social: 0,
  };
}

function buildSummary(input: {
  apiKeyProvided: boolean;
  checkpointPath?: string;
  emittedEvents: readonly AgentEvent[];
  eventLogPath?: string;
  eventsPerTick: number;
  finishedAtMs: number;
  maxElapsedMs?: number;
  memoryFilePath: string;
  outputPath?: string;
  previousCompletedTickCount: number;
  providerLoopResults: readonly WorldMemoryProviderLoopHttpResult[];
  resumeRequested: boolean;
  resumed: boolean;
  requestedTickCount: number;
  scheduleId: string;
  server: StartedWorldMemoryHttpServer;
  startTimestamp: string;
  startTickIndex: number;
  startedAtMs: number;
  stopReason: SmallvilleAutonomousSchedulerSummary["supervision"]["stopReason"];
  tickDelayMs: number;
  tickMinutes: number;
  tickSummaries: readonly SmallvilleAutonomousSchedulerTickSummary[];
}): SmallvilleAutonomousSchedulerSummary {
  const providerLoopResults = input.providerLoopResults;
  const finalTick = input.tickSummaries[input.tickSummaries.length - 1];
  const phaseCounts = emptyPhaseCounts();
  const scenarioCounts = emptyScenarioCounts();

  for (const tick of input.tickSummaries) {
    phaseCounts[tick.phase] += 1;
    scenarioCounts[tick.scenario] += 1;
  }

  return {
    apiKeyProvided: input.apiKeyProvided,
    bounded: true,
    checkpoint: {
      path: input.checkpointPath,
      previousCompletedTickCount: input.previousCompletedTickCount,
      resumeRequested: input.resumeRequested,
      resumed: input.resumed,
      startTickIndex: input.startTickIndex,
      written: input.checkpointPath !== undefined,
    },
    emittedEventCount: input.emittedEvents.length,
    eventLogPath: input.eventLogPath,
    eventsPerTick: input.eventsPerTick,
    memoryFilePath: input.memoryFilePath,
    outputPath: input.outputPath,
    phaseCounts,
    runId:
      input.emittedEvents[0]?.runId ??
      `run-smallville-scheduler-${input.scheduleId}`,
    scheduleId: input.scheduleId,
    scenarioCounts,
    server: {
      url: input.server.url,
    },
    source: "smallville-autonomous-scheduler",
    startTimestamp: input.startTimestamp,
    supervision: {
      elapsedMs: Math.max(0, input.finishedAtMs - input.startedAtMs),
      finishedAt: new Date(input.finishedAtMs).toISOString(),
      maxElapsedMs: input.maxElapsedMs,
      requestedTickCount: input.requestedTickCount,
      startedAt: new Date(input.startedAtMs).toISOString(),
      stopReason: input.stopReason,
    },
    taskId:
      input.emittedEvents[0]?.taskId ??
      `task-smallville-scheduler-${input.scheduleId}`,
    tickCount: input.tickSummaries.length,
    tickDelayMs: input.tickDelayMs,
    tickMinutes: input.tickMinutes,
    ticks: [...input.tickSummaries],
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

async function writeJsonFileAtomic(
  outputPath: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;

  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, outputPath);
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

export async function runSmallvilleAutonomousScheduler(
  input: SmallvilleAutonomousSchedulerInput,
): Promise<SmallvilleAutonomousSchedulerResult> {
  let checkpoint: SmallvilleAutonomousSchedulerCheckpoint | undefined;

  if (input.resume === true) {
    if (input.checkpointPath === undefined) {
      throw new Error("Scheduler resume requires checkpointPath.");
    }

    checkpoint = await readCheckpoint(input.checkpointPath);
  }

  const eventsPerTick = requirePositiveInteger(
    input.eventsPerTick,
    checkpoint?.eventsPerTick ?? DEFAULT_EVENTS_PER_TICK,
  );
  const tickCount = requirePositiveInteger(input.tickCount, DEFAULT_TICK_COUNT);
  const tickDelayMs = requireNonNegativeInteger(input.tickDelayMs, 0);
  const maxElapsedMs = requireOptionalPositiveInteger(
    input.maxElapsedMs,
    "maxElapsedMs",
  );
  const tickMinutes = requirePositiveInteger(
    input.tickMinutes,
    checkpoint?.tickMinutes ?? DEFAULT_TICK_MINUTES,
  );
  const phasePlan =
    input.phasePlan ?? defaultSmallvilleAutonomousSchedulerPhasePlan;
  const scheduleId = input.scheduleId ?? checkpoint?.scheduleId ?? "day-001";
  const startTimestamp =
    input.startTimestamp ?? checkpoint?.startTimestamp ?? DEFAULT_START_TIMESTAMP;
  const selectedPhasePlan = checkpoint?.phasePlan ?? [...phasePlan];
  const startTickIndex = checkpoint?.nextTickIndex ?? 0;
  const previousCompletedTickCount = checkpoint?.completedTickCount ?? 0;
  const nowMs = input.nowMs ?? Date.now;
  const startedAtMs = nowMs();
  let stopReason: SmallvilleAutonomousSchedulerSummary["supervision"]["stopReason"] =
    "tick_count_reached";

  if (checkpoint !== undefined) {
    assertCompatibleCheckpoint({
      checkpoint,
      checkpointPath: input.checkpointPath ?? "",
      eventsPerTick,
      memoryFilePath: input.memoryFilePath,
      phasePlan: selectedPhasePlan,
      scheduleId,
      startTimestamp,
      tickMinutes,
    });
  }

  const emittedEvents: AgentEvent[] = [];
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
    const tickSummaries: SmallvilleAutonomousSchedulerTickSummary[] = [];

    for (
      let tickIndex = startTickIndex;
      tickIndex < startTickIndex + tickCount;
      tickIndex += 1
    ) {
      if (
        maxElapsedMs !== undefined &&
        tickSummaries.length > 0 &&
        nowMs() - startedAtMs >= maxElapsedMs
      ) {
        stopReason = "elapsed_time_limit_reached";
        break;
      }

      const phasePlanForTick = phasePlanAt(selectedPhasePlan, tickIndex);
      const batch = normalizeTickEvents({
        eventsPerTick,
        phasePlan: phasePlanForTick,
        scheduleId,
        startTimestamp,
        tickIndex,
        tickMinutes,
      });
      const validation = validateEventStream(batch);

      if (validation.quarantinedEvents.length > 0) {
        throw new Error("Scheduler generated invalid canonical AgentEvent output.");
      }

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

      emittedEvents.push(...batch);
      providerLoopResults.push(result);
      tickSummaries.push(
        tickSummary({
          batch,
          phasePlan: phasePlanForTick,
          result,
          tickIndex,
        }),
      );

      if (input.checkpointPath !== undefined) {
        const lastCompletedTick = tickSummaries[tickSummaries.length - 1];
        const lastEvent = emittedEvents[emittedEvents.length - 1];
        const checkpointOutput: SmallvilleAutonomousSchedulerCheckpoint = {
          completedTickCount: tickIndex + 1,
          eventsPerTick,
          lastCompletedTick,
          lastEventSequence: lastEvent?.sequence,
          lastUpdatedAt: tickNow,
          memoryFilePath: input.memoryFilePath,
          nextTickIndex: tickIndex + 1,
          phasePlan: [...selectedPhasePlan],
          scheduleId,
          schemaVersion: 1,
          source: "smallville-autonomous-scheduler-checkpoint",
          startTimestamp,
          tickMinutes,
        };

        await writeJsonFileAtomic(input.checkpointPath, checkpointOutput);
      }

      if (
        maxElapsedMs !== undefined &&
        tickIndex < startTickIndex + tickCount - 1 &&
        nowMs() - startedAtMs >= maxElapsedMs
      ) {
        stopReason = "elapsed_time_limit_reached";
        break;
      }

      if (tickDelayMs > 0 && tickIndex < startTickIndex + tickCount - 1) {
        const delayMs =
          maxElapsedMs === undefined
            ? tickDelayMs
            : Math.min(
                tickDelayMs,
                Math.max(0, maxElapsedMs - (nowMs() - startedAtMs)),
              );

        if (delayMs <= 0) {
          stopReason = "elapsed_time_limit_reached";
          break;
        }

        await delay(delayMs);
      }
    }

    const finishedAtMs = nowMs();
    const summary = buildSummary({
      apiKeyProvided: apiKey !== undefined && apiKey.length > 0,
      checkpointPath: input.checkpointPath,
      emittedEvents,
      eventLogPath: input.eventLogPath,
      eventsPerTick,
      finishedAtMs,
      maxElapsedMs,
      memoryFilePath: input.memoryFilePath,
      outputPath: input.outputPath,
      previousCompletedTickCount,
      providerLoopResults,
      resumeRequested: input.resume === true,
      resumed: checkpoint !== undefined,
      requestedTickCount: tickCount,
      scheduleId,
      server,
      startTimestamp,
      startTickIndex,
      startedAtMs,
      stopReason,
      tickDelayMs,
      tickMinutes,
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
