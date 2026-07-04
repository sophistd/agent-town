import { AGENT_EVENT_SOURCES } from "../events/constants";
import { validateAgentEvent } from "../events/validators";
import type { AgentEvent, AgentEventSource, EventValidationIssue } from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const WEBSOCKET_SOURCE = "websocket";

export type WebSocketAdapterInput = string | unknown | readonly (string | unknown)[];

type ParsedMessage = {
  messageIndex: number;
  raw?: string;
  value: unknown;
};

type WebSocketSourceEvent = Record<string, unknown>;

type WebSocketStatus = {
  message: string;
  status: "connecting" | "open" | "closed" | "error";
};

type WebSocketEventMap = {
  close: Event;
  error: Event;
  message: MessageEvent;
  open: Event;
};

export type WebSocketLike = {
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void,
  ): void;
  close(): void;
};

type WebSocketIngestOptions = {
  onResult: (result: AdapterResult) => void;
  onStatus?: (status: WebSocketStatus) => void;
  socketFactory?: (url: string) => WebSocketLike;
  url: string;
};

export type WebSocketIngestConnection = {
  disconnect(): void;
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function asRecord(input: unknown): Record<string, unknown> | undefined {
  return isRecord(input) ? input : undefined;
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readAgentEventSource(
  record: Record<string, unknown> | undefined,
  key: string,
): AgentEventSource | undefined {
  const value = readString(record, key);
  return AGENT_EVENT_SOURCES.includes(value as AgentEventSource)
    ? (value as AgentEventSource)
    : undefined;
}

function readNumber(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(
  record: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  const value = record?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

function safeRaw(input: unknown): string | undefined {
  if (typeof input === "string") {
    return input.trim();
  }

  try {
    return JSON.stringify(input);
  } catch {
    return undefined;
  }
}

function quarantineMessage({
  code,
  input,
  issues,
  messageIndex,
  raw,
}: {
  code: string;
  input: unknown;
  issues: EventValidationIssue[];
  messageIndex: number;
  raw?: string;
}): AdapterQuarantinedEvent {
  return {
    code,
    input: { input, messageIndex },
    issues,
    raw,
    source: WEBSOCKET_SOURCE,
  };
}

function parseMessageInput(input: string | unknown, messageIndex: number):
  | { ok: true; parsedMessage: ParsedMessage }
  | { ok: false; quarantinedEvent: AdapterQuarantinedEvent } {
  if (typeof input !== "string") {
    return {
      ok: true,
      parsedMessage: { messageIndex, raw: safeRaw(input), value: input },
    };
  }

  const raw = input.trim();
  if (raw.length === 0) {
    return {
      ok: false,
      quarantinedEvent: quarantineMessage({
        code: "empty_websocket_message",
        input,
        issues: [{ path: "$", message: "message must not be empty." }],
        messageIndex,
        raw,
      }),
    };
  }

  try {
    return {
      ok: true,
      parsedMessage: { messageIndex, raw, value: JSON.parse(raw) as unknown },
    };
  } catch (error) {
    return {
      ok: false,
      quarantinedEvent: quarantineMessage({
        code: "invalid_json",
        input,
        issues: [
          {
            path: "$",
            message:
              error instanceof Error
                ? `message ${messageIndex} must be valid JSON: ${error.message}`
                : `message ${messageIndex} must be valid JSON.`,
          },
        ],
        messageIndex,
        raw,
      }),
    };
  }
}

function unwrapMessageEnvelope(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if (isRecord(value.event)) {
    return value.event;
  }

  if (isRecord(value.payload)) {
    return value.payload;
  }

  if (isRecord(value.data)) {
    return value.data;
  }

  return value;
}

function withWebSocketSourceMetadata(event: AgentEvent): AgentEvent {
  return {
    ...event,
    metadata: {
      ...event.metadata,
      source: event.metadata?.source ?? WEBSOCKET_SOURCE,
      transport: WEBSOCKET_SOURCE,
    },
  };
}

function metadataForSourceEvent(record: WebSocketSourceEvent): AgentEvent["metadata"] {
  const metadata = asRecord(record.metadata) ?? {};
  const rawEventId =
    readString(metadata, "rawEventId") ??
    readString(record, "rawEventId") ??
    readString(record, "eventId") ??
    readString(record, "id");

  return {
    ...metadata,
    rawEventId,
    source: readAgentEventSource(metadata, "source") ?? WEBSOCKET_SOURCE,
    transport: WEBSOCKET_SOURCE,
  };
}

function normalizeSourceEvent(input: unknown): unknown {
  const record = asRecord(unwrapMessageEnvelope(input));

  if (record === undefined) {
    return input;
  }

  if (validateAgentEvent(record).ok) {
    return record;
  }

  const agent = asRecord(record.agent);
  const tool = asRecord(record.tool);

  return {
    id: readString(record, "id") ?? readString(record, "eventId"),
    runId: readString(record, "runId") ?? readString(record, "run_id"),
    taskId: readString(record, "taskId") ?? readString(record, "task_id"),
    parentEventId: readString(record, "parentEventId") ?? readString(record, "parent_event_id"),
    timestamp:
      readString(record, "timestamp") ??
      readString(record, "time") ??
      readString(record, "createdAt"),
    sequence: readNumber(record, "sequence") ?? readNumber(record, "seq"),
    agentId: readString(record, "agentId") ?? readString(record, "agent_id") ?? readString(agent, "id"),
    agentName:
      readString(record, "agentName") ??
      readString(record, "agent_name") ??
      readString(agent, "name"),
    agentRole:
      readString(record, "agentRole") ??
      readString(record, "agent_role") ??
      readString(agent, "role"),
    type: readString(record, "type") ?? readString(record, "eventType") ?? readString(record, "event_type"),
    content: readString(record, "content") ?? readString(record, "message") ?? readString(record, "text"),
    summary: readString(record, "summary") ?? readString(record, "name"),
    targetAgentId: readString(record, "targetAgentId") ?? readString(record, "target_agent_id"),
    targetTaskId: readString(record, "targetTaskId") ?? readString(record, "target_task_id"),
    toolName: readString(record, "toolName") ?? readString(tool, "name"),
    toolInput: record.toolInput ?? tool?.input,
    toolOutputSummary:
      readString(record, "toolOutputSummary") ??
      readString(record, "tool_output_summary") ??
      readString(tool, "outputSummary") ??
      readString(tool, "output"),
    artifactIds: readStringArray(record, "artifactIds") ?? readStringArray(record, "artifact_ids"),
    filePath: readString(record, "filePath") ?? readString(record, "file_path"),
    locationHint: readString(record, "locationHint") ?? readString(record, "location_hint"),
    status: readString(record, "status"),
    metrics: asRecord(record.metrics),
    metadata: metadataForSourceEvent(record),
  };
}

function timestampWarning(event: AgentEvent, messageIndex: number): AdapterWarning | undefined {
  if (!Number.isNaN(Date.parse(event.timestamp))) {
    return undefined;
  }

  return {
    code: "invalid_timestamp",
    eventId: event.id,
    message: `event ${event.id} has an invalid timestamp; replay will still use sequence order.`,
    sequence: event.sequence,
    source: WEBSOCKET_SOURCE,
    line: messageIndex,
  };
}

function inputMessages(input: WebSocketAdapterInput): readonly (string | unknown)[] {
  return Array.isArray(input) ? input : [input];
}

export function parseWebSocketMessages(input: WebSocketAdapterInput): AdapterResult {
  const events: AgentEvent[] = [];
  const quarantinedEvents: AdapterQuarantinedEvent[] = [];
  const warnings: AdapterWarning[] = [];
  const seenIds = new Map<string, number>();
  const seenRunSequences = new Map<string, number>();

  inputMessages(input).forEach((message, index) => {
    const messageIndex = index + 1;
    const parsed = parseMessageInput(message, messageIndex);

    if (!parsed.ok) {
      quarantinedEvents.push(parsed.quarantinedEvent);
      return;
    }

    const normalized = normalizeSourceEvent(parsed.parsedMessage.value);
    const result = validateAgentEvent(normalized);

    if (!result.ok) {
      quarantinedEvents.push(
        quarantineMessage({
          code: "invalid_agent_event",
          input: parsed.parsedMessage.value,
          issues: result.quarantinedEvent.issues,
          messageIndex,
          raw: parsed.parsedMessage.raw,
        }),
      );
      return;
    }

    const event = withWebSocketSourceMetadata(result.event);
    const duplicateIssues: EventValidationIssue[] = [];
    const firstIdMessage = seenIds.get(event.id);
    const runSequenceKey = `${event.runId}:${event.sequence}`;
    const firstSequenceMessage = seenRunSequences.get(runSequenceKey);

    if (firstIdMessage !== undefined) {
      duplicateIssues.push({
        path: "id",
        message: `duplicate event id ${event.id}; first seen in message ${firstIdMessage}.`,
      });
    }

    if (firstSequenceMessage !== undefined) {
      duplicateIssues.push({
        path: "sequence",
        message: `duplicate sequence ${event.sequence} in run ${event.runId}; first seen in message ${firstSequenceMessage}.`,
      });
    }

    if (duplicateIssues.length > 0) {
      quarantinedEvents.push(
        quarantineMessage({
          code: "duplicate_agent_event",
          input: event,
          issues: duplicateIssues,
          messageIndex,
          raw: parsed.parsedMessage.raw,
        }),
      );
      return;
    }

    const warning = timestampWarning(event, messageIndex);
    if (warning !== undefined) {
      warnings.push(warning);
    }

    seenIds.set(event.id, messageIndex);
    seenRunSequences.set(runSequenceKey, messageIndex);
    events.push(event);
  });

  return {
    events,
    quarantinedEvents,
    source: WEBSOCKET_SOURCE,
    warnings,
  };
}

export function connectWebSocketIngest({
  onResult,
  onStatus,
  socketFactory = (url) => new WebSocket(url),
  url,
}: WebSocketIngestOptions): WebSocketIngestConnection {
  onStatus?.({ message: `Connecting to ${url}`, status: "connecting" });

  const socket = socketFactory(url);
  let didError = false;

  socket.addEventListener("open", () => {
    onStatus?.({ message: `Connected to ${url}`, status: "open" });
  });

  socket.addEventListener("message", (event) => {
    onResult(parseWebSocketMessages(event.data));
  });

  socket.addEventListener("error", () => {
    didError = true;
    onStatus?.({ message: `Connection error for ${url}`, status: "error" });
  });

  socket.addEventListener("close", () => {
    onStatus?.({
      message: didError
        ? `Connection error for ${url}; connection closed`
        : `Connection closed for ${url}`,
      status: didError ? "error" : "closed",
    });
  });

  return {
    disconnect() {
      socket.close();
    },
  };
}

export const websocketAgentEventAdapter: AgentEventAdapter<WebSocketAdapterInput> = {
  source: WEBSOCKET_SOURCE,
  parse: parseWebSocketMessages,
};
