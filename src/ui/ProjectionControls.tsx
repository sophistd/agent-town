import { AGENT_EVENT_TYPES } from "../events/constants";
import type { AgentEvent, AgentEventType, AgentState } from "../events/types";
import {
  DEFAULT_TOWN_PROJECTION_SETTINGS,
  MAX_TOWN_ZOOM,
  MIN_TOWN_ZOOM,
  clampTownZoom,
  type ProjectionDensity,
  type TownProjectionSettings,
} from "../game/projectionSettings";
import { selectAgent } from "../state/selectionStore";
import {
  countEnabledEventTypes,
  createEventTypeFilters,
  setEventTypeFilter,
  type EventTypeFilterMap,
} from "./projectionFilters";

const densityOptions: Array<{ label: string; value: ProjectionDensity }> = [
  { label: "Compact", value: "compact" },
  { label: "Balanced", value: "balanced" },
  { label: "Expanded", value: "expanded" },
];

type ProjectionControlsProps = {
  settings: TownProjectionSettings;
  onChange: (settings: TownProjectionSettings) => void;
};

type AgentFocusPanelProps = {
  agents: readonly AgentState[];
  selectedAgentId?: string;
};

type EventFilterPanelProps = {
  events: readonly AgentEvent[];
  filters: EventTypeFilterMap;
  onChange: (filters: EventTypeFilterMap) => void;
};

function updateSetting(
  settings: TownProjectionSettings,
  patch: Partial<TownProjectionSettings>,
): TownProjectionSettings {
  return {
    ...settings,
    ...patch,
  };
}

function eventTypeLabel(eventType: AgentEventType): string {
  return eventType.replace("_", " ");
}

function countEventsOfType(events: readonly AgentEvent[], eventType: AgentEventType): number {
  return events.filter((event) => event.type === eventType).length;
}

export function ProjectionControls({ settings, onChange }: ProjectionControlsProps) {
  return (
    <section className="control-section" aria-label="Projection controls">
      <div>
        <h2 className="section-kicker">Projection controls</h2>
        <p className="section-subtle">Tune how WorldState becomes the town view.</p>
      </div>

      <div className="control-label">
        <span>Layout density</span>
      </div>
      <div className="segmented" role="group" aria-label="Layout density">
        {densityOptions.map((option) => (
          <button
            key={option.value}
            className="segment-button"
            type="button"
            aria-pressed={settings.density === option.value}
            onClick={() => onChange(updateSetting(settings, { density: option.value }))}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="control-label" htmlFor="town-zoom">
        <span>Town zoom</span>
        <strong>{Math.round(settings.townZoom * 100)}%</strong>
      </label>
      <div className="range-row">
        <button
          className="compact-button"
          type="button"
          onClick={() =>
            onChange(updateSetting(settings, { townZoom: clampTownZoom(settings.townZoom - 0.05) }))
          }
          aria-label="Zoom out"
        >
          -
        </button>
        <input
          id="town-zoom"
          type="range"
          min={MIN_TOWN_ZOOM}
          max={MAX_TOWN_ZOOM}
          step={0.05}
          value={settings.townZoom}
          onChange={(event) =>
            onChange(
              updateSetting(settings, {
                townZoom: clampTownZoom(Number(event.currentTarget.value)),
              }),
            )
          }
        />
        <button
          className="compact-button"
          type="button"
          onClick={() =>
            onChange(updateSetting(settings, { townZoom: clampTownZoom(settings.townZoom + 0.05) }))
          }
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      <div className="toggle-row">
        <span className="section-subtle">Show bubbles</span>
        <button
          className="toggle-button"
          type="button"
          aria-label="Toggle event bubbles"
          aria-pressed={settings.showBubbles}
          onClick={() => onChange(updateSetting(settings, { showBubbles: !settings.showBubbles }))}
        />
      </div>

      <div className="toggle-row">
        <span className="section-subtle">Show handoff edges</span>
        <button
          className="toggle-button"
          type="button"
          aria-label="Toggle handoff edges"
          aria-pressed={settings.showEdges}
          onClick={() => onChange(updateSetting(settings, { showEdges: !settings.showEdges }))}
        />
      </div>

      <button
        className="button-reset"
        type="button"
        onClick={() => onChange(DEFAULT_TOWN_PROJECTION_SETTINGS)}
      >
        Reset projection
      </button>
    </section>
  );
}

export function AgentFocusPanel({ agents, selectedAgentId }: AgentFocusPanelProps) {
  return (
    <section className="control-section" aria-label="Agent focus">
      <div>
        <h2 className="section-kicker">Agent focus</h2>
        <p className="section-subtle">{agents.length} agents reconstructed from replay.</p>
      </div>

      <ul className="agent-list">
        {agents.map((agent) => (
          <li key={agent.agentId}>
            <button
              className="agent-row"
              type="button"
              aria-pressed={agent.agentId === selectedAgentId}
              onClick={() => selectAgent(agent.agentId)}
            >
              <strong>
                <span className={`status-dot status-dot--${agent.status}`} />
                {agent.agentName}
              </strong>
              <span>
                {agent.role} / {agent.status} / {agent.location}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EventFilterPanel({ events, filters, onChange }: EventFilterPanelProps) {
  const enabledCount = countEnabledEventTypes(filters);

  return (
    <section className="control-section" aria-label="Event filters">
      <div>
        <h2 className="section-kicker">Event filters</h2>
        <p className="section-subtle">
          {enabledCount} / {AGENT_EVENT_TYPES.length} types visible in Timeline.
        </p>
      </div>

      <ul className="filter-list">
        {AGENT_EVENT_TYPES.map((eventType) => (
          <li key={eventType}>
            <button
              className="filter-row"
              type="button"
              aria-pressed={filters[eventType]}
              onClick={() =>
                onChange(setEventTypeFilter(filters, eventType, !filters[eventType]))
              }
            >
              <strong>{eventTypeLabel(eventType)}</strong>
              <span>{countEventsOfType(events, eventType)} events</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="segmented" role="group" aria-label="Bulk event filter controls">
        <button
          className="segment-button"
          type="button"
          onClick={() => onChange(createEventTypeFilters(true))}
        >
          All
        </button>
        <button
          className="segment-button"
          type="button"
          onClick={() => onChange(createEventTypeFilters(false))}
        >
          None
        </button>
        <button
          className="segment-button"
          type="button"
          onClick={() =>
            onChange({
              ...createEventTypeFilters(false),
              blocked: true,
              error: true,
              done: true,
              handoff: true,
            })
          }
        >
          Critical
        </button>
      </div>
    </section>
  );
}
