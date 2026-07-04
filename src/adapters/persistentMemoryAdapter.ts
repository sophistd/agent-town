import {
  comparePersistentMemoryRecords,
  PERSISTENT_MEMORY_SCHEMA_VERSION,
  retrievePersistentMemoryRecords,
  type PersistentMemoryRecord,
  type RetrievedPersistentMemoryRecord,
} from "../events/persistentMemory";
import { validateEventStream } from "../events/validators";
import type {
  AgentEvent,
  AgentEventSource,
  AgentLocation,
  AgentRole,
} from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const PERSISTENT_MEMORY_SOURCE: AgentEventSource = "memory";
const DEFAULT_RECALL_TIMESTAMP = "2026-07-04T18:00:00.000Z";
const DEFAULT_MEMORY_PLAN_TIMESTAMP = "2026-07-04T18:30:00.000Z";
const DEFAULT_MAX_MEMORY_PLAN_AGENTS = 25;
const DEFAULT_MEMORIES_PER_AGENT = 3;

export type PersistentMemoryRecallInput = {
  records: readonly PersistentMemoryRecord[];
  now?: string;
};

export type AgentAddressableMemoryPlanInput = {
  records: readonly PersistentMemoryRecord[];
  previousEvents?: readonly AgentEvent[];
  now?: string;
  maxAgents?: number;
  memoriesPerAgent?: number;
};

type AgentMemoryPlanningContext = {
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  firstSequence: number;
  latestEventId?: string;
  latestRunId?: string;
  latestTaskId?: string;
  latestContent?: string;
  latestSummary?: string;
  latestTags: string[];
  previousEventCount: number;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
};

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

function readStringMetadata(event: AgentEvent, key: string): string | undefined {
  const value = event.metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readTags(event: AgentEvent): string[] {
  const tags = event.metadata?.tags;

  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
    : [];
}

function buildPlanningContexts(
  records: readonly PersistentMemoryRecord[],
  previousEvents: readonly AgentEvent[],
  maxAgents: number,
): AgentMemoryPlanningContext[] {
  const contexts = new Map<string, AgentMemoryPlanningContext>();

  for (const record of [...records].sort(comparePersistentMemoryRecords)) {
    if (contexts.has(record.agentId)) {
      continue;
    }

    contexts.set(record.agentId, {
      agentId: record.agentId,
      agentName: record.agentName,
      agentRole: record.agentRole,
      firstSequence: record.sourceSequence,
      latestContent: record.content,
      latestSummary: record.summary,
      latestTags: record.tags,
      previousEventCount: 0,
      locationHint: record.locationHint ?? "archive",
      subLocationId: record.subLocationId ?? "archive_shelves",
      activity: record.activity ?? "plans from persistent memory",
    });
  }

  for (const event of [...previousEvents].sort((left, right) => left.sequence - right.sequence)) {
    const current = contexts.get(event.agentId);

    if (current === undefined) {
      continue;
    }

    const next: AgentMemoryPlanningContext = {
      agentId: event.agentId,
      agentName: event.agentName,
      agentRole: event.agentRole,
      firstSequence: current.firstSequence,
      latestEventId: event.id,
      latestRunId: event.runId,
      latestTaskId: event.taskId,
      latestContent: event.content,
      latestSummary: event.summary,
      latestTags: readTags(event),
      previousEventCount: current.previousEventCount + 1,
      locationHint: event.locationHint ?? current.locationHint,
      subLocationId:
        readStringMetadata(event, "subLocationId") ??
        current.subLocationId,
      activity:
        readStringMetadata(event, "activity") ??
        current.activity,
    };

    contexts.set(event.agentId, next);
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

function planningQueryForContext(context: AgentMemoryPlanningContext): string {
  return [
    context.agentName,
    context.agentRole,
    context.latestSummary,
    context.latestContent,
    context.latestTags.join(" "),
    "persistent memory next plan relationship location evidence",
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

function averageScore(memories: readonly RetrievedPersistentMemoryRecord[]): number {
  if (memories.length === 0) {
    return 0;
  }

  return Math.round(
    (memories.reduce((sum, memory) => sum + memory.score, 0) / memories.length) * 1000,
  ) / 1000;
}

function memoryPlanMetadata(input: {
  context: AgentMemoryPlanningContext;
  query: string;
  retrievedMemories: readonly RetrievedPersistentMemoryRecord[];
}) {
  return {
    schemaVersion: PERSISTENT_MEMORY_SCHEMA_VERSION,
    agentId: input.context.agentId,
    latestEventId: input.context.latestEventId,
    latestRunId: input.context.latestRunId,
    latestTaskId: input.context.latestTaskId,
    previousEventCount: input.context.previousEventCount,
    retrievalQuery: input.query,
    selectedRecordIds: input.retrievedMemories.map((memory) => memory.recordId),
    selectedSourceEventIds: input.retrievedMemories.map((memory) => memory.sourceEventId),
    averageScore: averageScore(input.retrievedMemories),
    weights: {
      relevance: 0.35,
      importance: 0.25,
      recency: 0.2,
      agentAffinity: 0.2,
    },
  };
}

function makeRecallEvent(input: {
  record: PersistentMemoryRecord;
  runId: string;
  timestamp: string;
  sequence: number;
}): AgentEvent {
  return {
    id: `${input.runId}-${String(input.sequence).padStart(3, "0")}`,
    runId: input.runId,
    taskId: "task-persistent-memory-recall",
    timestamp: timestampAt(input.timestamp, input.sequence),
    sequence: input.sequence,
    agentId: input.record.agentId,
    agentName: input.record.agentName,
    agentRole: input.record.agentRole,
    type: "memory_read",
    content: `${input.record.agentName} recalls persisted ${input.record.sourceType} from ${input.record.sourceRunId}: ${input.record.content}`,
    summary: input.record.summary ?? "Recall persistent memory",
    locationHint: "archive",
    status: "running",
    metadata: {
      source: PERSISTENT_MEMORY_SOURCE,
      tags: [
        "persistent-memory",
        "recall",
        input.record.sourceType,
        ...input.record.tags,
      ],
      subLocationId: "archive_shelves",
      activity: "recalls persistent memory",
      durableMemory: {
        schemaVersion: PERSISTENT_MEMORY_SCHEMA_VERSION,
        recordId: input.record.id,
        sourceEventId: input.record.sourceEventId,
        sourceRunId: input.record.sourceRunId,
        sourceTaskId: input.record.sourceTaskId,
        sourceSequence: input.record.sourceSequence,
        sourceTimestamp: input.record.sourceTimestamp,
        sourceType: input.record.sourceType,
        originalLocationHint: input.record.locationHint,
        originalSubLocationId: input.record.subLocationId,
        originalActivity: input.record.activity,
        memoryId: input.record.memoryId,
        memoryKind: input.record.memoryKind,
        retrievalQuery: input.record.retrievalQuery,
        retrievedMemoryIds: input.record.retrievedMemoryIds,
        importance: input.record.importance,
        savedAt: input.record.savedAt,
      },
    },
  };
}

function makeMemoryPlanEvents(input: {
  context: AgentMemoryPlanningContext;
  retrievedMemories: readonly RetrievedPersistentMemoryRecord[];
  query: string;
  runId: string;
  startTimestamp: string;
  firstSequence: number;
}): AgentEvent[] {
  const topMemory = input.retrievedMemories[0];
  const selectedRecordIds = input.retrievedMemories.map((memory) => memory.recordId);
  const retrievalMetadata = memoryPlanMetadata(input);
  const commonMetadata = {
    source: PERSISTENT_MEMORY_SOURCE,
    tags: [
      "persistent-memory",
      "agent-addressable",
      "smallville-memory-plan",
      input.context.agentId,
    ],
    subLocationId: "archive_shelves",
    activity: "retrieves durable memory",
    agentAddressableMemory: retrievalMetadata,
  };

  return [
    {
      id: `${input.runId}-${String(input.firstSequence).padStart(3, "0")}`,
      runId: input.runId,
      taskId: "task-agent-addressable-memory-plan",
      timestamp: timestampAt(input.startTimestamp, input.firstSequence),
      sequence: input.firstSequence,
      agentId: input.context.agentId,
      agentName: input.context.agentName,
      agentRole: input.context.agentRole,
      type: "memory_read",
      content: `${input.context.agentName} retrieves ${input.retrievedMemories.length} durable memories for: ${input.query}`,
      summary: "Retrieve agent-addressable memory",
      locationHint: "archive",
      status: "running",
      metadata: {
        ...commonMetadata,
        cognitiveStage: "retrieval",
        retrievalQuery: input.query,
        retrievedMemories: input.retrievedMemories,
      },
    },
    {
      id: `${input.runId}-${String(input.firstSequence + 1).padStart(3, "0")}`,
      runId: input.runId,
      taskId: "task-agent-addressable-memory-plan",
      parentEventId: `${input.runId}-${String(input.firstSequence).padStart(3, "0")}`,
      timestamp: timestampAt(input.startTimestamp, input.firstSequence + 1),
      sequence: input.firstSequence + 1,
      agentId: input.context.agentId,
      agentName: input.context.agentName,
      agentRole: input.context.agentRole,
      type: "thinking",
      content:
        topMemory === undefined
          ? `${input.context.agentName} finds no durable memory strong enough to shape a next step.`
          : `${input.context.agentName} connects durable memory "${topMemory.content}" to the current town context.`,
      summary: "Reflect on persistent memory",
      locationHint: input.context.locationHint,
      status: "running",
      metadata: {
        source: PERSISTENT_MEMORY_SOURCE,
        tags: ["persistent-memory", "agent-addressable", "reflection"],
        cognitiveStage: "reflection",
        subLocationId: input.context.subLocationId,
        activity: "reflects from durable memory",
        derivedFromMemoryIds: selectedRecordIds,
        agentAddressableMemory: retrievalMetadata,
      },
    },
    {
      id: `${input.runId}-${String(input.firstSequence + 2).padStart(3, "0")}`,
      runId: input.runId,
      taskId: "task-agent-addressable-memory-plan",
      parentEventId: `${input.runId}-${String(input.firstSequence + 1).padStart(3, "0")}`,
      timestamp: timestampAt(input.startTimestamp, input.firstSequence + 2),
      sequence: input.firstSequence + 2,
      agentId: input.context.agentId,
      agentName: input.context.agentName,
      agentRole: input.context.agentRole,
      type: "decision",
      content:
        topMemory === undefined
          ? `${input.context.agentName} defers planning until more durable memory is available.`
          : `${input.context.agentName} plans the next action from ${topMemory.sourceRunId} memory evidence.`,
      summary: "Plan from persistent memory",
      locationHint: input.context.locationHint,
      status: "running",
      metadata: {
        source: PERSISTENT_MEMORY_SOURCE,
        tags: ["persistent-memory", "agent-addressable", "planning"],
        cognitiveStage: "planning",
        subLocationId: input.context.subLocationId,
        activity: "plans from durable memory",
        planStep: {
          goal: "Use persistent memory as agent-local evidence for the next town action.",
          nextAction:
            topMemory === undefined
              ? "collect more canonical memory events"
              : `continue from durable memory ${topMemory.recordId}`,
          expectedLocation: input.context.subLocationId,
        },
        agentAddressableMemory: retrievalMetadata,
      },
    },
  ];
}

export function buildPersistentMemoryRecallResult(
  records: readonly PersistentMemoryRecord[],
  now = DEFAULT_RECALL_TIMESTAMP,
): AdapterResult {
  if (records.length === 0) {
    const warnings: AdapterWarning[] = [
      {
        code: "persistent_memory_empty",
        message: "No persistent memory records are available to recall.",
        source: PERSISTENT_MEMORY_SOURCE,
      },
    ];

    return {
      events: [],
      quarantinedEvents: [],
      source: PERSISTENT_MEMORY_SOURCE,
      warnings,
    };
  }

  const startTimestamp =
    !Number.isNaN(Date.parse(now)) ? now : DEFAULT_RECALL_TIMESTAMP;
  const sortedRecords = [...records].sort(comparePersistentMemoryRecords);
  const runId = `run-persistent-memory-${hashText(
    sortedRecords.map((record) => record.id).join("|"),
  )}`;
  const events = sortedRecords.map((record, sequence) =>
    makeRecallEvent({ record, runId, timestamp: startTimestamp, sequence }),
  );
  const validation = validateEventStream(events);
  const quarantinedEvents: AdapterQuarantinedEvent[] = validation.quarantinedEvents.map(
    (event) => ({
      ...event,
      code: "invalid_persistent_memory_recall_event",
      source: PERSISTENT_MEMORY_SOURCE,
    }),
  );

  return {
    events: validation.events,
    quarantinedEvents,
    source: PERSISTENT_MEMORY_SOURCE,
    warnings: [],
  };
}

export function buildAgentAddressableMemoryPlanResult(
  input: AgentAddressableMemoryPlanInput,
): AdapterResult {
  if (input.records.length === 0) {
    const warnings: AdapterWarning[] = [
      {
        code: "persistent_memory_plan_empty",
        message: "No persistent memory records are available for agent planning.",
        source: PERSISTENT_MEMORY_SOURCE,
      },
    ];

    return {
      events: [],
      quarantinedEvents: [],
      source: PERSISTENT_MEMORY_SOURCE,
      warnings,
    };
  }

  const startTimestamp =
    input.now !== undefined && !Number.isNaN(Date.parse(input.now))
      ? input.now
      : DEFAULT_MEMORY_PLAN_TIMESTAMP;
  const contexts = buildPlanningContexts(
    input.records,
    input.previousEvents ?? [],
    input.maxAgents ?? DEFAULT_MAX_MEMORY_PLAN_AGENTS,
  );

  if (contexts.length === 0) {
    const warnings: AdapterWarning[] = [
      {
        code: "persistent_memory_plan_no_agents",
        message: "No agents were available for persistent memory planning.",
        source: PERSISTENT_MEMORY_SOURCE,
      },
    ];

    return {
      events: [],
      quarantinedEvents: [],
      source: PERSISTENT_MEMORY_SOURCE,
      warnings,
    };
  }

  const runId = `run-agent-memory-plan-${hashText(
    [
      startTimestamp,
      contexts.map((context) => context.agentId).join("|"),
      input.records.map((record) => record.id).join("|"),
    ].join("::"),
  )}`;
  const memoriesPerAgent = input.memoriesPerAgent ?? DEFAULT_MEMORIES_PER_AGENT;
  const events = contexts.flatMap((context, contextIndex) => {
    const query = planningQueryForContext(context);
    const retrievedMemories = retrievePersistentMemoryRecords(input.records, {
      agentId: context.agentId,
      agentName: context.agentName,
      agentRole: context.agentRole,
      currentTimestamp: startTimestamp,
      limit: memoriesPerAgent,
      query,
    });

    return makeMemoryPlanEvents({
      context,
      firstSequence: contextIndex * 3,
      query,
      retrievedMemories,
      runId,
      startTimestamp,
    });
  });
  const validation = validateEventStream(events);
  const quarantinedEvents: AdapterQuarantinedEvent[] = validation.quarantinedEvents.map(
    (event) => ({
      ...event,
      code: "invalid_agent_addressable_memory_event",
      source: PERSISTENT_MEMORY_SOURCE,
    }),
  );

  return {
    events: validation.events,
    quarantinedEvents,
    source: PERSISTENT_MEMORY_SOURCE,
    warnings: [],
  };
}

export const persistentMemoryAdapter: AgentEventAdapter<PersistentMemoryRecallInput> = {
  source: PERSISTENT_MEMORY_SOURCE,
  parse: (input) => buildPersistentMemoryRecallResult(input.records, input.now),
};
