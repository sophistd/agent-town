import type { CSSProperties } from "react";

import {
  selectActiveAgentCount,
  selectFirstBlockedEvent,
  selectFirstErrorEvent,
  selectPreviousEvent,
  selectRunSummary,
} from "../events/selectors";
import type { AgentEvent, WorldState } from "../events/types";

type RunSummaryProps = {
  events: readonly AgentEvent[];
  onJumpToEvent: (event: AgentEvent) => void;
  worldState: WorldState;
};

const sectionStyle = {
  paddingBottom: "16px",
  borderBottom: "1px solid #e2e2db",
} satisfies CSSProperties;

const titleStyle = {
  margin: "0 0 12px",
  fontSize: "16px",
} satisfies CSSProperties;

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
} satisfies CSSProperties;

const metricStyle = {
  border: "1px solid #deded7",
  borderRadius: "6px",
  padding: "8px",
  background: "#f7f7f4",
} satisfies CSSProperties;

const metricLabelStyle = {
  display: "block",
  color: "#62625b",
  fontSize: "11px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const metricValueStyle = {
  display: "block",
  marginTop: "2px",
  color: "#202124",
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
  border: "1px solid #cfcfc8",
  borderRadius: "6px",
  background: "#fffdfa",
  color: "#202124",
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

export function RunSummary({ events, onJumpToEvent, worldState }: RunSummaryProps) {
  const summary = selectRunSummary(worldState);
  const firstBlockedEvent = selectFirstBlockedEvent(events);
  const firstErrorEvent = selectFirstErrorEvent(events);
  const previousErrorContext = selectPreviousEvent(events, firstErrorEvent?.id);

  const metrics = [
    ["Events", summary.totalEvents],
    ["Agents", selectActiveAgentCount(worldState)],
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
    </section>
  );
}
