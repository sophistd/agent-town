import { mkdir, writeFile } from "node:fs/promises";
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
  eventLogPath?: string;
  eventsPerTick?: number;
  fetchImpl?: OpenAiResponsesFetch;
  host?: string;
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryFilePath: string;
  memoryPlanMaxAgents?: number;
  model?: string;
  outputPath?: string;
  phasePlan?: readonly SmallvilleAutonomousSchedulerPhasePlan[];
  port?: number;
  scheduleId?: string;
  startTimestamp?: string;
  tickCount?: number;
  tickDelayMs?: number;
  tickMinutes?: number;
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
  emittedEvents: readonly AgentEvent[];
  eventLogPath?: string;
  eventsPerTick: number;
  memoryFilePath: string;
  outputPath?: string;
  providerLoopResults: readonly WorldMemoryProviderLoopHttpResult[];
  scheduleId: string;
  server: StartedWorldMemoryHttpServer;
  startTimestamp: string;
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
  const eventsPerTick = requirePositiveInteger(
    input.eventsPerTick,
    DEFAULT_EVENTS_PER_TICK,
  );
  const tickCount = requirePositiveInteger(input.tickCount, DEFAULT_TICK_COUNT);
  const tickDelayMs = requireNonNegativeInteger(input.tickDelayMs, 0);
  const tickMinutes = requirePositiveInteger(
    input.tickMinutes,
    DEFAULT_TICK_MINUTES,
  );
  const phasePlan =
    input.phasePlan ?? defaultSmallvilleAutonomousSchedulerPhasePlan;
  const scheduleId = input.scheduleId ?? "day-001";
  const startTimestamp = input.startTimestamp ?? DEFAULT_START_TIMESTAMP;
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

    for (let tickIndex = 0; tickIndex < tickCount; tickIndex += 1) {
      const selectedPhasePlan = phasePlanAt(phasePlan, tickIndex);
      const batch = normalizeTickEvents({
        eventsPerTick,
        phasePlan: selectedPhasePlan,
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
          phasePlan: selectedPhasePlan,
          result,
          tickIndex,
        }),
      );

      if (tickDelayMs > 0 && tickIndex < tickCount - 1) {
        await delay(tickDelayMs);
      }
    }

    const summary = buildSummary({
      apiKeyProvided: apiKey !== undefined && apiKey.length > 0,
      emittedEvents,
      eventLogPath: input.eventLogPath,
      eventsPerTick,
      memoryFilePath: input.memoryFilePath,
      outputPath: input.outputPath,
      providerLoopResults,
      scheduleId,
      server,
      startTimestamp,
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
