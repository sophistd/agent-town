import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { parseNativeJsonl } from "../adapters/jsonlAdapter";
import type { AdapterQuarantinedEvent, AdapterResult, AdapterWarning } from "../adapters/types";
import {
  connectWebSocketIngest,
  parseWebSocketMessages,
  type WebSocketIngestConnection,
} from "../adapters/websocketAdapter";
import { parseNaturalLanguageIntervention } from "../adapters/interventionAdapter";
import {
  mockSmallvilleCognitiveRun,
  mockSmallvilleSocialRun,
} from "../events/generativeRuntime";
import { mockFailureRun } from "../events/mockFailureRun";
import { mockEvents } from "../events/mockEvents";
import { mockSmallvilleDayRun } from "../events/mockSmallvilleDayRun";
import { replay } from "../events/reducer";
import { selectCurrentEvent } from "../events/selectors";
import type { AgentEvent } from "../events/types";
import { DEFAULT_TOWN_PROJECTION_SETTINGS } from "../game/projectionSettings";
import { advancePlayback, setPlaybackCursor, usePlayback } from "../state/playbackStore";
import { selectAgent, selectEvent, useSelection } from "../state/selectionStore";
import { DetailPanel } from "./DetailPanel";
import { ImportPanel, type ImportPanelStatus, type ImportSourceKind } from "./ImportPanel";
import { Layout } from "./Layout";
import {
  AgentFocusPanel,
  EventFilterPanel,
  ProjectionControls,
} from "./ProjectionControls";
import { RunSummary } from "./RunSummary";
import { Timeline } from "./Timeline";
import { TownCanvas } from "./TownCanvas";
import {
  DEFAULT_EVENT_TYPE_FILTERS,
  matchesEventTypeFilter,
  type EventTypeFilterMap,
} from "./projectionFilters";

const DEFAULT_WEBSOCKET_URL = "ws://localhost:8765/events";

const jsonlSampleEvents = mockEvents.slice(0, 3).map((event) => ({
  ...event,
  id: `jsonl-ui-${event.sequence}`,
  runId: "run-jsonl-ui-sample",
  metadata: {
    ...event.metadata,
    rawEventId: event.id,
    source: "jsonl",
    tags: [...(event.metadata?.tags ?? []), "ui-jsonl-sample"],
  },
})) satisfies AgentEvent[];

const INITIAL_JSONL_INPUT = jsonlSampleEvents.map((event) => JSON.stringify(event)).join("\n");

const INITIAL_INTERVENTION_PROMPT =
  "Move the Valentine's gathering to the library reading nook and ask Mei to preserve the memory.";

const websocketSampleMessages = [
  JSON.stringify({
    ...mockEvents[0],
    id: "ws-native-000",
    runId: "run-websocket-sample",
    metadata: { rawEventId: mockEvents[0]?.id },
  }),
  JSON.stringify({
    agent: { id: "agent-coder", name: "Coder", role: "coder" },
    eventType: "tool_call",
    id: "ws-source-001",
    locationHint: "workshop",
    message: "Coder receives a WebSocket source event through the adapter.",
    metadata: { traceId: "trace-websocket-sample" },
    runId: "run-websocket-sample",
    sequence: 1,
    status: "running",
    taskId: "task-websocket-ingest",
    timestamp: "2026-07-04T13:00:01.000Z",
    tool: {
      input: { url: DEFAULT_WEBSOCKET_URL },
      name: "websocket_ingest",
      outputSummary: "Message normalized into AgentEvent.",
    },
  }),
] satisfies readonly string[];

const mockStatus = {
  level: "idle",
  message: "Mock failure run loaded.",
} satisfies ImportPanelStatus;

const smallvilleDayStatus = {
  level: "ok",
  message: "Town day run loaded.",
} satisfies ImportPanelStatus;

const cognitiveRunStatus = {
  level: "ok",
  message: "Cognitive loop run loaded.",
} satisfies ImportPanelStatus;

const socialRunStatus = {
  level: "ok",
  message: "Social diffusion run loaded.",
} satisfies ImportPanelStatus;

function HeaderMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger" | "running" | "warning";
  value: string;
}) {
  return (
    <div className="header-metric">
      <span>{label}</span>
      <strong data-tone={tone}>{value}</strong>
    </div>
  );
}

function statusLevelFor(result: AdapterResult): ImportPanelStatus["level"] {
  if (result.quarantinedEvents.length > 0) {
    return result.events.length > 0 ? "warning" : "error";
  }

  if (result.warnings.length > 0) {
    return "warning";
  }

  return "ok";
}

function mergeEvents(
  existingEvents: readonly AgentEvent[],
  incomingEvents: readonly AgentEvent[],
): AgentEvent[] {
  const seenIds = new Set(existingEvents.map((event) => event.id));
  const seenRunSequences = new Set(
    existingEvents.map((event) => `${event.runId}:${event.sequence}`),
  );
  const nextEvents = [...existingEvents];

  for (const event of incomingEvents) {
    const runSequenceKey = `${event.runId}:${event.sequence}`;

    if (seenIds.has(event.id) || seenRunSequences.has(runSequenceKey)) {
      continue;
    }

    seenIds.add(event.id);
    seenRunSequences.add(runSequenceKey);
    nextEvents.push(event);
  }

  return nextEvents.sort((left, right) => left.sequence - right.sequence);
}

export function App() {
  const playback = usePlayback();
  const selection = useSelection();
  const [activeSource, setActiveSource] = useState<ImportSourceKind>("mock");
  const [events, setEvents] = useState<readonly AgentEvent[]>(mockFailureRun);
  const [eventTypeFilters, setEventTypeFilters] = useState<EventTypeFilterMap>(
    DEFAULT_EVENT_TYPE_FILTERS,
  );
  const [importStatus, setImportStatus] = useState<ImportPanelStatus>(mockStatus);
  const [projectionSettings, setProjectionSettings] = useState(
    DEFAULT_TOWN_PROJECTION_SETTINGS,
  );
  const [warnings, setWarnings] = useState<readonly AdapterWarning[]>([]);
  const [quarantinedEvents, setQuarantinedEvents] = useState<
    readonly AdapterQuarantinedEvent[]
  >([]);
  const eventsRef = useRef<readonly AgentEvent[]>(mockFailureRun);
  const activeSourceRef = useRef<ImportSourceKind>("mock");
  const websocketConnectionRef = useRef<WebSocketIngestConnection | null>(null);
  const currentState = useMemo(() => {
    const replayState = replay(events, playback.cursor);

    return {
      ...replayState,
      selectedAgentId: selection.selectedAgentId ?? replayState.selectedAgentId,
      selectedEventId: selection.selectedEventId ?? replayState.selectedEventId,
    };
  }, [events, playback.cursor, selection.selectedAgentId, selection.selectedEventId]);
  const summaryState = useMemo(
    () => replay(events, events.length - 1),
    [events],
  );
  const currentEvent = selectCurrentEvent(currentState, events);
  const visibleEventCount = useMemo(
    () => events.filter((event) => matchesEventTypeFilter(event, eventTypeFilters)).length,
    [eventTypeFilters, events],
  );
  const agents = Object.values(currentState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );

  const commitEventSource = useCallback(
    (
      source: ImportSourceKind,
      nextEvents: readonly AgentEvent[],
      nextStatus: ImportPanelStatus,
      nextWarnings: readonly AdapterWarning[] = [],
      nextQuarantinedEvents: readonly AdapterQuarantinedEvent[] = [],
    ) => {
      eventsRef.current = nextEvents;
      activeSourceRef.current = source;
      setActiveSource(source);
      setEvents(nextEvents);
      setImportStatus(nextStatus);
      setWarnings(nextWarnings);
      setQuarantinedEvents(nextQuarantinedEvents);
      setPlaybackCursor(0, nextEvents.length);

      const firstEvent = nextEvents[0];
      if (firstEvent !== undefined) {
        selectEvent(firstEvent.id, firstEvent.agentId);
        selectAgent(firstEvent.agentId);
      }
    },
    [],
  );

  const applyAdapterResult = useCallback(
    (source: ImportSourceKind, result: AdapterResult, label: string) => {
      if (result.events.length === 0) {
        setImportStatus({
          level: "error",
          message: `${label} produced no accepted events.`,
        });
        setWarnings(result.warnings);
        setQuarantinedEvents(result.quarantinedEvents);
        return;
      }

      commitEventSource(
        source,
        result.events,
        {
          level: statusLevelFor(result),
          message: `${label}: ${result.events.length} events accepted.`,
        },
        result.warnings,
        result.quarantinedEvents,
      );
    },
    [commitEventSource],
  );

  const appendWebSocketResult = useCallback(
    (result: AdapterResult) => {
      if (result.events.length === 0) {
        setImportStatus({
          level: statusLevelFor(result),
          message: "WebSocket message produced no accepted events.",
        });
        setWarnings(result.warnings);
        setQuarantinedEvents(result.quarantinedEvents);
        return;
      }

      const baseEvents = activeSourceRef.current === "websocket" ? eventsRef.current : [];
      const nextEvents = mergeEvents(baseEvents, result.events);

      commitEventSource(
        "websocket",
        nextEvents,
        {
          level: statusLevelFor(result),
          message: `WebSocket stream: ${nextEvents.length} events accepted.`,
        },
        result.warnings,
        result.quarantinedEvents,
      );
      setPlaybackCursor(nextEvents.length - 1, nextEvents.length);

      const latestEvent = nextEvents[nextEvents.length - 1];
      if (latestEvent !== undefined) {
        selectEvent(latestEvent.id, latestEvent.agentId);
        selectAgent(latestEvent.agentId);
      }
    },
    [commitEventSource],
  );

  const disconnectWebSocket = useCallback(() => {
    websocketConnectionRef.current?.disconnect();
    websocketConnectionRef.current = null;
  }, []);

  const loadMock = useCallback(() => {
    disconnectWebSocket();
    commitEventSource("mock", mockFailureRun, mockStatus);
  }, [commitEventSource, disconnectWebSocket]);

  const loadSmallvilleDay = useCallback(() => {
    disconnectWebSocket();
    commitEventSource("smallville", mockSmallvilleDayRun, smallvilleDayStatus);
  }, [commitEventSource, disconnectWebSocket]);

  const loadCognitiveRun = useCallback(() => {
    disconnectWebSocket();
    commitEventSource("cognitive", mockSmallvilleCognitiveRun, cognitiveRunStatus);
  }, [commitEventSource, disconnectWebSocket]);

  const loadSocialRun = useCallback(() => {
    disconnectWebSocket();
    commitEventSource("social", mockSmallvilleSocialRun, socialRunStatus);
  }, [commitEventSource, disconnectWebSocket]);

  const importJsonl = useCallback(
    (input: string) => {
      disconnectWebSocket();
      applyAdapterResult("jsonl", parseNativeJsonl(input), "JSONL import");
    },
    [applyAdapterResult, disconnectWebSocket],
  );

  const importIntervention = useCallback(
    (prompt: string) => {
      disconnectWebSocket();
      applyAdapterResult(
        "intervention",
        parseNaturalLanguageIntervention({
          prompt,
          previousEvents: eventsRef.current,
        }),
        "Intervention import",
      );
    },
    [applyAdapterResult, disconnectWebSocket],
  );

  const loadWebSocketSample = useCallback(() => {
    disconnectWebSocket();
    applyAdapterResult(
      "websocket",
      parseWebSocketMessages(websocketSampleMessages),
      "WebSocket sample",
    );
  }, [applyAdapterResult, disconnectWebSocket]);

  const connectWebSocket = useCallback(
    (url: string) => {
      disconnectWebSocket();

      if (url.trim().length === 0) {
        setImportStatus({ level: "error", message: "WebSocket URL is empty." });
        return;
      }

      websocketConnectionRef.current = connectWebSocketIngest({
        onResult: appendWebSocketResult,
        onStatus: (status) => {
          setImportStatus({
            level: status.status === "error" ? "error" : status.status === "open" ? "ok" : "idle",
            message: status.message,
          });
        },
        url,
      });
    },
    [appendWebSocketResult, disconnectWebSocket],
  );

  const jumpToEvent = useCallback((event: AgentEvent) => {
    const index = events.findIndex((candidate) => candidate.id === event.id);

    if (index < 0) {
      return;
    }

    setPlaybackCursor(index, events.length);
    selectEvent(event.id, event.agentId);
    selectAgent(event.agentId);
  }, [events]);

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(
      () => advancePlayback(events.length),
      playback.intervalMs,
    );

    return () => window.clearInterval(timer);
  }, [events.length, playback.intervalMs, playback.isPlaying]);

  return (
    <Layout
      headerMetrics={
        <>
          <HeaderMetric label="Run ID" value={currentState.runId} />
          <HeaderMetric
            label="Status"
            tone={playback.isPlaying ? "running" : undefined}
            value={playback.isPlaying ? "running" : "paused"}
          />
          <HeaderMetric label="Cursor" value={`${Math.max(0, playback.cursor + 1)} / ${events.length}`} />
          <HeaderMetric label="Events" value={String(events.length)} />
          <HeaderMetric
            label="Warnings"
            tone={warnings.length > 0 ? "warning" : undefined}
            value={String(warnings.length)}
          />
          <HeaderMetric
            label="Quarantine"
            tone={quarantinedEvents.length > 0 ? "danger" : undefined}
            value={String(quarantinedEvents.length)}
          />
        </>
      }
      sidebar={
        <>
          <ImportPanel
            activeSource={activeSource}
            eventCount={events.length}
            initialInterventionPrompt={INITIAL_INTERVENTION_PROMPT}
            initialJsonlInput={INITIAL_JSONL_INPUT}
            onConnectWebSocket={connectWebSocket}
            onDisconnectWebSocket={disconnectWebSocket}
            onImportIntervention={importIntervention}
            onImportJsonl={importJsonl}
            onLoadCognitiveRun={loadCognitiveRun}
            onLoadMock={loadMock}
            onLoadSocialRun={loadSocialRun}
            onLoadSmallvilleDay={loadSmallvilleDay}
            onLoadWebSocketSample={loadWebSocketSample}
            quarantinedEvents={quarantinedEvents}
            status={importStatus}
            warnings={warnings}
            webSocketUrl={DEFAULT_WEBSOCKET_URL}
          />
          <ProjectionControls
            settings={projectionSettings}
            onChange={setProjectionSettings}
          />
          <AgentFocusPanel
            agents={agents}
            selectedAgentId={selection.selectedAgentId}
          />
          <EventFilterPanel
            events={events}
            filters={eventTypeFilters}
            onChange={setEventTypeFilters}
          />
        </>
      }
      town={
        <TownCanvas
          currentEvent={currentEvent}
          settings={projectionSettings}
          totalEventCount={events.length}
          visibleEventCount={visibleEventCount}
          worldState={currentState}
        />
      }
      detail={
        <>
          <RunSummary
            events={events}
            onJumpToEvent={jumpToEvent}
            worldState={summaryState}
          />
          <DetailPanel
            currentEvent={currentEvent}
            events={events}
            worldState={currentState}
          />
        </>
      }
      timeline={
        <Timeline
          eventTypeFilters={eventTypeFilters}
          events={events}
          playback={playback}
        />
      }
    />
  );
}
