import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { AgentEvent, RelationshipKind, WorldState } from "../events/types";
import {
  buildRelationshipGraphRows,
  buildRelationshipGraphSummary,
  DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
  RELATIONSHIP_GRAPH_KINDS,
  type RelationshipGraphKindFilterMap,
  type RelationshipGraphRow,
} from "./relationshipGraphModel";

type RelationshipGraphPanelProps = {
  events: readonly AgentEvent[];
  onJumpToEvent: (event: AgentEvent) => void;
  selectedAgentId?: string;
  worldState: WorldState;
};

type GraphNode = {
  agentId: string;
  name: string;
  x: number;
  y: number;
};

const sectionStyle = {
  display: "grid",
  gap: "12px",
  padding: "16px 0",
  borderBottom: "1px solid rgba(157, 181, 166, 0.2)",
} satisfies CSSProperties;

const titleRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "start",
} satisfies CSSProperties;

const titleStyle = {
  margin: "0",
  color: "#dce8df",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
} satisfies CSSProperties;

const metaStyle = {
  color: "#95aaa0",
  fontSize: "11px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const countPillStyle = {
  border: "1px solid rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  padding: "4px 7px",
  color: "#edf6ef",
  background: "#101a1d",
  fontSize: "11px",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  minHeight: "34px",
  border: "1px solid rgba(143, 170, 157, 0.28)",
  borderRadius: "6px",
  padding: "7px 9px",
  color: "#edf6ef",
  background: "#0d1517",
  fontSize: "12px",
} satisfies CSSProperties;

const controlRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "5px",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: "30px",
  border: "1px solid rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  padding: "5px 7px",
  color: "#d9e4de",
  background: "#162427",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 760,
  lineHeight: 1.1,
} satisfies CSSProperties;

const pressedButtonStyle = {
  ...buttonStyle,
  border: "1px solid rgba(117, 201, 164, 0.72)",
  color: "#ecfff4",
  background: "#18352c",
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...buttonStyle,
  color: "#7d8d85",
  cursor: "not-allowed",
  background: "#111a1c",
} satisfies CSSProperties;

const graphFrameStyle = {
  minHeight: "150px",
  border: "1px solid rgba(143, 170, 157, 0.2)",
  borderRadius: "8px",
  background: "#0b1315",
  overflow: "hidden",
} satisfies CSSProperties;

const rowListStyle = {
  display: "grid",
  gap: "8px",
} satisfies CSSProperties;

const rowStyle = {
  display: "grid",
  gap: "7px",
  borderTop: "1px solid rgba(143, 170, 157, 0.16)",
  paddingTop: "8px",
  color: "#d8e2dc",
  fontSize: "12px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const rowHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "start",
} satisfies CSSProperties;

const rowTitleStyle = {
  minWidth: 0,
  color: "#edf6ef",
  fontSize: "12px",
  fontWeight: 800,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const strengthStyle = {
  color: "#edf6ef",
  fontSize: "12px",
  fontWeight: 800,
} satisfies CSSProperties;

const chipRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
} satisfies CSSProperties;

const chipStyle = {
  border: "1px solid rgba(143, 170, 157, 0.2)",
  borderRadius: "6px",
  padding: "3px 6px",
  color: "#b7c8bf",
  background: "#101a1d",
  fontSize: "10px",
  fontWeight: 740,
  lineHeight: 1,
} satisfies CSSProperties;

const evidenceRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
} satisfies CSSProperties;

function colorForKind(kind: RelationshipKind): string {
  switch (kind) {
    case "message":
      return "#7dc6c7";
    case "handoff":
      return "#91d18b";
    case "declared":
      return "#c7b276";
    case "diffusion":
      return "#d9937c";
  }
}

function toggleKind(
  kindFilters: RelationshipGraphKindFilterMap,
  kind: RelationshipKind,
): RelationshipGraphKindFilterMap {
  return {
    ...kindFilters,
    [kind]: !kindFilters[kind],
  };
}

function formatAgentName(worldState: WorldState, agentId: string): string {
  return worldState.agents[agentId]?.agentName ?? agentId;
}

function buildGraphNodes(
  rows: readonly RelationshipGraphRow[],
  worldState: WorldState,
): GraphNode[] {
  const agentIds = Array.from(
    new Set(rows.slice(0, 10).flatMap((row) => row.relationship.agentIds)),
  ).slice(0, 12);
  const radius = agentIds.length <= 2 ? 44 : 55;

  return agentIds.map((agentId, index) => {
    const angle = agentIds.length <= 1 ? 0 : (Math.PI * 2 * index) / agentIds.length - Math.PI / 2;

    return {
      agentId,
      name: formatAgentName(worldState, agentId),
      x: 160 + Math.cos(angle) * radius,
      y: 75 + Math.sin(angle) * radius,
    };
  });
}

function NetworkGraph({
  rows,
  worldState,
}: {
  rows: readonly RelationshipGraphRow[];
  worldState: WorldState;
}) {
  const graphRows = rows.slice(0, 10);
  const nodes = buildGraphNodes(graphRows, worldState);
  const nodeById = new Map(nodes.map((node) => [node.agentId, node]));

  if (graphRows.length === 0) {
    return (
      <div style={{ ...graphFrameStyle, display: "grid", placeItems: "center", padding: "16px" }}>
        <p style={{ ...metaStyle, margin: 0 }}>No relationship evidence matches this graph.</p>
      </div>
    );
  }

  return (
    <div style={graphFrameStyle} aria-label="Relationship graph projection">
      <svg
        role="img"
        aria-label="Event-derived relationship graph"
        viewBox="0 0 320 150"
        width="100%"
        height="150"
      >
        <rect width="320" height="150" fill="#0b1315" />
        {graphRows.map((row) => {
          const [leftAgentId, rightAgentId] = row.relationship.agentIds;
          const left = nodeById.get(leftAgentId);
          const right = nodeById.get(rightAgentId);

          if (left === undefined || right === undefined) {
            return null;
          }

          return (
            <line
              key={row.relationship.relationshipId}
              x1={left.x}
              y1={left.y}
              x2={right.x}
              y2={right.y}
              stroke={colorForKind(row.relationship.lastInteractionKind)}
              strokeLinecap="round"
              strokeOpacity="0.74"
              strokeWidth={Math.min(5, 1.2 + row.relationship.strength / 18)}
            />
          );
        })}
        {nodes.map((node) => (
          <g key={node.agentId}>
            <circle cx={node.x} cy={node.y} r="8" fill="#dce8df" stroke="#264140" strokeWidth="2" />
            <text
              x={node.x}
              y={node.y + 20}
              fill="#aebfb7"
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
            >
              {node.name.slice(0, 13)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function EvidenceButton({
  event,
  label,
  onJumpToEvent,
}: {
  event?: AgentEvent;
  label: string;
  onJumpToEvent: (event: AgentEvent) => void;
}) {
  return (
    <button
      type="button"
      style={event === undefined ? disabledButtonStyle : buttonStyle}
      disabled={event === undefined}
      onClick={() => {
        if (event !== undefined) {
          onJumpToEvent(event);
        }
      }}
    >
      {label}: {event?.id ?? "none"}
    </button>
  );
}

function RelationshipRow({
  onJumpToEvent,
  row,
}: {
  onJumpToEvent: (event: AgentEvent) => void;
  row: RelationshipGraphRow;
}) {
  return (
    <div style={rowStyle}>
      <div style={rowHeaderStyle}>
        <div style={rowTitleStyle}>
          {row.leftAgentName} / {row.rightAgentName}
        </div>
        <strong style={strengthStyle}>{row.relationship.strength}</strong>
      </div>
      <div style={metaStyle}>
        last={row.relationship.lastInteractionKind}; events={row.relationship.interactionCount};
        evidence={row.relationship.evidenceEventIds.length}
      </div>
      <div style={chipRowStyle}>
        {row.kindCounts.map((entry) => (
          <span key={entry.kind} style={chipStyle}>
            {entry.kind} {entry.count}
          </span>
        ))}
        {row.relationship.tags.slice(0, 3).map((tag) => (
          <span key={tag} style={chipStyle}>
            {tag}
          </span>
        ))}
      </div>
      <div style={evidenceRowStyle}>
        <EvidenceButton
          event={row.latestEvidenceEvent}
          label="Latest"
          onJumpToEvent={onJumpToEvent}
        />
        {row.evidenceEvents.slice(-2).map((event) => (
          <EvidenceButton
            key={event.id}
            event={event}
            label={`Seq ${event.sequence}`}
            onJumpToEvent={onJumpToEvent}
          />
        ))}
      </div>
    </div>
  );
}

export function RelationshipGraphPanel({
  events,
  onJumpToEvent,
  selectedAgentId,
  worldState,
}: RelationshipGraphPanelProps) {
  const [query, setQuery] = useState("");
  const [kindFilters, setKindFilters] = useState<RelationshipGraphKindFilterMap>(() => ({
    ...DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
  }));
  const [selectedOnly, setSelectedOnly] = useState(false);
  const filters = useMemo(
    () => ({
      kindFilters,
      query,
      selectedAgentId,
      selectedOnly,
    }),
    [kindFilters, query, selectedAgentId, selectedOnly],
  );
  const rows = useMemo(
    () => buildRelationshipGraphRows(worldState, events, filters),
    [events, filters, worldState],
  );
  const summary = useMemo(
    () => buildRelationshipGraphSummary(worldState, rows, selectedAgentId),
    [rows, selectedAgentId, worldState],
  );
  const selectedAgentName =
    selectedAgentId === undefined ? "none" : formatAgentName(worldState, selectedAgentId);

  return (
    <section style={sectionStyle} aria-label="Graph view">
      <div style={titleRowStyle}>
        <div>
          <h2 style={titleStyle}>Graph View</h2>
          <div style={metaStyle}>
            Event-derived relationships; selected agent {selectedAgentName}; evidence refs{" "}
            {summary.totalEvidenceRefs}
          </div>
        </div>
        <span style={countPillStyle}>
          {summary.visibleRelationships}/{summary.totalRelationships}
        </span>
      </div>

      <input
        aria-label="Filter relationships"
        placeholder="Filter agents, tags, event IDs"
        style={inputStyle}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      <div style={controlRowStyle} aria-label="Relationship graph filters">
        {RELATIONSHIP_GRAPH_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={kindFilters[kind]}
            style={kindFilters[kind] ? pressedButtonStyle : buttonStyle}
            onClick={() => setKindFilters((current) => toggleKind(current, kind))}
          >
            {kind}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={selectedOnly}
          disabled={selectedAgentId === undefined}
          style={
            selectedAgentId === undefined
              ? disabledButtonStyle
              : selectedOnly
                ? pressedButtonStyle
                : buttonStyle
          }
          onClick={() => setSelectedOnly((current) => !current)}
        >
          selected {summary.selectedRelationships}
        </button>
      </div>

      <NetworkGraph rows={rows} worldState={worldState} />

      <div style={rowListStyle} aria-label="Relationship evidence rows">
        {rows.slice(0, 6).map((row) => (
          <RelationshipRow
            key={row.relationship.relationshipId}
            onJumpToEvent={onJumpToEvent}
            row={row}
          />
        ))}
        {rows.length > 6 ? (
          <div style={metaStyle}>Showing 6 of {rows.length}; narrow the filter for more.</div>
        ) : null}
      </div>
    </section>
  );
}
