import type { CSSProperties } from "react";

import type { AgentEvent } from "../events/types";
import type { PlaybackSnapshot } from "../state/playbackStore";
import {
  pausePlayback,
  playPlayback,
  setPlaybackCursor,
  stepNext,
  stepPrevious,
} from "../state/playbackStore";
import { selectAgent, selectEvent, useSelection } from "../state/selectionStore";

type TimelineProps = {
  events: readonly AgentEvent[];
  playback: PlaybackSnapshot;
};

const rootStyle = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: "10px",
  minHeight: 0,
} satisfies CSSProperties;

const controlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
} satisfies CSSProperties;

const controlButtonStyle = {
  minWidth: "74px",
  minHeight: "32px",
  border: "1px solid #cfcfc8",
  borderRadius: "6px",
  background: "#fffdfa",
  color: "#202124",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...controlButtonStyle,
  color: "#8b8b83",
  cursor: "not-allowed",
} satisfies CSSProperties;

const eventListStyle = {
  display: "flex",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
  overflowX: "auto",
  minHeight: 0,
} satisfies CSSProperties;

const eventButtonStyle = {
  width: "188px",
  minWidth: "188px",
  height: "66px",
  border: "1px solid #d8d8d2",
  borderRadius: "6px",
  padding: "8px",
  background: "#fffdfa",
  color: "#202124",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: "2px",
  overflow: "hidden",
} satisfies CSSProperties;

const currentEventButtonStyle = {
  ...eventButtonStyle,
  borderColor: "#1b6f6a",
  background: "#eaf4f2",
} satisfies CSSProperties;

const selectedEventButtonStyle = {
  ...eventButtonStyle,
  borderColor: "#7a639d",
  boxShadow: "inset 0 0 0 2px rgba(122, 99, 157, 0.24)",
} satisfies CSSProperties;

const currentSelectedEventButtonStyle = {
  ...currentEventButtonStyle,
  boxShadow: "inset 0 0 0 2px rgba(122, 99, 157, 0.28)",
} satisfies CSSProperties;

const metaStyle = {
  display: "block",
  fontSize: "11px",
  color: "#62625b",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} satisfies CSSProperties;

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#202124",
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

export function Timeline({ events, playback }: TimelineProps) {
  const selection = useSelection();
  const currentEvent = events[playback.cursor];
  const atStart = playback.cursor <= 0;
  const atEnd = playback.cursor >= events.length - 1;

  return (
    <div style={rootStyle}>
      <div style={controlsStyle}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Timeline</h2>
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
        <span style={{ marginLeft: "4px", fontSize: "12px", color: "#62625b" }}>
          {events.length === 0 ? "0 / 0" : `${playback.cursor + 1} / ${events.length}`}
          {currentEvent === undefined ? "" : ` · ${currentEvent.id}`}
        </span>
      </div>

      <ol style={eventListStyle}>
        {events.map((event, index) => {
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
      </ol>
    </div>
  );
}
