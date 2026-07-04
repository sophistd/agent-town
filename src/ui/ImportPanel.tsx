import { useState, type CSSProperties } from "react";

import type { AdapterQuarantinedEvent, AdapterWarning } from "../adapters/types";

export type ImportSourceKind = "jsonl" | "mock" | "websocket";
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
  onLoadMock: () => void;
  onLoadWebSocketSample: () => void;
  quarantinedEvents: readonly AdapterQuarantinedEvent[];
  status: ImportPanelStatus;
  warnings: readonly AdapterWarning[];
  webSocketUrl: string;
};

const sectionStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: "1px solid #e2e2db",
} satisfies CSSProperties;

const titleStyle = {
  margin: 0,
  fontSize: "16px",
} satisfies CSSProperties;

const mutedTextStyle = {
  margin: 0,
  color: "#62625b",
  fontSize: "12px",
  lineHeight: 1.4,
} satisfies CSSProperties;

const sourceGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "6px",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: "32px",
  border: "1px solid #cfcfc8",
  borderRadius: "6px",
  background: "#fffdfa",
  color: "#202124",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
} satisfies CSSProperties;

const activeButtonStyle = {
  ...buttonStyle,
  borderColor: "#1b6f6a",
  background: "#eaf4f2",
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #d8d8d2",
  borderRadius: "6px",
  background: "#fffdfa",
  color: "#202124",
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
    borderColor: "#c25f5f",
    background: "#fff1f1",
    color: "#7d2020",
  },
  idle: {
    borderColor: "#d8d8d2",
    background: "#f7f7f4",
    color: "#62625b",
  },
  ok: {
    borderColor: "#86aaa4",
    background: "#eef8f6",
    color: "#174f4b",
  },
  warning: {
    borderColor: "#d0ae64",
    background: "#fff8e7",
    color: "#765315",
  },
};

function statusBoxStyle(level: ImportStatusLevel): CSSProperties {
  return {
    border: "1px solid",
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
  onLoadMock,
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
