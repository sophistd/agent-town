import {
  comparePersistentMemoryRecords,
  PERSISTENT_MEMORY_SCHEMA_VERSION,
  type PersistentMemoryRecord,
} from "../events/persistentMemory";
import { validateEventStream } from "../events/validators";
import type { AgentEvent, AgentEventSource } from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const PERSISTENT_MEMORY_SOURCE: AgentEventSource = "memory";
const DEFAULT_RECALL_TIMESTAMP = "2026-07-04T18:00:00.000Z";

export type PersistentMemoryRecallInput = {
  records: readonly PersistentMemoryRecord[];
  now?: string;
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

export const persistentMemoryAdapter: AgentEventAdapter<PersistentMemoryRecallInput> = {
  source: PERSISTENT_MEMORY_SOURCE,
  parse: (input) => buildPersistentMemoryRecallResult(input.records, input.now),
};
