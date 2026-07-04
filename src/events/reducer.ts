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
  RelationshipKind,
  RelationshipState,
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
    relationships: {},
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArrayMetadata(event: AgentEvent, key: string): string[] {
  const value = event.metadata?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function relationshipIdFor(leftAgentId: string, rightAgentId: string): string {
  return [leftAgentId, rightAgentId].sort((left, right) => left.localeCompare(right)).join("__");
}

function strengthForRelationshipKind(kind: RelationshipKind): number {
  switch (kind) {
    case "message":
      return 4;
    case "handoff":
      return 3;
    case "diffusion":
      return 2;
    case "declared":
      return 1;
  }
}

function appendEvidenceEventId(existingIds: readonly string[], eventId: string): string[] {
  const nextIds = existingIds.includes(eventId) ? [...existingIds] : [...existingIds, eventId];

  return nextIds.slice(-12);
}

function mergeRelationshipTags(
  existingTags: readonly string[],
  incomingTags: readonly string[],
): string[] {
  return [...new Set([...existingTags, ...incomingTags])].sort();
}

function addRelationship(
  relationships: Record<string, RelationshipState>,
  event: AgentEvent,
  targetAgentId: string,
  kind: RelationshipKind,
): Record<string, RelationshipState> {
  if (targetAgentId === event.agentId) {
    return relationships;
  }

  const relationshipId = relationshipIdFor(event.agentId, targetAgentId);
  const existing = relationships[relationshipId];
  const agentIds = relationshipId.split("__") as [string, string];
  const tags = readStringArrayMetadata(event, "tags");
  const strength = (existing?.strength ?? 0) + strengthForRelationshipKind(kind);
  const nextRelationship: RelationshipState = {
    relationshipId,
    agentIds: existing?.agentIds ?? agentIds,
    strength,
    interactionCount: (existing?.interactionCount ?? 0) + 1,
    messageCount: (existing?.messageCount ?? 0) + (kind === "message" ? 1 : 0),
    handoffCount: (existing?.handoffCount ?? 0) + (kind === "handoff" ? 1 : 0),
    declaredCount: (existing?.declaredCount ?? 0) + (kind === "declared" ? 1 : 0),
    diffusionCount: (existing?.diffusionCount ?? 0) + (kind === "diffusion" ? 1 : 0),
    lastEventId: event.id,
    lastInteractionKind: kind,
    lastSequence: event.sequence,
    evidenceEventIds: appendEvidenceEventId(existing?.evidenceEventIds ?? [], event.id),
    tags: mergeRelationshipTags(existing?.tags ?? [], tags),
  };

  return {
    ...relationships,
    [relationshipId]: nextRelationship,
  };
}

function addRelationshipTargets(
  relationships: Record<string, RelationshipState>,
  event: AgentEvent,
  targetAgentIds: readonly string[],
  kind: RelationshipKind,
): Record<string, RelationshipState> {
  return targetAgentIds.reduce<Record<string, RelationshipState>>(
    (nextRelationships, targetAgentId) =>
      addRelationship(nextRelationships, event, targetAgentId, kind),
    relationships,
  );
}

function deriveRelationships(
  relationships: Record<string, RelationshipState>,
  event: AgentEvent,
): Record<string, RelationshipState> {
  let nextRelationships = addRelationshipTargets(
    relationships,
    event,
    readStringArrayMetadata(event, "relationships"),
    "declared",
  );

  if (event.type === "message" && event.targetAgentId !== undefined) {
    nextRelationships = addRelationship(nextRelationships, event, event.targetAgentId, "message");
  }

  if (event.type === "handoff" && event.targetAgentId !== undefined) {
    nextRelationships = addRelationship(nextRelationships, event, event.targetAgentId, "handoff");
  }

  const diffusion = event.metadata?.socialDiffusion;
  if (isRecord(diffusion)) {
    if (typeof diffusion.heardFromAgentId === "string") {
      nextRelationships = addRelationship(
        nextRelationships,
        event,
        diffusion.heardFromAgentId,
        "diffusion",
      );
    }

    if (Array.isArray(diffusion.spreadsToAgentIds)) {
      const targetAgentIds = diffusion.spreadsToAgentIds.filter(
        (targetAgentId): targetAgentId is string =>
          typeof targetAgentId === "string" && targetAgentId.trim().length > 0,
      );
      nextRelationships = addRelationshipTargets(
        nextRelationships,
        event,
        targetAgentIds,
        "diffusion",
      );
    }
  }

  return nextRelationships;
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
    relationships: deriveRelationships(prev.relationships, event),
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
