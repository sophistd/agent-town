import type { AgentEvent, RelationshipKind, RelationshipState, WorldState } from "../events/types";

export const RELATIONSHIP_GRAPH_KINDS = [
  "message",
  "handoff",
  "declared",
  "diffusion",
] as const satisfies readonly RelationshipKind[];

export type RelationshipGraphKindFilterMap = Record<RelationshipKind, boolean>;

export type RelationshipGraphFilters = {
  kindFilters: RelationshipGraphKindFilterMap;
  query: string;
  selectedAgentId?: string;
  selectedOnly: boolean;
};

export type RelationshipGraphKindCount = {
  count: number;
  kind: RelationshipKind;
};

export type RelationshipGraphRow = {
  evidenceEvents: AgentEvent[];
  kindCounts: RelationshipGraphKindCount[];
  latestEvidenceEvent?: AgentEvent;
  leftAgentName: string;
  relationship: RelationshipState;
  rightAgentName: string;
};

export type RelationshipGraphSummary = {
  selectedRelationships: number;
  totalEvidenceRefs: number;
  totalRelationships: number;
  visibleRelationships: number;
};

export const DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS: RelationshipGraphKindFilterMap = {
  declared: true,
  diffusion: true,
  handoff: true,
  message: true,
};

function formatAgentName(worldState: WorldState, agentId: string): string {
  return worldState.agents[agentId]?.agentName ?? agentId;
}

function relationshipKindCount(
  relationship: RelationshipState,
  kind: RelationshipKind,
): number {
  switch (kind) {
    case "message":
      return relationship.messageCount;
    case "handoff":
      return relationship.handoffCount;
    case "declared":
      return relationship.declaredCount;
    case "diffusion":
      return relationship.diffusionCount;
  }
}

function selectedAgentMatches(
  relationship: RelationshipState,
  selectedAgentId: string | undefined,
  selectedOnly: boolean,
): boolean {
  if (!selectedOnly) {
    return true;
  }

  return selectedAgentId !== undefined && relationship.agentIds.includes(selectedAgentId);
}

function kindMatches(
  relationship: RelationshipState,
  kindFilters: RelationshipGraphKindFilterMap,
): boolean {
  return RELATIONSHIP_GRAPH_KINDS.some(
    (kind) => kindFilters[kind] && relationshipKindCount(relationship, kind) > 0,
  );
}

function queryMatches(row: RelationshipGraphRow, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return true;
  }

  const eventText = row.evidenceEvents
    .flatMap((event) => [event.id, event.content, event.summary ?? "", event.type])
    .join(" ");
  const haystack = [
    row.relationship.relationshipId,
    row.leftAgentName,
    row.rightAgentName,
    row.relationship.agentIds.join(" "),
    row.relationship.lastEventId,
    row.relationship.lastInteractionKind,
    row.relationship.tags.join(" "),
    row.relationship.evidenceEventIds.join(" "),
    eventText,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function sortRelationships(relationships: readonly RelationshipState[]): RelationshipState[] {
  return [...relationships].sort((left, right) => {
    if (left.strength !== right.strength) {
      return right.strength - left.strength;
    }

    if (left.lastSequence !== right.lastSequence) {
      return right.lastSequence - left.lastSequence;
    }

    return left.relationshipId.localeCompare(right.relationshipId);
  });
}

export function buildRelationshipGraphRows(
  worldState: WorldState,
  events: readonly AgentEvent[],
  filters: RelationshipGraphFilters,
): RelationshipGraphRow[] {
  const eventById = new Map(events.map((event) => [event.id, event]));

  return sortRelationships(Object.values(worldState.relationships))
    .filter((relationship) =>
      selectedAgentMatches(relationship, filters.selectedAgentId, filters.selectedOnly),
    )
    .filter((relationship) => kindMatches(relationship, filters.kindFilters))
    .map((relationship) => {
      const [leftAgentId, rightAgentId] = relationship.agentIds;
      const evidenceEvents = relationship.evidenceEventIds
        .map((eventId) => eventById.get(eventId))
        .filter((event): event is AgentEvent => event !== undefined)
        .sort((left, right) => left.sequence - right.sequence);
      const latestEvidenceEvent =
        eventById.get(relationship.lastEventId) ?? evidenceEvents[evidenceEvents.length - 1];
      const kindCounts = RELATIONSHIP_GRAPH_KINDS.map((kind) => ({
        count: relationshipKindCount(relationship, kind),
        kind,
      })).filter((entry) => entry.count > 0);

      return {
        evidenceEvents,
        kindCounts,
        latestEvidenceEvent,
        leftAgentName: formatAgentName(worldState, leftAgentId),
        relationship,
        rightAgentName: formatAgentName(worldState, rightAgentId),
      };
    })
    .filter((row) => queryMatches(row, filters.query));
}

export function buildRelationshipGraphSummary(
  worldState: WorldState,
  rows: readonly RelationshipGraphRow[],
  selectedAgentId: string | undefined,
): RelationshipGraphSummary {
  const relationships = Object.values(worldState.relationships);
  const selectedRelationships =
    selectedAgentId === undefined
      ? 0
      : relationships.filter((relationship) => relationship.agentIds.includes(selectedAgentId))
          .length;
  const totalEvidenceRefs = relationships.reduce(
    (count, relationship) => count + relationship.evidenceEventIds.length,
    0,
  );

  return {
    selectedRelationships,
    totalEvidenceRefs,
    totalRelationships: relationships.length,
    visibleRelationships: rows.length,
  };
}
