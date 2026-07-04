import { useCallback, useEffect, useMemo, type CSSProperties } from "react";

import { mockFailureRun } from "../events/mockFailureRun";
import { replay } from "../events/reducer";
import { selectCurrentEvent } from "../events/selectors";
import type { AgentEvent } from "../events/types";
import { advancePlayback, setPlaybackCursor, usePlayback } from "../state/playbackStore";
import { selectAgent, selectEvent } from "../state/selectionStore";
import { DetailPanel } from "./DetailPanel";
import { Layout } from "./Layout";
import { RunSummary } from "./RunSummary";
import { Timeline } from "./Timeline";
import { TownCanvas } from "./TownCanvas";

const compactTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#42423d",
} satisfies CSSProperties;

const demoEvents = mockFailureRun;

export function App() {
  const playback = usePlayback();
  const currentState = useMemo(
    () => replay(demoEvents, playback.cursor),
    [playback.cursor],
  );
  const summaryState = useMemo(
    () => replay(demoEvents, demoEvents.length - 1),
    [],
  );
  const currentEvent = selectCurrentEvent(currentState, demoEvents);
  const agents = Object.values(currentState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const jumpToEvent = useCallback((event: AgentEvent) => {
    const index = demoEvents.findIndex((candidate) => candidate.id === event.id);

    if (index < 0) {
      return;
    }

    setPlaybackCursor(index, demoEvents.length);
    selectEvent(event.id, event.agentId);
    selectAgent(event.agentId);
  }, []);

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(
      () => advancePlayback(demoEvents.length),
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
        <>
          <RunSummary
            events={demoEvents}
            onJumpToEvent={jumpToEvent}
            worldState={summaryState}
          />
          <DetailPanel
            currentEvent={currentEvent}
            events={demoEvents}
            worldState={currentState}
          />
        </>
      }
      timeline={
        <Timeline events={demoEvents} playback={playback} />
      }
    />
  );
}
