import { useMemo, useState, type CSSProperties } from "react";

import { mockEvents } from "../events/mockEvents";
import { replay } from "../events/reducer";
import {
  selectBlockedEvents,
  selectCurrentEvent,
  selectEdges,
  selectErrorEvents,
  selectRunSummary,
} from "../events/selectors";

const shellStyle = {
  minHeight: "100vh",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  background: "#f7f7f4",
  color: "#202124",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} satisfies CSSProperties;

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 280px) minmax(320px, 1fr) minmax(260px, 340px)",
  gap: "12px",
  minHeight: 0,
  padding: "12px",
  flex: 1,
} satisfies CSSProperties;

const panelStyle = {
  minWidth: 0,
  border: "1px solid #d8d8d2",
  padding: "16px",
  background: "#fffdfa",
  overflow: "auto",
} satisfies CSSProperties;

const compactTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#42423d",
} satisfies CSSProperties;

const eventButtonStyle = {
  width: "100%",
  border: "1px solid #d8d8d2",
  borderRadius: "6px",
  padding: "10px",
  background: "#fffdfa",
  color: "#202124",
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const selectedEventButtonStyle = {
  ...eventButtonStyle,
  borderColor: "#1b6f6a",
  background: "#eaf4f2",
} satisfies CSSProperties;

const preStyle = {
  margin: 0,
  padding: "12px",
  border: "1px solid #d8d8d2",
  borderRadius: "6px",
  background: "#22231f",
  color: "#f7f7f4",
  fontSize: "12px",
  lineHeight: 1.5,
  overflow: "auto",
  whiteSpace: "pre-wrap",
} satisfies CSSProperties;

export function App() {
  const [cursor, setCursor] = useState(mockEvents.length - 1);
  const timeline = useMemo(
    () =>
      mockEvents.map((event, index) => ({
        event,
        index,
        state: replay(mockEvents, index),
      })),
    [],
  );
  const currentState = timeline[cursor]?.state ?? replay(mockEvents, -1);
  const currentEvent = selectCurrentEvent(currentState, mockEvents);
  const runSummary = selectRunSummary(currentState);
  const edges = selectEdges(currentState);
  const blockedEvents = selectBlockedEvents(mockEvents);
  const errorEvents = selectErrorEvents(mockEvents);
  const agents = Object.values(currentState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const worldStatePrint = {
    cursor: currentState.cursor,
    currentEventId: currentState.currentEventId,
    selectedEventId: currentState.selectedEventId,
    selectedAgentId: currentState.selectedAgentId,
    runSummary,
    agents: agents.map((agent) => ({
      id: agent.agentId,
      role: agent.role,
      status: agent.status,
      location: agent.location,
      currentTaskId: agent.currentTaskId,
      bubble: agent.bubble,
    })),
    edges,
    warnings: currentState.warnings,
    quarantinedEvents: currentState.quarantinedEvents,
  };

  return (
    <main style={shellStyle}>
      <header style={{ padding: "14px 16px 2px" }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>Agent Town</h1>
      </header>
      <div style={layoutStyle}>
        <section style={panelStyle} aria-label="Event timeline">
          <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Timeline</h2>
          <ol style={{ display: "grid", gap: "8px", margin: 0, padding: 0, listStyle: "none" }}>
            {timeline.map(({ event, index, state }) => (
              <li key={event.id}>
                <button
                  type="button"
                  style={index === cursor ? selectedEventButtonStyle : eventButtonStyle}
                  onClick={() => setCursor(index)}
                  aria-pressed={index === cursor}
                >
                  <strong>
                    {String(event.sequence).padStart(2, "0")} · {event.type}
                  </strong>
                  <span style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                    {event.agentName} · {state.currentEventId}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section style={panelStyle} aria-label="World state print">
          <h2 style={{ margin: "0 0 8px", fontSize: "16px" }}>World State</h2>
          <p style={{ ...compactTextStyle, marginBottom: "12px" }}>
            Cursor {cursor} prints the selected event and the derived state after replaying
            events 0 through {cursor}.
          </p>
          <pre style={preStyle}>{JSON.stringify(worldStatePrint, null, 2)}</pre>
        </section>

        <section style={panelStyle} aria-label="Run summary and agents">
          <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Run Summary</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", margin: 0 }}>
            <dt>Total</dt>
            <dd style={{ margin: 0 }}>{runSummary.totalEvents}</dd>
            <dt>Handoffs</dt>
            <dd style={{ margin: 0 }}>{runSummary.handoffCount}</dd>
            <dt>Tools</dt>
            <dd style={{ margin: 0 }}>{runSummary.toolCallCount}</dd>
            <dt>Memory</dt>
            <dd style={{ margin: 0 }}>{runSummary.memoryActionCount}</dd>
            <dt>Blocked</dt>
            <dd style={{ margin: 0 }}>{runSummary.blockedCount}</dd>
            <dt>Errors</dt>
            <dd style={{ margin: 0 }}>{runSummary.errorCount}</dd>
            <dt>Edges</dt>
            <dd style={{ margin: 0 }}>{edges.length}</dd>
          </dl>

          <h2 style={{ margin: "20px 0 12px", fontSize: "16px" }}>Agents</h2>
          <ul style={{ display: "grid", gap: "10px", margin: 0, padding: 0, listStyle: "none" }}>
            {agents.map((agent) => (
              <li key={agent.agentId} style={{ borderTop: "1px solid #e2e2db", paddingTop: "10px" }}>
                <strong>{agent.agentName}</strong>
                <p style={compactTextStyle}>
                  {agent.role} · {agent.status} · {agent.location}
                </p>
              </li>
            ))}
          </ul>

          <h2 style={{ margin: "20px 0 12px", fontSize: "16px" }}>Current Event</h2>
          <p style={compactTextStyle}>
            {currentEvent?.id} · {currentEvent?.agentName} · {currentEvent?.summary}
          </p>
          <p style={{ ...compactTextStyle, marginTop: "12px" }}>
            Blocked fixtures: {blockedEvents.length}; error fixtures: {errorEvents.length}.
          </p>
        </section>
      </div>
    </main>
  );
}
