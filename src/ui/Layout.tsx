import type { CSSProperties, ReactNode } from "react";

const shellStyle = {
  height: "100vh",
  margin: 0,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) 186px",
  overflow: "hidden",
  background: "#f7f7f4",
  color: "#202124",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "14px 16px 10px",
  borderBottom: "1px solid #d8d8d2",
  background: "#fffdfa",
} satisfies CSSProperties;

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "260px minmax(360px, 1fr) 320px",
  gap: "12px",
  minHeight: 0,
  padding: "12px",
} satisfies CSSProperties;

const panelStyle = {
  minWidth: 0,
  minHeight: 0,
  border: "1px solid #d8d8d2",
  background: "#fffdfa",
  overflow: "auto",
} satisfies CSSProperties;

const timelineStyle = {
  ...panelStyle,
  borderLeft: 0,
  borderRight: 0,
  borderBottom: 0,
  padding: "14px 16px",
} satisfies CSSProperties;

type LayoutProps = {
  sidebar: ReactNode;
  town: ReactNode;
  detail: ReactNode;
  timeline: ReactNode;
};

export function Layout({ sidebar, town, detail, timeline }: LayoutProps) {
  return (
    <main style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px" }}>Agent Town</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#62625b" }}>
            AgentEvent-driven runtime projection
          </p>
        </div>
        <span style={{ fontSize: "12px", color: "#62625b" }}>M3 replay debugger</span>
      </header>

      <div style={mainGridStyle}>
        <section style={{ ...panelStyle, padding: "16px" }} aria-label="Session and agents">
          {sidebar}
        </section>
        <section style={panelStyle} aria-label="Town projection">
          {town}
        </section>
        <section style={{ ...panelStyle, padding: "16px" }} aria-label="Event detail">
          {detail}
        </section>
      </div>

      <section style={timelineStyle} aria-label="Timeline">
        {timeline}
      </section>
    </main>
  );
}
