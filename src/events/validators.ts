import {
  AGENT_EVENT_SOURCES,
  AGENT_EVENT_STATUSES,
  AGENT_EVENT_TYPES,
  AGENT_LOCATIONS,
  AGENT_ROLES,
} from "./constants";
import type {
  AgentEvent,
  AgentEventMetrics,
  AgentEventMetadata,
  EventValidationIssue,
  QuarantinedEvent,
} from "./types";

type ValidationResult =
  | { ok: true; event: AgentEvent }
  | { ok: false; quarantinedEvent: QuarantinedEvent };

export type EventStreamValidationResult = {
  events: AgentEvent[];
  quarantinedEvents: QuarantinedEvent[];
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isString(input: unknown): input is string {
  return typeof input === "string" && input.length > 0;
}

function isNonNegativeFiniteNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input) && input >= 0;
}

function isStringArray(input: unknown): input is string[] {
  return Array.isArray(input) && input.every(isString);
}

function includesValue<T extends readonly string[]>(
  values: T,
  input: unknown,
): input is T[number] {
  return typeof input === "string" && values.includes(input);
}

function requireString(
  record: Record<string, unknown>,
  path: string,
  issues: EventValidationIssue[],
): void {
  if (!isString(record[path])) {
    issues.push({ path, message: `${path} must be a non-empty string.` });
  }
}

function validateOptionalString(
  record: Record<string, unknown>,
  path: string,
  issues: EventValidationIssue[],
): void {
  if (record[path] !== undefined && !isString(record[path])) {
    issues.push({ path, message: `${path} must be a non-empty string when present.` });
  }
}

function validateMetrics(input: unknown, issues: EventValidationIssue[]): void {
  if (input === undefined) {
    return;
  }

  if (!isRecord(input)) {
    issues.push({ path: "metrics", message: "metrics must be an object when present." });
    return;
  }

  const metrics = input as Partial<AgentEventMetrics>;
  for (const path of ["latencyMs", "tokenInput", "tokenOutput", "costUsd"] as const) {
    if (metrics[path] !== undefined && !isNonNegativeFiniteNumber(metrics[path])) {
      issues.push({
        path: `metrics.${path}`,
        message: `${path} must be a non-negative finite number.`,
      });
    }
  }
}

function validateMetadata(input: unknown, issues: EventValidationIssue[]): void {
  if (input === undefined) {
    return;
  }

  if (!isRecord(input)) {
    issues.push({ path: "metadata", message: "metadata must be an object when present." });
    return;
  }

  const metadata = input as Partial<AgentEventMetadata>;
  if (
    metadata.source !== undefined &&
    !includesValue(AGENT_EVENT_SOURCES, metadata.source)
  ) {
    issues.push({
      path: "metadata.source",
      message: "metadata.source must be a canonical AgentEventSource.",
    });
  }

  if (metadata.tags !== undefined && !isStringArray(metadata.tags)) {
    issues.push({ path: "metadata.tags", message: "metadata.tags must be strings." });
  }
}

export function validateAgentEvent(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      quarantinedEvent: {
        input,
        issues: [{ path: "$", message: "event input must be a plain object." }],
      },
    };
  }

  const issues: EventValidationIssue[] = [];

  for (const path of [
    "id",
    "runId",
    "taskId",
    "timestamp",
    "agentId",
    "agentName",
    "content",
  ]) {
    requireString(input, path, issues);
  }

  validateOptionalString(input, "summary", issues);
  validateOptionalString(input, "parentEventId", issues);
  validateOptionalString(input, "targetAgentId", issues);
  validateOptionalString(input, "targetTaskId", issues);
  validateOptionalString(input, "toolName", issues);
  validateOptionalString(input, "toolOutputSummary", issues);
  validateOptionalString(input, "filePath", issues);

  if (!Number.isInteger(input.sequence) || Number(input.sequence) < 0) {
    issues.push({
      path: "sequence",
      message: "sequence must be a non-negative integer.",
    });
  }

  if (!includesValue(AGENT_EVENT_TYPES, input.type)) {
    issues.push({
      path: "type",
      message: "type must be a canonical AgentEventType.",
    });
  }

  if (!includesValue(AGENT_ROLES, input.agentRole)) {
    issues.push({
      path: "agentRole",
      message: "agentRole must be a canonical AgentRole.",
    });
  }

  if (
    input.locationHint !== undefined &&
    !includesValue(AGENT_LOCATIONS, input.locationHint)
  ) {
    issues.push({
      path: "locationHint",
      message: "locationHint must be a canonical AgentLocation.",
    });
  }

  if (input.status !== undefined && !includesValue(AGENT_EVENT_STATUSES, input.status)) {
    issues.push({
      path: "status",
      message: "status must be a canonical AgentEventStatus.",
    });
  }

  if (input.type === "tool_call" && !isString(input.toolName)) {
    issues.push({
      path: "toolName",
      message: "tool_call events must identify the invoked tool.",
    });
  }

  if (
    (input.type === "message" || input.type === "handoff") &&
    !isString(input.targetAgentId)
  ) {
    issues.push({
      path: "targetAgentId",
      message: `${input.type} events must identify a target agent.`,
    });
  }

  if (input.artifactIds !== undefined && !isStringArray(input.artifactIds)) {
    issues.push({ path: "artifactIds", message: "artifactIds must be strings." });
  }

  validateMetrics(input.metrics, issues);
  validateMetadata(input.metadata, issues);

  if (issues.length > 0) {
    return { ok: false, quarantinedEvent: { input, issues } };
  }

  return { ok: true, event: input as AgentEvent };
}

export function validateEventStream(inputs: readonly unknown[]): EventStreamValidationResult {
  const events: AgentEvent[] = [];
  const quarantinedEvents: QuarantinedEvent[] = [];
  const seenIds = new Set<string>();
  const seenRunSequences = new Set<string>();

  for (const input of inputs) {
    const result = validateAgentEvent(input);

    if (!result.ok) {
      quarantinedEvents.push(result.quarantinedEvent);
      continue;
    }

    const event = result.event;
    const runSequenceKey = `${event.runId}:${event.sequence}`;
    const duplicateIssues: EventValidationIssue[] = [];

    if (seenIds.has(event.id)) {
      duplicateIssues.push({
        path: "id",
        message: `duplicate event id ${event.id}.`,
      });
    }

    if (seenRunSequences.has(runSequenceKey)) {
      duplicateIssues.push({
        path: "sequence",
        message: `duplicate sequence ${event.sequence} in run ${event.runId}.`,
      });
    }

    if (duplicateIssues.length > 0) {
      quarantinedEvents.push({ input: event, issues: duplicateIssues });
      continue;
    }

    seenIds.add(event.id);
    seenRunSequences.add(runSequenceKey);
    events.push(event);
  }

  return { events, quarantinedEvents };
}
