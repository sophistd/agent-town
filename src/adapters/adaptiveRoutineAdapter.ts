import { mockSmallvilleRoutineRun } from "../events/generativeRuntime";
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

const ADAPTIVE_ROUTINE_SOURCE = "custom" satisfies AgentEventSource;
const DEFAULT_ADAPTIVE_ROUTINE_TIMESTAMP = "2026-07-04T20:00:00.000Z";
const DEFAULT_ADAPTIVE_ROUTINE_RUN_ID = "run-smallville-adaptive-routine-001";
const DEFAULT_ADAPTIVE_ROUTINE_TASK_ID = "task-adaptive-routine-planner";
const DEFAULT_MAX_ADAPTIVE_ROUTINE_AGENTS = 25;
const ADAPTIVE_ROUTINE_SCHEMA_VERSION = 1;

export type AdaptiveRoutineObservation = {
  observationId: string;
  content: string;
  affectedLocation: AgentLocation;
  affectedSubLocationId: string;
  revisedLocation: AgentLocation;
  revisedSubLocationId: string;
  revisedActivity: string;
  reason: string;
  importance: number;
};

export type AdaptiveRoutinePlanInput = {
  previousEvents?: readonly AgentEvent[];
  observations?: readonly AdaptiveRoutineObservation[];
  now?: string;
  runId?: string;
  taskId?: string;
  maxAgents?: number;
};

export type AdaptiveRoutineRevisionSummary = {
  agentCount: number;
  revisionCount: number;
  observationCount: number;
  memoryReadCount: number;
  memoryWriteCount: number;
  revisedSubLocationIds: string[];
  sourceRunIds: string[];
};

type RoutineContext = {
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  firstSequence: number;
  latestEventId: string;
  latestRunId: string;
  latestTaskId: string;
  latestContent: string;
  latestSummary?: string;
  latestTimestamp: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  intention: string;
  persona?: string;
  relationshipIds: string[];
  previousRoutineEventIds: string[];
  memoryEventIds: string[];
};

type RetrievedRoutineMemory = {
  memoryId: string;
  sourceEventId: string;
  content: string;
  score: number;
  relevanceScore: number;
  recencyScore: number;
  importanceScore: number;
};

const defaultAdaptiveRoutineObservations: readonly AdaptiveRoutineObservation[] = [
  {
    observationId: "fountain-weather-shift",
    content:
      "Afternoon weather makes square_fountain_edge unreliable, so public-facing plans need an indoor fallback before evening.",
    affectedLocation: "square",
    affectedSubLocationId: "square_fountain_edge",
    revisedLocation: "library",
    revisedSubLocationId: "library_reading_nook",
    revisedActivity: "moves public plan indoors",
    reason: "protect the shared gathering from weather while preserving the social intention",
    importance: 9,
  },
  {
    observationId: "archive-proof-backlog",
    content:
      "The archive shows several accepted memories are not attached to the current day plan.",
    affectedLocation: "archive",
    affectedSubLocationId: "archive_shelves",
    revisedLocation: "archive",
    revisedSubLocationId: "archive_writing_desk",
    revisedActivity: "attaches missing memory evidence",
    reason: "keep the next plan grounded in durable memory before action",
    importance: 8,
  },
  {
    observationId: "workshop-build-risk",
    content:
      "The workshop finds a projection regression that must be checked before any public handoff.",
    affectedLocation: "workshop",
    affectedSubLocationId: "workshop_bench",
    revisedLocation: "workshop",
    revisedSubLocationId: "workshop_debug_desk",
    revisedActivity: "checks projection regression",
    reason: "route implementation agents through verification before visible action",
    importance: 8,
  },
  {
    observationId: "review-deadline",
    content:
      "The review room has an acceptance cutoff before the town can treat the day plan as believable.",
    affectedLocation: "review_room",
    affectedSubLocationId: "review_table",
    revisedLocation: "review_room",
    revisedSubLocationId: "review_evidence_wall",
    revisedActivity: "checks acceptance cutoff",
    reason: "make adversarial evidence visible before the revised routine closes",
    importance: 9,
  },
  {
    observationId: "dispatch-overload",
    content:
      "The dispatch notice wall is crowded, so coordinators should stage assignments in the queue first.",
    affectedLocation: "dispatch_board",
    affectedSubLocationId: "dispatch_notice_wall",
    revisedLocation: "dispatch_board",
    revisedSubLocationId: "dispatch_queue",
    revisedActivity: "stages revised assignments",
    reason: "reduce coordination congestion before routing the next agent",
    importance: 7,
  },
  {
    observationId: "cafe-capacity",
    content:
      "The square cafe can absorb informal follow-up while the fountain edge is unavailable.",
    affectedLocation: "square",
    affectedSubLocationId: "square_cafe",
    revisedLocation: "square",
    revisedSubLocationId: "square_cafe",
    revisedActivity: "keeps informal follow-up alive",
    reason: "preserve social continuity without depending on the blocked fountain edge",
    importance: 7,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestampAt(startTimestamp: string, sequence: number): string {
  const start = new Date(startTimestamp);
  start.setUTCMinutes(start.getUTCMinutes() + sequence);

  return start.toISOString();
}

function startTimestampFor(input: AdaptiveRoutinePlanInput): string {
  return input.now !== undefined && !Number.isNaN(Date.parse(input.now))
    ? input.now
    : DEFAULT_ADAPTIVE_ROUTINE_TIMESTAMP;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function readMetadataString(event: AgentEvent, key: string): string | undefined {
  return readString(event.metadata?.[key]);
}

function readRoutine(event: AgentEvent): Record<string, unknown> | undefined {
  return isRecord(event.metadata?.routine) ? event.metadata.routine : undefined;
}

function hasRoutineEvidence(events: readonly AgentEvent[]): boolean {
  return events.some((event) => readRoutine(event) !== undefined);
}

function previousEventsFor(input: AdaptiveRoutinePlanInput): {
  events: readonly AgentEvent[];
  usedDefaultSeed: boolean;
} {
  const previousEvents = input.previousEvents ?? [];

  if (hasRoutineEvidence(previousEvents)) {
    return { events: previousEvents, usedDefaultSeed: false };
  }

  return { events: mockSmallvilleRoutineRun, usedDefaultSeed: true };
}

function updateRoutineContext(
  current: RoutineContext | undefined,
  event: AgentEvent,
  routine: Record<string, unknown>,
): RoutineContext {
  const subLocationId =
    readString(routine.scheduledSubLocationId) ??
    readMetadataString(event, "subLocationId") ??
    "archive_shelves";
  const activity =
    readString(routine.plannedActivity) ??
    readMetadataString(event, "activity") ??
    event.summary ??
    "revises routine";
  const intention =
    readString(routine.intention) ??
    current?.intention ??
    event.summary ??
    "keep the town routine coherent";
  const memoryEventIds =
    event.type === "memory_read" || event.type === "memory_write"
      ? [...(current?.memoryEventIds ?? []), event.id].slice(-8)
      : current?.memoryEventIds ?? [];

  return {
    agentId: event.agentId,
    agentName: event.agentName,
    agentRole: event.agentRole,
    firstSequence: current?.firstSequence ?? event.sequence,
    latestEventId: event.id,
    latestRunId: event.runId,
    latestTaskId: event.taskId,
    latestContent: event.content,
    latestSummary: event.summary,
    latestTimestamp: event.timestamp,
    locationHint: event.locationHint ?? current?.locationHint ?? "archive",
    subLocationId,
    activity,
    intention,
    persona: readMetadataString(event, "persona") ?? current?.persona,
    relationshipIds: readStringArray(event.metadata?.relationships),
    previousRoutineEventIds: [...(current?.previousRoutineEventIds ?? []), event.id].slice(-12),
    memoryEventIds,
  };
}

function buildRoutineContexts(
  previousEvents: readonly AgentEvent[],
  maxAgents: number,
): RoutineContext[] {
  const contexts = new Map<string, RoutineContext>();

  for (const event of [...previousEvents].sort((left, right) => left.sequence - right.sequence)) {
    const routine = readRoutine(event);

    if (routine === undefined) {
      continue;
    }

    contexts.set(
      event.agentId,
      updateRoutineContext(contexts.get(event.agentId), event, routine),
    );
  }

  return [...contexts.values()]
    .sort((left, right) => {
      if (left.firstSequence !== right.firstSequence) {
        return left.firstSequence - right.firstSequence;
      }

      return left.agentId.localeCompare(right.agentId);
    })
    .slice(0, Math.max(1, maxAgents));
}

function observationForRole(role: AgentRole): AdaptiveRoutineObservation {
  switch (role) {
    case "planner":
      return defaultAdaptiveRoutineObservations[0];
    case "memory":
      return defaultAdaptiveRoutineObservations[1];
    case "coder":
      return defaultAdaptiveRoutineObservations[2];
    case "reviewer":
    case "critic":
      return defaultAdaptiveRoutineObservations[3];
    case "orchestrator":
      return defaultAdaptiveRoutineObservations[4];
    case "researcher":
      return defaultAdaptiveRoutineObservations[0];
    case "custom":
      return defaultAdaptiveRoutineObservations[5];
  }
}

function selectObservation(
  context: RoutineContext,
  observations: readonly AdaptiveRoutineObservation[],
): AdaptiveRoutineObservation {
  const directMatch = observations.find(
    (observation) =>
      observation.affectedSubLocationId === context.subLocationId ||
      observation.affectedLocation === context.locationHint,
  );

  return directMatch ?? observationForRole(context.agentRole);
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function buildRetrievedMemories(
  context: RoutineContext,
  previousEventsById: ReadonlyMap<string, AgentEvent>,
): RetrievedRoutineMemory[] {
  const ids = context.memoryEventIds.length > 0
    ? context.memoryEventIds
    : context.previousRoutineEventIds;

  return ids
    .slice(-3)
    .reverse()
    .map((eventId, index) => {
      const event = previousEventsById.get(eventId);
      const recencyScore = Math.max(0.5, 1 - index * 0.12);
      const relevanceScore = event?.metadata?.routine !== undefined ? 1 : 0.72;
      const importanceScore = event?.type === "memory_write" ? 0.92 : 0.82;

      return {
        memoryId: event === undefined ? eventId : readMetadataString(event, "memoryId") ?? eventId,
        sourceEventId: eventId,
        content: event?.summary ?? event?.content ?? `Prior routine event ${eventId}`,
        score: roundScore(0.45 * relevanceScore + 0.35 * importanceScore + 0.2 * recencyScore),
        relevanceScore: roundScore(relevanceScore),
        recencyScore: roundScore(recencyScore),
        importanceScore: roundScore(importanceScore),
      };
    });
}

function firstKnownTargetAgentId(
  context: RoutineContext,
  knownAgentIds: ReadonlySet<string>,
): string | undefined {
  const relationshipTarget = context.relationshipIds.find(
    (agentId) => agentId !== context.agentId && knownAgentIds.has(agentId),
  );

  if (relationshipTarget !== undefined) {
    return relationshipTarget;
  }

  return [...knownAgentIds].find((agentId) => agentId !== context.agentId);
}

function actionTypeForRole(role: AgentRole): Extract<AgentEventType, "handoff" | "message" | "tool_call"> {
  if (role === "coder") {
    return "tool_call";
  }

  if (role === "planner" || role === "orchestrator") {
    return "handoff";
  }

  return "message";
}

function makeRoutineSegment(input: {
  context: RoutineContext;
  observation: AdaptiveRoutineObservation;
  phase: string;
  sequence: number;
  revisionId: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
}) {
  const startMinute = 840 + input.sequence * 5;

  return {
    dayId: "smallville-adaptive-routine-day-2026-07-04",
    phase: input.phase,
    segmentId: `${input.context.agentId}-${input.phase}-${input.revisionId}`,
    startMinute,
    endMinute: startMinute + 5,
    scheduledLocation: input.locationHint,
    scheduledSubLocationId: input.subLocationId,
    plannedActivity: input.activity,
    intention: input.context.intention,
    revisionId: input.revisionId,
    previousEventId: input.context.latestEventId,
    previousSubLocationId: input.context.subLocationId,
    observationId: input.observation.observationId,
  };
}

function makeAdaptiveRoutineEvent(input: {
  context: RoutineContext;
  observation: AdaptiveRoutineObservation;
  retrievedMemories: readonly RetrievedRoutineMemory[];
  runId: string;
  taskId: string;
  timestamp: string;
  sequence: number;
  type: AgentEventType;
  phase: string;
  cognitiveStage: string;
  summary: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  revisionId: string;
  targetAgentId?: string;
  status?: AgentEventStatus;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  metadata?: Record<string, unknown>;
}): AgentEvent {
  const routine = makeRoutineSegment({
    context: input.context,
    observation: input.observation,
    phase: input.phase,
    sequence: input.sequence,
    revisionId: input.revisionId,
    locationHint: input.locationHint,
    subLocationId: input.subLocationId,
    activity: input.activity,
  });
  const selectedMemoryEventIds = input.retrievedMemories.map((memory) => memory.sourceEventId);
  const routineRevision = {
    schemaVersion: ADAPTIVE_ROUTINE_SCHEMA_VERSION,
    revisionId: input.revisionId,
    observationId: input.observation.observationId,
    observationContent: input.observation.content,
    observationImportance: input.observation.importance,
    reason: input.observation.reason,
    previousRunId: input.context.latestRunId,
    previousTaskId: input.context.latestTaskId,
    previousEventId: input.context.latestEventId,
    previousRoutineEventIds: input.context.previousRoutineEventIds,
    selectedMemoryEventIds,
    previousLocation: input.context.locationHint,
    previousSubLocationId: input.context.subLocationId,
    revisedLocation: input.observation.revisedLocation,
    revisedSubLocationId: input.observation.revisedSubLocationId,
    generatedBy: "deterministic-adaptive-routine-adapter",
  };

  return {
    id: `${input.runId}-${String(input.sequence).padStart(3, "0")}`,
    runId: input.runId,
    taskId: input.taskId,
    timestamp: timestampAt(input.timestamp, input.sequence),
    sequence: input.sequence,
    agentId: input.context.agentId,
    agentName: input.context.agentName,
    agentRole: input.context.agentRole,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    targetTaskId: input.taskId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: {
      source: ADAPTIVE_ROUTINE_SOURCE,
      tags: [
        "smallville-adaptive-routine",
        "adaptive-routine",
        input.cognitiveStage,
        input.phase,
        input.subLocationId,
      ],
      cognitiveStage: input.cognitiveStage,
      subLocationId: input.subLocationId,
      activity: input.activity,
      persona: input.context.persona,
      relationships: input.context.relationshipIds,
      routine,
      routineRevision,
      ...input.metadata,
    },
  };
}

function makeAdaptiveRoutineEvents(input: {
  contexts: readonly RoutineContext[];
  observations: readonly AdaptiveRoutineObservation[];
  previousEvents: readonly AgentEvent[];
  runId: string;
  taskId: string;
  timestamp: string;
}): AgentEvent[] {
  const eventsById = new Map(input.previousEvents.map((event) => [event.id, event]));
  const knownAgentIds = new Set(input.contexts.map((context) => context.agentId));
  const events: AgentEvent[] = [];
  let sequence = 0;

  for (const context of input.contexts) {
    const observation = selectObservation(context, input.observations);
    const retrievedMemories = buildRetrievedMemories(context, eventsById);
    const revisionId = `${context.agentId}-${observation.observationId}`;
    const targetAgentId = firstKnownTargetAgentId(context, knownAgentIds);
    const actionType = actionTypeForRole(context.agentRole);
    const revisedLocation = observation.revisedLocation;
    const revisedSubLocationId = observation.revisedSubLocationId;
    const actionContent =
      actionType === "tool_call"
        ? `${context.agentName} checks the revised routine at ${revisedSubLocationId} before the public plan continues.`
        : actionType === "handoff"
          ? `${context.agentName} hands the revised routine to ${targetAgentId ?? "the next agent"} at ${revisedSubLocationId}.`
          : `${context.agentName} tells ${targetAgentId ?? "the next agent"} why the routine moved to ${revisedSubLocationId}.`;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: "memory_write",
        phase: "wake",
        cognitiveStage: "observation",
        summary: "Observe routine disruption",
        content: `${context.agentName} observes a schedule-changing town signal: ${observation.content}`,
        locationHint: context.locationHint,
        subLocationId: context.subLocationId,
        activity: "observes routine disruption",
        revisionId,
        metadata: {
          memoryKind: "observation",
          memoryId: `${revisionId}-observation`,
          importance: observation.importance,
        },
      }),
    );
    sequence += 1;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: "memory_read",
        phase: "retrieve",
        cognitiveStage: "retrieval",
        summary: "Retrieve prior routine evidence",
        content: `${context.agentName} retrieves ${retrievedMemories.length} prior routine memories before revising the day plan.`,
        locationHint: "archive",
        subLocationId: "archive_shelves",
        activity: "retrieves revision memory",
        revisionId,
        metadata: {
          retrievalQuery: `${context.intention} ${observation.content}`,
          retrievedMemories,
        },
      }),
    );
    sequence += 1;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: "thinking",
        phase: "work",
        cognitiveStage: "reflection",
        summary: "Reflect on routine revision",
        content: `${context.agentName} reflects that the original ${context.subLocationId} routine should move because ${observation.reason}.`,
        locationHint: revisedLocation,
        subLocationId: revisedSubLocationId,
        activity: "reflects on revised schedule",
        revisionId,
        metadata: {
          derivedFromMemoryIds: retrievedMemories.map((memory) => memory.memoryId),
          averageRetrievedScore: roundScore(
            retrievedMemories.reduce((sum, memory) => sum + memory.score, 0) /
              Math.max(1, retrievedMemories.length),
          ),
        },
      }),
    );
    sequence += 1;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: "decision",
        phase: "plan",
        cognitiveStage: "planning",
        summary: "Revise daily plan",
        content: `${context.agentName} revises the day plan from ${context.subLocationId} to ${revisedSubLocationId}.`,
        locationHint: "town_hall",
        subLocationId: "town_hall_table",
        activity: "plans adaptive routine",
        revisionId,
        metadata: {
          planStep: {
            goal: context.intention,
            nextAction: actionContent,
            targetAgentId,
            previousLocation: context.subLocationId,
            expectedLocation: revisedSubLocationId,
            revisionId,
          },
        },
      }),
    );
    sequence += 1;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: actionType,
        phase: "act",
        cognitiveStage: actionType === "message" ? "conversation" : "action",
        summary: "Act on revised routine",
        content: actionContent,
        locationHint: revisedLocation,
        subLocationId: revisedSubLocationId,
        activity: observation.revisedActivity,
        revisionId,
        targetAgentId: actionType === "tool_call" ? undefined : targetAgentId,
        toolName: actionType === "tool_call" ? "check_adaptive_routine_revision" : undefined,
        toolInput:
          actionType === "tool_call"
            ? {
                agentId: context.agentId,
                revisionId,
                previousSubLocationId: context.subLocationId,
                revisedSubLocationId,
              }
            : undefined,
        toolOutputSummary:
          actionType === "tool_call"
            ? "Revised routine remains canonical AgentEvent evidence."
            : undefined,
        metadata: {
          actionSource: "deterministic-adaptive-routine-adapter",
        },
      }),
    );
    sequence += 1;

    events.push(
      makeAdaptiveRoutineEvent({
        context,
        observation,
        retrievedMemories,
        runId: input.runId,
        taskId: input.taskId,
        timestamp: input.timestamp,
        sequence,
        type: "memory_write",
        phase: "close",
        cognitiveStage: "closure",
        summary: "Write revised routine memory",
        content: `${context.agentName} writes back that the routine moved to ${revisedSubLocationId} because ${observation.reason}.`,
        locationHint: revisedLocation,
        subLocationId: revisedSubLocationId,
        activity: "writes revised routine memory",
        status: "done",
        revisionId,
        metadata: {
          memoryKind: "plan",
          memoryId: `${revisionId}-closure`,
          closedRevisionId: revisionId,
        },
      }),
    );
    sequence += 1;
  }

  return events;
}

export function summarizeAdaptiveRoutineRevisions(
  events: readonly AgentEvent[],
): AdaptiveRoutineRevisionSummary {
  const agentIds = new Set<string>();
  const revisionIds = new Set<string>();
  const revisedSubLocationIds = new Set<string>();
  const sourceRunIds = new Set<string>();
  let observationCount = 0;
  let memoryReadCount = 0;
  let memoryWriteCount = 0;

  for (const event of events) {
    const revision = isRecord(event.metadata?.routineRevision)
      ? event.metadata.routineRevision
      : undefined;

    if (revision === undefined) {
      continue;
    }

    agentIds.add(event.agentId);
    if (typeof revision.revisionId === "string") {
      revisionIds.add(revision.revisionId);
    }
    if (typeof revision.revisedSubLocationId === "string") {
      revisedSubLocationIds.add(revision.revisedSubLocationId);
    }
    if (typeof revision.previousRunId === "string") {
      sourceRunIds.add(revision.previousRunId);
    }
    if (event.metadata?.cognitiveStage === "observation") {
      observationCount += 1;
    }
    if (event.type === "memory_read") {
      memoryReadCount += 1;
    }
    if (event.type === "memory_write") {
      memoryWriteCount += 1;
    }
  }

  return {
    agentCount: agentIds.size,
    revisionCount: revisionIds.size,
    observationCount,
    memoryReadCount,
    memoryWriteCount,
    revisedSubLocationIds: [...revisedSubLocationIds].sort(),
    sourceRunIds: [...sourceRunIds].sort(),
  };
}

export function buildAdaptiveRoutinePlanResult(
  input: AdaptiveRoutinePlanInput = {},
): AdapterResult {
  const { events: previousEvents, usedDefaultSeed } = previousEventsFor(input);
  const maxAgents = input.maxAgents ?? DEFAULT_MAX_ADAPTIVE_ROUTINE_AGENTS;
  const contexts = buildRoutineContexts(previousEvents, maxAgents);
  const observations =
    input.observations !== undefined && input.observations.length > 0
      ? input.observations
      : defaultAdaptiveRoutineObservations;
  const warnings: AdapterWarning[] = usedDefaultSeed
    ? [
        {
          code: "adaptive_routine_default_seed",
          message:
            "No routine evidence was present in the supplied event stream; used the deterministic Routine day seed.",
          source: ADAPTIVE_ROUTINE_SOURCE,
        },
      ]
    : [];

  if (contexts.length === 0) {
    return {
      events: [],
      quarantinedEvents: [],
      source: ADAPTIVE_ROUTINE_SOURCE,
      warnings: [
        ...warnings,
        {
          code: "adaptive_routine_no_contexts",
          message: "No agent routine contexts were available for adaptive planning.",
          source: ADAPTIVE_ROUTINE_SOURCE,
        },
      ],
    };
  }

  const events = makeAdaptiveRoutineEvents({
    contexts,
    observations,
    previousEvents,
    runId: input.runId ?? DEFAULT_ADAPTIVE_ROUTINE_RUN_ID,
    taskId: input.taskId ?? DEFAULT_ADAPTIVE_ROUTINE_TASK_ID,
    timestamp: startTimestampFor(input),
  });
  const validation = validateEventStream(events);
  const quarantinedEvents: AdapterQuarantinedEvent[] = validation.quarantinedEvents.map(
    (event) => ({
      ...event,
      code: "invalid_adaptive_routine_event",
      source: ADAPTIVE_ROUTINE_SOURCE,
    }),
  );

  return {
    events: validation.events,
    quarantinedEvents,
    source: ADAPTIVE_ROUTINE_SOURCE,
    warnings,
  };
}

export const adaptiveRoutineAdapter: AgentEventAdapter<AdaptiveRoutinePlanInput> = {
  source: ADAPTIVE_ROUTINE_SOURCE,
  parse: buildAdaptiveRoutinePlanResult,
};
