import type {
  AgentEvent,
  AgentEventMetadata,
  AgentEventType,
  AgentLocation,
  AgentRole,
} from "./types";

export const PERSISTENT_MEMORY_SCHEMA_VERSION = 1;
const DEFAULT_MAX_MEMORY_RECORDS = 240;

type MemoryEventType = Extract<AgentEventType, "memory_read" | "memory_write">;

export type PersistentMemoryRecord = {
  id: string;
  sourceEventId: string;
  sourceRunId: string;
  sourceTaskId: string;
  sourceSequence: number;
  sourceTimestamp: string;
  sourceType: MemoryEventType;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  content: string;
  summary?: string;
  locationHint?: AgentLocation;
  subLocationId?: string;
  activity?: string;
  memoryId?: string;
  memoryKind?: string;
  retrievalQuery?: string;
  retrievedMemoryIds: string[];
  importance?: number;
  tags: string[];
  savedAt: string;
};

function isMemoryEvent(event: AgentEvent): event is AgentEvent & { type: MemoryEventType } {
  return event.type === "memory_read" || event.type === "memory_write";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function readStringMetadata(
  metadata: AgentEventMetadata | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumberMetadata(
  metadata: AgentEventMetadata | undefined,
  key: string,
): number | undefined {
  const value = metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readTags(metadata: AgentEventMetadata | undefined): string[] {
  const tags = metadata?.tags;

  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0)
    : [];
}

function readRetrievedMemoryIds(metadata: AgentEventMetadata | undefined): string[] {
  const retrievedMemories = metadata?.retrievedMemories;

  if (!Array.isArray(retrievedMemories)) {
    return [];
  }

  return retrievedMemories.flatMap((memory) => {
    if (!isRecord(memory) || typeof memory.memoryId !== "string") {
      return [];
    }

    return [memory.memoryId];
  });
}

function memoryRecordId(event: AgentEvent): string {
  return `memory:${event.runId}:${event.id}`;
}

export function extractPersistentMemoryRecords(
  events: readonly AgentEvent[],
  savedAt: string,
): PersistentMemoryRecord[] {
  return events.filter(isMemoryEvent).map((event) => ({
    id: memoryRecordId(event),
    sourceEventId: event.id,
    sourceRunId: event.runId,
    sourceTaskId: event.taskId,
    sourceSequence: event.sequence,
    sourceTimestamp: event.timestamp,
    sourceType: event.type,
    agentId: event.agentId,
    agentName: event.agentName,
    agentRole: event.agentRole,
    content: event.content,
    summary: event.summary,
    locationHint: event.locationHint,
    subLocationId: readStringMetadata(event.metadata, "subLocationId"),
    activity: readStringMetadata(event.metadata, "activity"),
    memoryId: readStringMetadata(event.metadata, "memoryId"),
    memoryKind: readStringMetadata(event.metadata, "memoryKind"),
    retrievalQuery: readStringMetadata(event.metadata, "retrievalQuery"),
    retrievedMemoryIds: readRetrievedMemoryIds(event.metadata),
    importance: readNumberMetadata(event.metadata, "importance"),
    tags: readTags(event.metadata),
    savedAt,
  }));
}

export function comparePersistentMemoryRecords(
  left: PersistentMemoryRecord,
  right: PersistentMemoryRecord,
): number {
  const timeDiff =
    Date.parse(left.sourceTimestamp) - Date.parse(right.sourceTimestamp);

  if (Number.isFinite(timeDiff) && timeDiff !== 0) {
    return timeDiff;
  }

  if (left.sourceRunId !== right.sourceRunId) {
    return left.sourceRunId.localeCompare(right.sourceRunId);
  }

  if (left.sourceSequence !== right.sourceSequence) {
    return left.sourceSequence - right.sourceSequence;
  }

  return left.id.localeCompare(right.id);
}

export function mergePersistentMemoryRecords(
  existingRecords: readonly PersistentMemoryRecord[],
  incomingRecords: readonly PersistentMemoryRecord[],
  maxRecords = DEFAULT_MAX_MEMORY_RECORDS,
): PersistentMemoryRecord[] {
  const byId = new Map<string, PersistentMemoryRecord>();

  for (const record of existingRecords) {
    byId.set(record.id, record);
  }

  for (const record of incomingRecords) {
    byId.set(record.id, record);
  }

  return [...byId.values()]
    .sort(comparePersistentMemoryRecords)
    .slice(Math.max(0, byId.size - maxRecords));
}

export function isPersistentMemoryRecord(input: unknown): input is PersistentMemoryRecord {
  if (!isRecord(input)) {
    return false;
  }

  return (
    typeof input.id === "string" &&
    typeof input.sourceEventId === "string" &&
    typeof input.sourceRunId === "string" &&
    typeof input.sourceTaskId === "string" &&
    typeof input.sourceSequence === "number" &&
    typeof input.sourceTimestamp === "string" &&
    (input.sourceType === "memory_read" || input.sourceType === "memory_write") &&
    typeof input.agentId === "string" &&
    typeof input.agentName === "string" &&
    typeof input.agentRole === "string" &&
    typeof input.content === "string" &&
    Array.isArray(input.retrievedMemoryIds) &&
    input.retrievedMemoryIds.every((item) => typeof item === "string") &&
    Array.isArray(input.tags) &&
    input.tags.every((item) => typeof item === "string") &&
    typeof input.savedAt === "string"
  );
}
