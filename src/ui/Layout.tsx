import type { ReactNode } from "react";

type LayoutProps = {
  headerMetrics: ReactNode;
  sidebar: ReactNode;
  town: ReactNode;
  detail: ReactNode;
  timeline: ReactNode;
};

export function Layout({ detail, headerMetrics, sidebar, timeline, town }: LayoutProps) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-mark" aria-hidden="true">
            AT
          </span>
          <div>
            <h1 className="app-title">Agent Town</h1>
            <p className="app-subtitle">AgentEvent-driven runtime projection</p>
          </div>
        </div>
        <div className="header-metrics">{headerMetrics}</div>
      </header>

      <div className="app-main-grid">
        <section className="app-panel app-panel--padded" aria-label="Session and agents">
          {sidebar}
        </section>
        <section className="app-panel app-panel--town" aria-label="Town projection">
          {town}
        </section>
        <section className="app-panel app-panel--padded" aria-label="Event detail">
          {detail}
        </section>
      </div>

      <section className="app-timeline" aria-label="Timeline">
        {timeline}
      </section>
    </main>
  );
}
