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

export type PersistentMemoryRetrievalQuery = {
  agentId: string;
  agentName?: string;
  agentRole?: AgentRole;
  query: string;
  currentTimestamp: string;
  limit?: number;
};

export type RetrievedPersistentMemoryRecord = {
  recordId: string;
  sourceEventId: string;
  sourceRunId: string;
  sourceType: MemoryEventType;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  content: string;
  summary?: string;
  sourceTimestamp: string;
  importance?: number;
  tags: string[];
  relevanceScore: number;
  importanceScore: number;
  recencyScore: number;
  agentAffinityScore: number;
  score: number;
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

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function scorePersistentMemoryRelevance(
  record: PersistentMemoryRecord,
  query: string,
): number {
  const queryTokens = tokenize(query);
  const recordTokens = tokenize(
    [
      record.agentName,
      record.agentRole,
      record.content,
      record.summary,
      record.activity,
      record.locationHint,
      record.subLocationId,
      record.sourceRunId,
      record.sourceType,
      record.memoryKind,
      record.retrievalQuery,
      record.tags.join(" "),
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );

  if (queryTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of queryTokens) {
    if (recordTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.size;
}

function scorePersistentMemoryImportance(record: PersistentMemoryRecord): number {
  if (typeof record.importance !== "number") {
    return record.sourceType === "memory_write" ? 0.62 : 0.5;
  }

  return Math.max(0, Math.min(1, record.importance / 10));
}

function scorePersistentMemoryRecency(
  record: PersistentMemoryRecord,
  currentTimestamp: string,
): number {
  const current = Date.parse(currentTimestamp);
  const source = Date.parse(record.sourceTimestamp);

  if (!Number.isFinite(current) || !Number.isFinite(source) || current <= source) {
    return 1;
  }

  const hours = (current - source) / (1000 * 60 * 60);

  return 1 / (1 + hours / 24);
}

function scoreAgentAffinity(
  record: PersistentMemoryRecord,
  query: PersistentMemoryRetrievalQuery,
): number {
  if (record.agentId === query.agentId) {
    return 1;
  }

  if (query.agentRole !== undefined && record.agentRole === query.agentRole) {
    return 0.45;
  }

  const agentName = query.agentName?.toLowerCase();
  if (
    agentName !== undefined &&
    (record.content.toLowerCase().includes(agentName) ||
      record.tags.some((tag) => tag.toLowerCase() === agentName))
  ) {
    return 0.35;
  }

  return 0;
}

export function scorePersistentMemoryRecord(
  record: PersistentMemoryRecord,
  query: PersistentMemoryRetrievalQuery,
): RetrievedPersistentMemoryRecord {
  const relevanceScore = scorePersistentMemoryRelevance(record, query.query);
  const importanceScore = scorePersistentMemoryImportance(record);
  const recencyScore = scorePersistentMemoryRecency(record, query.currentTimestamp);
  const agentAffinityScore = scoreAgentAffinity(record, query);
  const score =
    0.35 * relevanceScore +
    0.25 * importanceScore +
    0.2 * recencyScore +
    0.2 * agentAffinityScore;

  return {
    recordId: record.id,
    sourceEventId: record.sourceEventId,
    sourceRunId: record.sourceRunId,
    sourceType: record.sourceType,
    agentId: record.agentId,
    agentName: record.agentName,
    agentRole: record.agentRole,
    content: record.content,
    summary: record.summary,
    sourceTimestamp: record.sourceTimestamp,
    importance: record.importance,
    tags: record.tags,
    relevanceScore: roundScore(relevanceScore),
    importanceScore: roundScore(importanceScore),
    recencyScore: roundScore(recencyScore),
    agentAffinityScore: roundScore(agentAffinityScore),
    score: roundScore(score),
  };
}

export function retrievePersistentMemoryRecords(
  records: readonly PersistentMemoryRecord[],
  query: PersistentMemoryRetrievalQuery,
): RetrievedPersistentMemoryRecord[] {
  const limit = Math.max(1, query.limit ?? 3);

  return records
    .map((record) => scorePersistentMemoryRecord(record, query))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.agentAffinityScore !== left.agentAffinityScore) {
        return right.agentAffinityScore - left.agentAffinityScore;
      }

      return left.recordId.localeCompare(right.recordId);
    })
    .slice(0, limit);
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
