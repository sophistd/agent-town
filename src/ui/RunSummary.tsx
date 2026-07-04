import type { CSSProperties } from "react";

import {
  selectActiveAgentCount,
  selectFirstBlockedEvent,
  selectFirstErrorEvent,
  selectPreviousEvent,
  selectRelationshipCount,
  selectRunSummary,
  selectTopRelationships,
} from "../events/selectors";
import type { AgentEvent, RelationshipState, WorldState } from "../events/types";

type RunSummaryProps = {
  events: readonly AgentEvent[];
  onJumpToEvent: (event: AgentEvent) => void;
  worldState: WorldState;
};

const sectionStyle = {
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(157, 181, 166, 0.2)",
} satisfies CSSProperties;

const titleStyle = {
  margin: "0 0 12px",
  color: "#dce8df",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
} satisfies CSSProperties;

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
} satisfies CSSProperties;

const metricStyle = {
  border: "1px solid rgba(143, 170, 157, 0.22)",
  borderRadius: "6px",
  padding: "8px",
  background: "#101a1d",
} satisfies CSSProperties;

const metricLabelStyle = {
  display: "block",
  color: "#95aaa0",
  fontSize: "11px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const metricValueStyle = {
  display: "block",
  marginTop: "2px",
  color: "#edf6ef",
  fontSize: "17px",
  fontWeight: 750,
  lineHeight: 1.2,
} satisfies CSSProperties;

const shortcutRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  marginTop: "12px",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: "34px",
  border: "1px solid rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  background: "#162427",
  color: "#d9e4de",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "left",
  padding: "7px 9px",
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...buttonStyle,
  color: "#8b8b83",
  cursor: "not-allowed",
} satisfies CSSProperties;

const relationshipListStyle = {
  display: "grid",
  gap: "6px",
  marginTop: "12px",
} satisfies CSSProperties;

const relationshipRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "center",
  borderTop: "1px solid rgba(143, 170, 157, 0.16)",
  paddingTop: "7px",
  color: "#d8e2dc",
  fontSize: "12px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const relationshipMetaStyle = {
  color: "#95aaa0",
  fontSize: "11px",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const relationshipStrengthStyle = {
  color: "#edf6ef",
  fontSize: "12px",
  fontWeight: 750,
} satisfies CSSProperties;

function ShortcutButton({
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

function formatAgentName(worldState: WorldState, agentId: string): string {
  return worldState.agents[agentId]?.agentName ?? agentId;
}

function RelationshipRow({
  relationship,
  worldState,
}: {
  relationship: RelationshipState;
  worldState: WorldState;
}) {
  const [leftAgentId, rightAgentId] = relationship.agentIds;

  return (
    <div style={relationshipRowStyle}>
      <div>
        <strong>
          {formatAgentName(worldState, leftAgentId)} / {formatAgentName(worldState, rightAgentId)}
        </strong>
        <div style={relationshipMetaStyle}>
          {relationship.lastInteractionKind}; events={relationship.interactionCount}; evidence=
          {relationship.evidenceEventIds.length}
        </div>
      </div>
      <span style={relationshipStrengthStyle}>{relationship.strength}</span>
    </div>
  );
}

export function RunSummary({ events, onJumpToEvent, worldState }: RunSummaryProps) {
  const summary = selectRunSummary(worldState);
  const firstBlockedEvent = selectFirstBlockedEvent(events);
  const firstErrorEvent = selectFirstErrorEvent(events);
  const previousErrorContext = selectPreviousEvent(events, firstErrorEvent?.id);
  const topRelationships = selectTopRelationships(worldState, 4);

  const metrics = [
    ["Events", summary.totalEvents],
    ["Agents", selectActiveAgentCount(worldState)],
    ["Relationships", selectRelationshipCount(worldState)],
    ["Handoffs", summary.handoffCount],
    ["Tool calls", summary.toolCallCount],
    ["Memory actions", summary.memoryActionCount],
    ["Blocked", summary.blockedCount],
    ["Errors", summary.errorCount],
  ] as const;

  return (
    <section style={sectionStyle} aria-label="Run summary">
      <h2 style={titleStyle}>Run Summary</h2>
      <div style={metricGridStyle}>
        {metrics.map(([label, value]) => (
          <div key={label} style={metricStyle}>
            <span style={metricLabelStyle}>{label}</span>
            <strong style={metricValueStyle}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={shortcutRowStyle} aria-label="Failure shortcuts">
        <ShortcutButton
          event={firstBlockedEvent}
          label="First blocked"
          onJumpToEvent={onJumpToEvent}
        />
        <ShortcutButton
          event={firstErrorEvent}
          label="First error"
          onJumpToEvent={onJumpToEvent}
        />
        <ShortcutButton
          event={previousErrorContext}
          label="Before error"
          onJumpToEvent={onJumpToEvent}
        />
      </div>

      <div style={relationshipListStyle} aria-label="Top relationships">
        {topRelationships.map((relationship) => (
          <RelationshipRow
            key={relationship.relationshipId}
            relationship={relationship}
            worldState={worldState}
          />
        ))}
      </div>
    </section>
  );
}
