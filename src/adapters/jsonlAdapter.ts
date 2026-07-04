import { validateAgentEvent } from "../events/validators";
import type { AgentEvent } from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const JSONL_SOURCE = "jsonl";

type ParsedLine = {
  line: number;
  raw: string;
  value: unknown;
};

function quarantineLine({
  code,
  input,
  line,
  message,
  path,
  raw,
}: {
  code: string;
  input: unknown;
  line: number;
  message: string;
  path: string;
  raw: string;
}): AdapterQuarantinedEvent {
  return {
    code,
    input,
    issues: [{ path, message }],
    line,
    raw,
    source: JSONL_SOURCE,
  };
}

function quarantineValidatedLine(
  parsedLine: ParsedLine,
  code: string,
  issues: AdapterQuarantinedEvent["issues"],
): AdapterQuarantinedEvent {
  return {
    code,
    input: parsedLine.value,
    issues,
    line: parsedLine.line,
    raw: parsedLine.raw,
    source: JSONL_SOURCE,
  };
}

function parseJsonLines(input: string): {
  parsedLines: ParsedLine[];
  quarantinedEvents: AdapterQuarantinedEvent[];
} {
  const parsedLines: ParsedLine[] = [];
  const quarantinedEvents: AdapterQuarantinedEvent[] = [];
  const lines = input.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const raw = rawLine.trim();

    if (raw.length === 0) {
      return;
    }

    try {
      parsedLines.push({ line, raw, value: JSON.parse(raw) as unknown });
    } catch (error) {
      quarantinedEvents.push(
        quarantineLine({
          code: "invalid_json",
          input: { line, raw },
          line,
          message:
            error instanceof Error
              ? `line ${line} must be valid JSON: ${error.message}`
              : `line ${line} must be valid JSON.`,
          path: "$",
          raw,
        }),
      );
    }
  });

  return { parsedLines, quarantinedEvents };
}

function withJsonlSourceMetadata(event: AgentEvent): AgentEvent {
  return {
    ...event,
    metadata: {
      ...event.metadata,
      source: event.metadata?.source ?? JSONL_SOURCE,
    },
  };
}

function timestampWarning(event: AgentEvent, line: number): AdapterWarning | undefined {
  if (!Number.isNaN(Date.parse(event.timestamp))) {
    return undefined;
  }

  return {
    code: "invalid_timestamp",
    eventId: event.id,
    line,
    message: `event ${event.id} has an invalid timestamp; replay will still use sequence order.`,
    sequence: event.sequence,
    source: JSONL_SOURCE,
  };
}

export function parseNativeJsonl(input: string): AdapterResult {
  const { parsedLines, quarantinedEvents } = parseJsonLines(input);
  const events: AgentEvent[] = [];
  const warnings: AdapterWarning[] = [];
  const seenIds = new Map<string, number>();
  const seenRunSequences = new Map<string, number>();

  for (const parsedLine of parsedLines) {
    const result = validateAgentEvent(parsedLine.value);

    if (!result.ok) {
      quarantinedEvents.push(
        quarantineValidatedLine(parsedLine, "invalid_agent_event", result.quarantinedEvent.issues),
      );
      continue;
    }

    const event = withJsonlSourceMetadata(result.event);
    const duplicateIssues: AdapterQuarantinedEvent["issues"] = [];
    const firstIdLine = seenIds.get(event.id);
    const runSequenceKey = `${event.runId}:${event.sequence}`;
    const firstSequenceLine = seenRunSequences.get(runSequenceKey);

    if (firstIdLine !== undefined) {
      duplicateIssues.push({
        path: "id",
        message: `duplicate event id ${event.id}; first seen on line ${firstIdLine}.`,
      });
    }

    if (firstSequenceLine !== undefined) {
      duplicateIssues.push({
        path: "sequence",
        message: `duplicate sequence ${event.sequence} in run ${event.runId}; first seen on line ${firstSequenceLine}.`,
      });
    }

    if (duplicateIssues.length > 0) {
      quarantinedEvents.push(
        quarantineValidatedLine(parsedLine, "duplicate_agent_event", duplicateIssues),
      );
      continue;
    }

    const warning = timestampWarning(event, parsedLine.line);
    if (warning !== undefined) {
      warnings.push(warning);
    }

    seenIds.set(event.id, parsedLine.line);
    seenRunSequences.set(runSequenceKey, parsedLine.line);
    events.push(event);
  }

  return {
    events,
    quarantinedEvents,
    source: JSONL_SOURCE,
    warnings,
  };
}

export const jsonlAgentEventAdapter: AgentEventAdapter<string> = {
  source: JSONL_SOURCE,
  parse: parseNativeJsonl,
};
