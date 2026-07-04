import { DEFAULT_RUN_SUMMARY } from "./constants";
import { getLocationCoordinates, isKnownEventType, routeEventToLocation } from "./routing";
import { validateEventStream } from "./validators";
import type {
  AgentBubble,
  AgentEvent,
  AgentEventStatus,
  AgentState,
  AgentStateStatus,
  EventWarning,
  ProjectionEdge,
  ProjectionEdgeKind,
  RunSummary,
  WorldState,
} from "./types";

export type ReplayOptions = {
  runId?: string;
  selectedEventId?: string;
  selectedAgentId?: string;
};

export function createInitialWorldState(runId: string): WorldState {
  return {
    runId,
    cursor: -1,
    agents: {},
    visibleBubbles: {},
    edges: [],
    runSummary: { ...DEFAULT_RUN_SUMMARY },
    warnings: [],
    quarantinedEvents: [],
  };
}

function mapEventStatus(status: AgentEventStatus | undefined): AgentStateStatus | undefined {
  switch (status) {
    case "pending":
      return "idle";
    case "waiting":
      return "waiting";
    case "blocked":
      return "blocked";
    case "failed":
      return "error";
    case "done":
      return "done";
    case "running":
    case undefined:
      return undefined;
  }
}

function mapEventTypeToAgentStatus(type: unknown): AgentStateStatus {
  if (!isKnownEventType(type)) {
    return "waiting";
  }

  switch (type) {
    case "thinking":
    case "decision":
      return "thinking";
    case "message":
      return "talking";
    case "tool_call":
    case "memory_read":
    case "memory_write":
      return "working";
    case "handoff":
      return "walking";
    case "blocked":
      return "blocked";
    case "error":
      return "error";
    case "done":
      return "done";
  }
}

function toAgentStatus(event: AgentEvent): AgentStateStatus {
  return mapEventStatus(event.status) ?? mapEventTypeToAgentStatus(event.type);
}

function toBubble(event: AgentEvent): AgentBubble {
  const text = event.summary ?? event.content;

  if (!isKnownEventType(event.type)) {
    return { kind: "error", text: `Unsupported event: ${String(event.type)}`, eventId: event.id };
  }

  switch (event.type) {
    case "thinking":
    case "decision":
    case "memory_read":
      return { kind: "thought", text, eventId: event.id };
    case "message":
    case "handoff":
      return { kind: "message", text, eventId: event.id };
    case "tool_call":
    case "memory_write":
      return { kind: "tool", text, eventId: event.id };
    case "blocked":
    case "error":
      return { kind: "error", text, eventId: event.id };
    case "done":
      return { kind: "done", text, eventId: event.id };
  }
}

function edgeKindForEvent(event: AgentEvent): ProjectionEdgeKind | undefined {
  if (event.type === "handoff") {
    return "handoff";
  }

  if (event.type === "message") {
    return event.agentRole === "reviewer" ? "review" : "message";
  }

  return undefined;
}

function incrementSummary(summary: RunSummary, event: AgentEvent): RunSummary {
  return {
    totalEvents: summary.totalEvents + 1,
    handoffCount: summary.handoffCount + (event.type === "handoff" ? 1 : 0),
    toolCallCount: summary.toolCallCount + (event.type === "tool_call" ? 1 : 0),
    memoryActionCount:
      summary.memoryActionCount +
      (event.type === "memory_read" || event.type === "memory_write" ? 1 : 0),
    blockedCount: summary.blockedCount + (event.type === "blocked" ? 1 : 0),
    errorCount: summary.errorCount + (event.type === "error" ? 1 : 0),
  };
}

function unsupportedEventWarning(event: AgentEvent): EventWarning | undefined {
  if (isKnownEventType(event.type)) {
    return undefined;
  }

  return {
    eventId: event.id,
    sequence: event.sequence,
    code: "unsupported_event_type",
    message: `Unsupported event type: ${String(event.type)}.`,
  };
}

function missingTargetWarning(event: AgentEvent): EventWarning | undefined {
  if (
    (event.type === "message" || event.type === "handoff") &&
    event.targetAgentId === undefined
  ) {
    return {
      eventId: event.id,
      sequence: event.sequence,
      code: "missing_target_agent",
      message: `${event.type} event has no targetAgentId.`,
    };
  }

  return undefined;
}

function appendDefined<T>(items: T[], item: T | undefined): T[] {
  return item === undefined ? items : [...items, item];
}

function readStringMetadata(event: AgentEvent, key: string): string | undefined {
  const value = event.metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function reduceEvent(prev: WorldState, event: AgentEvent): WorldState {
  const location = routeEventToLocation(event);
  const coordinates = getLocationCoordinates(location);
  const status = toAgentStatus(event);
  const bubble = toBubble(event);
  const previousAgent = prev.agents[event.agentId];
  const subLocationId = readStringMetadata(event, "subLocationId");
  const activity = readStringMetadata(event, "activity");
  const nextAgent: AgentState = {
    ...previousAgent,
    agentId: event.agentId,
    agentName: event.agentName,
    role: event.agentRole,
    status,
    location,
    subLocationId,
    activity,
    previousX: previousAgent?.x,
    previousY: previousAgent?.y,
    x: coordinates.x,
    y: coordinates.y,
    currentTaskId: event.targetTaskId ?? event.taskId,
    activeEventId: event.id,
    bubble,
  };

  const edgeKind = edgeKindForEvent(event);
  const nextEdge: ProjectionEdge | undefined =
    edgeKind !== undefined && event.targetAgentId !== undefined
      ? {
          fromAgentId: event.agentId,
          toAgentId: event.targetAgentId,
          eventId: event.id,
          kind: edgeKind,
        }
      : undefined;

  const warnings = appendDefined(
    appendDefined(prev.warnings, unsupportedEventWarning(event)),
    missingTargetWarning(event),
  );

  return {
    ...prev,
    runId: event.runId,
    cursor: event.sequence,
    currentEventId: event.id,
    selectedEventId: event.id,
    selectedAgentId: event.agentId,
    agents: {
      ...prev.agents,
      [event.agentId]: nextAgent,
    },
    visibleBubbles: {
      ...prev.visibleBubbles,
      [event.agentId]: bubble,
    },
    edges: appendDefined(prev.edges, nextEdge),
    runSummary: incrementSummary(prev.runSummary, event),
    warnings,
  };
}

function sortEventsBySequence(events: readonly AgentEvent[]): AgentEvent[] {
  return [...events].sort((left, right) => {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildReplayWarnings(events: readonly AgentEvent[]): EventWarning[] {
  const warnings: EventWarning[] = [];
  const sorted = sortEventsBySequence(events);
  const seenIds = new Set<string>();
  const seenRunSequences = new Set<string>();
  const orderChanged = events.some((event, index) => sorted[index]?.id !== event.id);

  if (orderChanged) {
    warnings.push({
      code: "replay_input_out_of_order",
      message: "Replay input was sorted by sequence before reducing.",
    });
  }

  for (const event of events) {
    const runSequenceKey = `${event.runId}:${event.sequence}`;

    if (seenIds.has(event.id)) {
      warnings.push({
        eventId: event.id,
        sequence: event.sequence,
        code: "duplicate_event_id",
        message: `Duplicate event id ${event.id}.`,
      });
    }

    if (seenRunSequences.has(runSequenceKey)) {
      warnings.push({
        eventId: event.id,
        sequence: event.sequence,
        code: "duplicate_run_sequence",
        message: `Duplicate sequence ${event.sequence} in run ${event.runId}.`,
      });
    }

    seenIds.add(event.id);
    seenRunSequences.add(runSequenceKey);
  }

  return warnings;
}

export function replay(
  events: readonly AgentEvent[],
  cursor = events.length - 1,
  options: ReplayOptions = {},
): WorldState {
  const sortedEvents = sortEventsBySequence(events);
  const runId = options.runId ?? sortedEvents[0]?.runId ?? "unknown-run";
  const initialState: WorldState = {
    ...createInitialWorldState(runId),
    selectedEventId: options.selectedEventId,
    selectedAgentId: options.selectedAgentId,
    warnings: buildReplayWarnings(events),
  };
  const clampedCursor = Math.min(Math.max(cursor, -1), sortedEvents.length - 1);

  if (clampedCursor < 0) {
    return initialState;
  }

  return sortedEvents
    .slice(0, clampedCursor + 1)
    .reduce<WorldState>((state, event) => reduceEvent(state, event), initialState);
}

export function replayValidated(
  inputs: readonly unknown[],
  cursor = inputs.length - 1,
  options: ReplayOptions = {},
): WorldState {
  const result = validateEventStream(inputs);
  const state = replay(result.events, cursor, options);

  return {
    ...state,
    quarantinedEvents: result.quarantinedEvents,
  };
}
