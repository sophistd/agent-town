import type { CSSProperties } from "react";

import type { AgentEvent } from "../events/types";
import type { PlaybackSnapshot } from "../state/playbackStore";
import {
  pausePlayback,
  playPlayback,
  setPlaybackCursor,
  setPlaybackInterval,
  stepNext,
  stepPrevious,
} from "../state/playbackStore";
import { selectAgent, selectEvent, useSelection } from "../state/selectionStore";
import {
  matchesEventTypeFilter,
  type EventTypeFilterMap,
} from "./projectionFilters";

type TimelineProps = {
  eventTypeFilters: EventTypeFilterMap;
  events: readonly AgentEvent[];
  playback: PlaybackSnapshot;
};

const rootStyle = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: "8px",
  minHeight: 0,
} satisfies CSSProperties;

const controlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
  color: "#dce8df",
} satisfies CSSProperties;

const controlButtonStyle = {
  minWidth: "58px",
  minHeight: "30px",
  border: "1px solid rgba(143, 170, 157, 0.3)",
  borderRadius: "6px",
  background: "#162427",
  color: "#d9e4de",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...controlButtonStyle,
  color: "#8b8b83",
  cursor: "not-allowed",
} satisfies CSSProperties;

const eventListStyle = {
  display: "flex",
  alignItems: "stretch",
  gap: "6px",
  margin: 0,
  padding: "2px 0 4px",
  listStyle: "none",
  overflowX: "auto",
  minHeight: 0,
} satisfies CSSProperties;

const eventButtonStyle = {
  width: "168px",
  minWidth: "168px",
  height: "78px",
  border: "1px solid rgba(143, 170, 157, 0.26)",
  borderRadius: "6px",
  padding: "8px",
  background: "#132225",
  color: "#eaf2ec",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: "2px",
  overflow: "hidden",
} satisfies CSSProperties;

const currentEventButtonStyle = {
  ...eventButtonStyle,
  border: "1px solid #75c9a4",
  background: "#18352c",
} satisfies CSSProperties;

const selectedEventButtonStyle = {
  ...eventButtonStyle,
  border: "1px solid #7dc6c7",
  boxShadow: "inset 0 0 0 2px rgba(125, 198, 199, 0.2)",
} satisfies CSSProperties;

const currentSelectedEventButtonStyle = {
  ...currentEventButtonStyle,
  boxShadow: "inset 0 0 0 2px rgba(122, 99, 157, 0.28)",
} satisfies CSSProperties;

const metaStyle = {
  display: "block",
  fontSize: "11px",
  color: "#95aaa0",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} satisfies CSSProperties;

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#eff6ef",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} satisfies CSSProperties;

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toISOString().slice(11, 16);
}

function eventButtonStyleFor(isCurrent: boolean, isSelected: boolean): CSSProperties {
  if (isCurrent && isSelected) {
    return currentSelectedEventButtonStyle;
  }

  if (isCurrent) {
    return currentEventButtonStyle;
  }

  if (isSelected) {
    return selectedEventButtonStyle;
  }

  return eventButtonStyle;
}

export function Timeline({ eventTypeFilters, events, playback }: TimelineProps) {
  const selection = useSelection();
  const currentEvent = events[playback.cursor];
  const atStart = playback.cursor <= 0;
  const atEnd = playback.cursor >= events.length - 1;
  const visibleEvents = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => matchesEventTypeFilter(event, eventTypeFilters));

  return (
    <div style={rootStyle}>
      <div style={controlsStyle}>
        <h2 style={{ margin: 0, fontSize: "14px", textTransform: "uppercase" }}>
          Timeline
        </h2>
        <button
          type="button"
          style={atStart ? disabledButtonStyle : controlButtonStyle}
          onClick={() => stepPrevious(events.length)}
          disabled={atStart}
        >
          Prev
        </button>
        {playback.isPlaying ? (
          <button type="button" style={controlButtonStyle} onClick={pausePlayback}>
            Pause
          </button>
        ) : (
          <button type="button" style={controlButtonStyle} onClick={() => playPlayback(events.length)}>
            Play
          </button>
        )}
        <button
          type="button"
          style={atEnd ? disabledButtonStyle : controlButtonStyle}
          onClick={() => stepNext(events.length)}
          disabled={atEnd}
        >
          Next
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#95aaa0",
          }}
        >
          Speed
          <select
            value={playback.intervalMs}
            onChange={(event) => setPlaybackInterval(Number(event.currentTarget.value))}
            style={{
              minHeight: "30px",
              border: "1px solid rgba(143, 170, 157, 0.3)",
              borderRadius: "6px",
              background: "#162427",
              color: "#d9e4de",
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 7px",
            }}
          >
            <option value={1400}>0.7x</option>
            <option value={900}>1x</option>
            <option value={450}>2x</option>
          </select>
        </label>
        <span style={{ marginLeft: "4px", fontSize: "12px", color: "#95aaa0" }}>
          {events.length === 0 ? "0 / 0" : `${playback.cursor + 1} / ${events.length}`}
          {currentEvent === undefined ? "" : ` · ${currentEvent.id}`}
        </span>
      </div>

      <ol style={eventListStyle}>
        {visibleEvents.map(({ event, index }) => {
          const isCurrent = index === playback.cursor;
          const isSelected = event.id === selection.selectedEventId;

          return (
            <li key={event.id}>
              <button
                type="button"
                style={eventButtonStyleFor(isCurrent, isSelected)}
                onClick={() => {
                  setPlaybackCursor(index, events.length);
                  selectEvent(event.id, event.agentId);
                  selectAgent(event.agentId);
                }}
                aria-current={isCurrent ? "step" : undefined}
                aria-pressed={isSelected}
              >
                <strong style={labelStyle}>
                  #{String(event.sequence).padStart(2, "0")} · {formatTimestamp(event.timestamp)}
                </strong>
                <span style={metaStyle}>
                  {event.agentName} · {event.type}
                </span>
                <span style={labelStyle}>{event.summary ?? event.content}</span>
              </button>
            </li>
          );
        })}
        {visibleEvents.length === 0 ? (
          <li style={{ color: "#95aaa0", fontSize: "12px", padding: "16px 4px" }}>
            No events match the active filters.
          </li>
        ) : null}
      </ol>
    </div>
  );
}
