import { useState, type CSSProperties } from "react";

import type { AdapterQuarantinedEvent, AdapterWarning } from "../adapters/types";

export type ImportSourceKind =
  | "cognitive"
  | "jsonl"
  | "mock"
  | "smallville"
  | "social"
  | "websocket";
export type ImportStatusLevel = "error" | "idle" | "ok" | "warning";

export type ImportPanelStatus = {
  level: ImportStatusLevel;
  message: string;
};

type ImportPanelProps = {
  activeSource: ImportSourceKind;
  eventCount: number;
  initialJsonlInput: string;
  onConnectWebSocket: (url: string) => void;
  onDisconnectWebSocket: () => void;
  onImportJsonl: (input: string) => void;
  onLoadCognitiveRun: () => void;
  onLoadMock: () => void;
  onLoadSocialRun: () => void;
  onLoadSmallvilleDay: () => void;
  onLoadWebSocketSample: () => void;
  quarantinedEvents: readonly AdapterQuarantinedEvent[];
  status: ImportPanelStatus;
  warnings: readonly AdapterWarning[];
  webSocketUrl: string;
};

const sectionStyle = {
  display: "grid",
  gap: "10px",
  marginTop: 0,
  paddingTop: 0,
} satisfies CSSProperties;

const titleStyle = {
  margin: 0,
  color: "#dce8df",
  fontSize: "12px",
  fontWeight: 800,
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;

const mutedTextStyle = {
  margin: 0,
  color: "#95aaa0",
  fontSize: "12px",
  lineHeight: 1.4,
} satisfies CSSProperties;

const sourceGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "6px",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: "32px",
  borderStyle: "solid",
  borderWidth: "1px",
  borderColor: "rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  background: "#162427",
  color: "#d9e4de",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
} satisfies CSSProperties;

const activeButtonStyle = {
  ...buttonStyle,
  borderColor: "rgba(117, 201, 164, 0.72)",
  background: "#18352c",
  color: "#ecfff4",
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  borderStyle: "solid",
  borderWidth: "1px",
  borderColor: "rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  background: "#0f181b",
  color: "#d9e4de",
  font: "inherit",
  fontSize: "12px",
  padding: "8px",
} satisfies CSSProperties;

const textareaStyle = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  lineHeight: 1.4,
} satisfies CSSProperties;

const actionRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px",
} satisfies CSSProperties;

const statusStyleByLevel: Record<ImportStatusLevel, CSSProperties> = {
  error: {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "rgba(255, 141, 120, 0.52)",
    background: "#321c1a",
    color: "#ffb5a6",
  },
  idle: {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "rgba(143, 170, 157, 0.24)",
    background: "#101a1d",
    color: "#95aaa0",
  },
  ok: {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "rgba(117, 201, 164, 0.54)",
    background: "#163027",
    color: "#9ae6b5",
  },
  warning: {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "rgba(240, 195, 90, 0.54)",
    background: "#332915",
    color: "#f0d585",
  },
};

function statusBoxStyle(level: ImportStatusLevel): CSSProperties {
  return {
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    lineHeight: 1.4,
    ...statusStyleByLevel[level],
  };
}

function buttonStyleFor(source: ImportSourceKind, activeSource: ImportSourceKind): CSSProperties {
  return source === activeSource ? activeButtonStyle : buttonStyle;
}

export function ImportPanel({
  activeSource,
  eventCount,
  initialJsonlInput,
  onConnectWebSocket,
  onDisconnectWebSocket,
  onImportJsonl,
  onLoadCognitiveRun,
  onLoadMock,
  onLoadSocialRun,
  onLoadSmallvilleDay,
  onLoadWebSocketSample,
  quarantinedEvents,
  status,
  warnings,
  webSocketUrl,
}: ImportPanelProps) {
  const [jsonlInput, setJsonlInput] = useState(initialJsonlInput);
  const [urlInput, setUrlInput] = useState(webSocketUrl);

  return (
    <section style={sectionStyle} aria-label="Import source">
      <div>
        <h2 style={titleStyle}>Import Source</h2>
        <p style={mutedTextStyle}>
          {activeSource} · {eventCount} events
        </p>
      </div>

      <div style={sourceGridStyle} aria-label="Source switcher">
        <button
          type="button"
          style={buttonStyleFor("mock", activeSource)}
          onClick={onLoadMock}
          aria-pressed={activeSource === "mock"}
        >
          Mock
        </button>
        <button
          type="button"
          style={buttonStyleFor("jsonl", activeSource)}
          onClick={() => onImportJsonl(jsonlInput)}
          aria-pressed={activeSource === "jsonl"}
        >
          JSONL
        </button>
        <button
          type="button"
          style={buttonStyleFor("smallville", activeSource)}
          onClick={onLoadSmallvilleDay}
          aria-pressed={activeSource === "smallville"}
        >
          Town day
        </button>
        <button
          type="button"
          style={buttonStyleFor("cognitive", activeSource)}
          onClick={onLoadCognitiveRun}
          aria-pressed={activeSource === "cognitive"}
        >
          Cognitive
        </button>
        <button
          type="button"
          style={buttonStyleFor("social", activeSource)}
          onClick={onLoadSocialRun}
          aria-pressed={activeSource === "social"}
        >
          Social day
        </button>
        <button
          type="button"
          style={buttonStyleFor("websocket", activeSource)}
          onClick={onLoadWebSocketSample}
          aria-pressed={activeSource === "websocket"}
        >
          WS sample
        </button>
      </div>

      <textarea
        style={textareaStyle}
        value={jsonlInput}
        onChange={(event) => setJsonlInput(event.currentTarget.value)}
        aria-label="JSONL import input"
        spellCheck={false}
      />

      <div style={actionRowStyle}>
        <input
          style={inputStyle}
          value={urlInput}
          onChange={(event) => setUrlInput(event.currentTarget.value)}
          aria-label="WebSocket URL"
        />
        <button
          type="button"
          style={buttonStyle}
          onClick={() => onConnectWebSocket(urlInput)}
        >
          Connect
        </button>
      </div>

      <button type="button" style={buttonStyle} onClick={onDisconnectWebSocket}>
        Disconnect
      </button>

      <div style={statusBoxStyle(status.level)} role={status.level === "error" ? "alert" : "status"}>
        <strong>{status.message}</strong>
        <br />
        warnings={warnings.length}; quarantined={quarantinedEvents.length}
      </div>

      {quarantinedEvents.length > 0 ? (
        <p style={mutedTextStyle}>
          Latest quarantine: {quarantinedEvents[0]?.code} ·{" "}
          {quarantinedEvents[0]?.issues[0]?.message ?? "unknown issue"}
        </p>
      ) : null}
    </section>
  );
}
