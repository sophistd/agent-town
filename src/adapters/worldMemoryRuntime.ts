import {
  buildAgentAddressableMemoryPlanResult,
  buildPersistentMemoryRecallResult,
  type AgentAddressableMemoryPlanInput,
} from "./persistentMemoryAdapter";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
} from "./types";
import { extractPersistentMemoryRecords } from "../events/persistentMemory";
import type { AgentEvent, AgentEventSource, QuarantinedEvent } from "../events/types";
import { validateEventStream } from "../events/validators";
import {
  loadFilePersistentMemoryRecords,
  mergeFilePersistentMemoryRecords,
} from "../state/filePersistentMemoryStore";

const WORLD_MEMORY_SOURCE: AgentEventSource = "memory";

export type FileWorldMemoryIngestInput = {
  events: readonly unknown[];
  filePath: string;
  maxRecords?: number;
  savedAt: string;
};

export type FileWorldMemoryIngestResult = {
  acceptedEventCount: number;
  filePath: string;
  incomingRecordCount: number;
  persistedRecordCount: number;
  quarantinedEvents: AdapterQuarantinedEvent[];
  source: AgentEventSource;
  warnings: AdapterWarning[];
};

export type FileWorldMemoryRecallInput = {
  filePath: string;
  now?: string;
};

export type FileWorldMemoryPlanInput = Omit<
  AgentAddressableMemoryPlanInput,
  "records"
> & {
  filePath: string;
};

function warning(input: {
  code: string;
  eventId?: string;
  message: string;
  sequence?: number;
}): AdapterWarning {
  return {
    code: input.code,
    eventId: input.eventId,
    message: input.message,
    sequence: input.sequence,
    source: WORLD_MEMORY_SOURCE,
  };
}

function quarantineValidatedEvent(
  event: QuarantinedEvent,
): AdapterQuarantinedEvent {
  return {
    ...event,
    code: "invalid_world_memory_ingest_event",
    source: WORLD_MEMORY_SOURCE,
  };
}

function timestampWarnings(events: readonly AgentEvent[]): AdapterWarning[] {
  return events.flatMap((event): AdapterWarning[] => {
    if (!Number.isNaN(Date.parse(event.timestamp))) {
      return [];
    }

    return [
      warning({
        code: "invalid_timestamp",
        eventId: event.id,
        message: `event ${event.id} has an invalid timestamp; memory can still be stored but source recency may be less useful.`,
        sequence: event.sequence,
      }),
    ];
  });
}

export async function ingestEventsIntoFileWorldMemory(
  input: FileWorldMemoryIngestInput,
): Promise<FileWorldMemoryIngestResult> {
  const validation = validateEventStream(input.events);
  const timestampIssues = timestampWarnings(validation.events);
  const incomingRecords = extractPersistentMemoryRecords(
    validation.events,
    input.savedAt,
  );
  const quarantinedEvents = validation.quarantinedEvents.map(quarantineValidatedEvent);

  if (incomingRecords.length === 0) {
    return {
      acceptedEventCount: validation.events.length,
      filePath: input.filePath,
      incomingRecordCount: 0,
      persistedRecordCount: 0,
      quarantinedEvents,
      source: WORLD_MEMORY_SOURCE,
      warnings: [
        ...timestampIssues,
        warning({
          code: "world_memory_ingest_no_memory_events",
          message:
            "No canonical memory_read or memory_write events were available to persist.",
        }),
      ],
    };
  }

  const mergeResult = await mergeFilePersistentMemoryRecords({
    filePath: input.filePath,
    incomingRecords,
    maxRecords: input.maxRecords,
    savedAt: input.savedAt,
  });

  return {
    acceptedEventCount: validation.events.length,
    filePath: input.filePath,
    incomingRecordCount: incomingRecords.length,
    persistedRecordCount: mergeResult.records.length,
    quarantinedEvents,
    source: WORLD_MEMORY_SOURCE,
    warnings: [...timestampIssues, ...mergeResult.warnings],
  };
}

export async function buildFileWorldMemoryRecallResult(
  input: FileWorldMemoryRecallInput,
): Promise<AdapterResult> {
  const loaded = await loadFilePersistentMemoryRecords(input.filePath);
  const recallResult = buildPersistentMemoryRecallResult(loaded.records, input.now);

  return {
    ...recallResult,
    warnings: [...loaded.warnings, ...recallResult.warnings],
  };
}

export async function buildFileWorldMemoryPlanResult(
  input: FileWorldMemoryPlanInput,
): Promise<AdapterResult> {
  const loaded = await loadFilePersistentMemoryRecords(input.filePath);
  const planResult = buildAgentAddressableMemoryPlanResult({
    maxAgents: input.maxAgents,
    memoriesPerAgent: input.memoriesPerAgent,
    now: input.now,
    previousEvents: input.previousEvents,
    records: loaded.records,
  });

  return {
    ...planResult,
    warnings: [...loaded.warnings, ...planResult.warnings],
  };
}
