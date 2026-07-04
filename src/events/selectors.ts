import type { AgentEvent, AgentState, ProjectionEdge, RunSummary, WorldState } from "./types";

function findEventById(events: readonly AgentEvent[], id: string | undefined): AgentEvent | undefined {
  if (id === undefined) {
    return undefined;
  }

  return events.find((event) => event.id === id);
}

export function selectCurrentEvent(
  state: WorldState,
  events: readonly AgentEvent[] = [],
): AgentEvent | undefined {
  return findEventById(events, state.currentEventId);
}

export function selectSelectedEvent(
  state: WorldState,
  events: readonly AgentEvent[] = [],
): AgentEvent | undefined {
  return findEventById(events, state.selectedEventId);
}

export function selectAgentState(
  state: WorldState,
  agentId: string,
): AgentState | undefined {
  return state.agents[agentId];
}

export function selectRunSummary(state: WorldState): RunSummary {
  return state.runSummary;
}

export function selectActiveAgentCount(state: WorldState): number {
  return Object.keys(state.agents).length;
}

export function selectVisibleBubbles(state: WorldState): WorldState["visibleBubbles"] {
  return state.visibleBubbles;
}

export function selectEdges(state: WorldState): ProjectionEdge[] {
  return state.edges;
}

export function selectBlockedEvents(events: readonly AgentEvent[]): AgentEvent[] {
  return events.filter((event) => event.type === "blocked" || event.status === "blocked");
}

export function selectErrorEvents(events: readonly AgentEvent[]): AgentEvent[] {
  return events.filter((event) => event.type === "error" || event.status === "failed");
}

function sortEventsBySequence(events: readonly AgentEvent[]): AgentEvent[] {
  return [...events].sort((left, right) => {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }

    return left.id.localeCompare(right.id);
  });
}

export function selectFirstBlockedEvent(events: readonly AgentEvent[]): AgentEvent | undefined {
  return sortEventsBySequence(selectBlockedEvents(events))[0];
}

export function selectFirstErrorEvent(events: readonly AgentEvent[]): AgentEvent | undefined {
  return sortEventsBySequence(selectErrorEvents(events))[0];
}

export function selectPreviousEvent(
  events: readonly AgentEvent[],
  eventId: string | undefined,
): AgentEvent | undefined {
  if (eventId === undefined) {
    return undefined;
  }

  const sortedEvents = sortEventsBySequence(events);
  const eventIndex = sortedEvents.findIndex((event) => event.id === eventId);

  if (eventIndex <= 0) {
    return undefined;
  }

  return sortedEvents[eventIndex - 1];
}
