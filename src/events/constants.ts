import type {
  AgentEventSource,
  AgentEventStatus,
  AgentEventType,
  AgentLocation,
  AgentRole,
  AgentStateStatus,
  BubbleKind,
  ProjectionEdgeKind,
} from "./types";

export const AGENT_EVENT_TYPES = [
  "thinking",
  "message",
  "tool_call",
  "handoff",
  "memory_read",
  "memory_write",
  "decision",
  "blocked",
  "error",
  "done",
] as const satisfies readonly AgentEventType[];

export const AGENT_ROLES = [
  "planner",
  "researcher",
  "coder",
  "reviewer",
  "memory",
  "critic",
  "orchestrator",
  "custom",
] as const satisfies readonly AgentRole[];

export const AGENT_LOCATIONS = [
  "town_hall",
  "library",
  "workshop",
  "archive",
  "review_room",
  "dispatch_board",
  "square",
  "unknown",
] as const satisfies readonly AgentLocation[];

export const AGENT_EVENT_STATUSES = [
  "pending",
  "running",
  "waiting",
  "blocked",
  "failed",
  "done",
] as const satisfies readonly AgentEventStatus[];

export const AGENT_STATE_STATUSES = [
  "idle",
  "thinking",
  "walking",
  "talking",
  "working",
  "waiting",
  "blocked",
  "error",
  "done",
] as const satisfies readonly AgentStateStatus[];

export const BUBBLE_KINDS = [
  "thought",
  "message",
  "tool",
  "error",
  "done",
] as const satisfies readonly BubbleKind[];

export const PROJECTION_EDGE_KINDS = [
  "message",
  "handoff",
  "review",
  "dependency",
] as const satisfies readonly ProjectionEdgeKind[];

export const AGENT_EVENT_SOURCES = [
  "intervention",
  "memory",
  "llm",
  "mock",
  "jsonl",
  "websocket",
  "langfuse",
  "opentelemetry",
  "claude_code",
  "codex",
  "cursor",
  "custom",
] as const satisfies readonly AgentEventSource[];

export const DEFAULT_RUN_SUMMARY = {
  totalEvents: 0,
  handoffCount: 0,
  toolCallCount: 0,
  memoryActionCount: 0,
  blockedCount: 0,
  errorCount: 0,
} as const;
