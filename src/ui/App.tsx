import { useEffect, useMemo, type CSSProperties } from "react";

import { mockEvents } from "../events/mockEvents";
import { replay } from "../events/reducer";
import { selectCurrentEvent } from "../events/selectors";
import { advancePlayback, usePlayback } from "../state/playbackStore";
import { DetailPanel } from "./DetailPanel";
import { Layout } from "./Layout";
import { Timeline } from "./Timeline";
import { TownCanvas } from "./TownCanvas";

const compactTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#42423d",
} satisfies CSSProperties;

export function App() {
  const playback = usePlayback();
  const currentState = useMemo(
    () => replay(mockEvents, playback.cursor),
    [playback.cursor],
  );
  const currentEvent = selectCurrentEvent(currentState, mockEvents);
  const agents = Object.values(currentState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(
      () => advancePlayback(mockEvents.length),
      playback.intervalMs,
    );

    return () => window.clearInterval(timer);
  }, [playback.intervalMs, playback.isPlaying]);

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
        <Timeline events={mockEvents} playback={playback} />
      }
    />
  );
}
