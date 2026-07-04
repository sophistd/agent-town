import type { CSSProperties } from "react";

import type { AgentEvent, WorldState } from "../events/types";
import { useSelection } from "../state/selectionStore";

const sectionTitleStyle = {
  margin: "0 0 12px",
  fontSize: "16px",
} satisfies CSSProperties;

const mutedTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.45,
  color: "#62625b",
} satisfies CSSProperties;

const dataRowStyle = {
  display: "grid",
  gridTemplateColumns: "112px minmax(0, 1fr)",
  gap: "8px",
  margin: "8px 0",
  fontSize: "13px",
} satisfies CSSProperties;

const valueStyle = {
  minWidth: 0,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const preStyle = {
  margin: "10px 0 0",
  padding: "10px",
  border: "1px solid #d8d8d2",
  borderRadius: "6px",
  background: "#22231f",
  color: "#f7f7f4",
  fontSize: "11px",
  lineHeight: 1.45,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  maxHeight: "260px",
} satisfies CSSProperties;

type DetailPanelProps = {
  currentEvent?: AgentEvent;
  events: readonly AgentEvent[];
  worldState: WorldState;
};

function findEvent(events: readonly AgentEvent[], eventId: string | undefined) {
  return events.find((event) => event.id === eventId);
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "none";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function DetailPanel({ currentEvent, events, worldState }: DetailPanelProps) {
  const selection = useSelection();
  const selectedEvent = findEvent(events, selection.selectedEventId);
  const selectedAgent =
    selection.selectedAgentId === undefined
      ? undefined
      : worldState.agents[selection.selectedAgentId];

  return (
    <>
      <h2 style={sectionTitleStyle}>Event / Agent Detail</h2>

      <section aria-label="Playback state">
        <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>Playback</h3>
        <p style={mutedTextStyle}>
          Current event: {currentEvent?.id ?? "none"}
          <br />
          Selected event: {selectedEvent?.id ?? "none"}
        </p>
      </section>

      <section style={{ marginTop: "18px" }} aria-label="Selected agent">
        <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>Selected Agent</h3>
        {selectedAgent === undefined ? (
          <p style={mutedTextStyle}>Click an agent in Town View.</p>
        ) : (
          <>
            <div style={dataRowStyle}>
              <strong>Name</strong>
              <span style={valueStyle}>{selectedAgent.agentName}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Role</strong>
              <span style={valueStyle}>{selectedAgent.role}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Status</strong>
              <span style={valueStyle}>{selectedAgent.status}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Location</strong>
              <span style={valueStyle}>{selectedAgent.location}</span>
            </div>
          </>
        )}
      </section>

      <section style={{ marginTop: "18px" }} aria-label="Selected event">
        <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>Selected Event</h3>
        {selectedEvent === undefined ? (
          <p style={mutedTextStyle}>Click a bubble or timeline event.</p>
        ) : (
          <>
            <div style={dataRowStyle}>
              <strong>ID</strong>
              <span style={valueStyle}>{selectedEvent.id}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Sequence</strong>
              <span style={valueStyle}>{selectedEvent.sequence}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Timestamp</strong>
              <span style={valueStyle}>{selectedEvent.timestamp}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Run ID</strong>
              <span style={valueStyle}>{selectedEvent.runId}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Task ID</strong>
              <span style={valueStyle}>{selectedEvent.taskId}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Agent</strong>
              <span style={valueStyle}>
                {selectedEvent.agentName} ({selectedEvent.agentId})
              </span>
            </div>
            <div style={dataRowStyle}>
              <strong>Role</strong>
              <span style={valueStyle}>{selectedEvent.agentRole}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Type</strong>
              <span style={valueStyle}>{selectedEvent.type}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Status</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.status)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Summary</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.summary)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Content</strong>
              <span style={valueStyle}>{selectedEvent.content}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Target</strong>
              <span style={valueStyle}>
                agent={formatValue(selectedEvent.targetAgentId)}; task=
                {formatValue(selectedEvent.targetTaskId)}
              </span>
            </div>
            <div style={dataRowStyle}>
              <strong>Tool</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.toolName)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Tool input</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.toolInput)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Tool output</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.toolOutputSummary)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Artifacts</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.artifactIds)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>File path</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.filePath)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Metrics</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.metrics)}</span>
            </div>
            <div style={dataRowStyle}>
              <strong>Metadata</strong>
              <span style={valueStyle}>{formatValue(selectedEvent.metadata)}</span>
            </div>
            <pre style={preStyle}>{JSON.stringify(selectedEvent, null, 2)}</pre>
          </>
        )}
      </section>
    </>
  );
}
