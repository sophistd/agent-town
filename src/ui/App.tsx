import { useMemo, useState, type CSSProperties } from "react";

import { mockEvents } from "../events/mockEvents";
import { replay } from "../events/reducer";
import { selectCurrentEvent } from "../events/selectors";
import { selectAgent, selectEvent } from "../state/selectionStore";
import { DetailPanel } from "./DetailPanel";
import { Layout } from "./Layout";
import { TownCanvas } from "./TownCanvas";

const compactTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#42423d",
} satisfies CSSProperties;

const eventButtonStyle = {
  width: "160px",
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
  const agents = Object.values(currentState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );

  return (
    <Layout
      sidebar={
        <>
          <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Session / Agents</h2>
          <p style={{ ...compactTextStyle, marginBottom: "16px" }}>
            React owns playback state and derives WorldState from AgentEvent.
          </p>
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
        </>
      }
      town={<TownCanvas worldState={currentState} />}
      detail={
        <DetailPanel
          currentEvent={currentEvent}
          events={mockEvents}
          worldState={currentState}
        />
      }
      timeline={
        <>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px" }}>Timeline placeholder</h2>
          <ol
            style={{
              display: "flex",
              gap: "8px",
              margin: 0,
              padding: 0,
              listStyle: "none",
              overflowX: "auto",
            }}
          >
            {timeline.map(({ event, index }) => (
              <li key={event.id}>
                <button
                  type="button"
                  style={index === cursor ? selectedEventButtonStyle : eventButtonStyle}
                  onClick={() => {
                    setCursor(index);
                    selectEvent(event.id, event.agentId);
                    selectAgent(event.agentId);
                  }}
                  aria-pressed={index === cursor}
                >
                  <strong>
                    {String(event.sequence).padStart(2, "0")} · {event.type}
                  </strong>
                  <span style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                    {event.agentName}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      }
    />
  );
}
