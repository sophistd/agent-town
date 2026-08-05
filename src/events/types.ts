export type AgentEventType =
  | "thinking"
  | "message"
  | "tool_call"
  | "handoff"
  | "memory_read"
  | "memory_write"
  | "decision"
  | "blocked"
  | "error"
  | "done";

export type AgentRole =
  | "planner"
  | "researcher"
  | "coder"
  | "reviewer"
  | "memory"
  | "critic"
  | "orchestrator"
  | "custom";

export type AgentLocation =
  | "town_hall"
  | "library"
  | "workshop"
  | "archive"
  | "review_room"
  | "dispatch_board"
  | "square"
  | "unknown";

export type AgentEventStatus =
  | "pending"
  | "running"
  | "waiting"
  | "blocked"
  | "failed"
  | "done";

export type AgentStateStatus =
  | "idle"
  | "thinking"
  | "walking"
  | "talking"
  | "working"
  | "waiting"
  | "blocked"
  | "error"
  | "done";

export type BubbleKind = "thought" | "message" | "tool" | "error" | "done";

export type ProjectionEdgeKind =
  | "message"
  | "handoff"
  | "review"
  | "dependency";

export type RelationshipKind = "declared" | "message" | "handoff" | "diffusion";

export type AgentEventSource =
  | "intervention"
  | "memory"
  | "llm"
  | "mock"
  | "jsonl"
  | "websocket"
  | "langfuse"
  | "opentelemetry"
  | "claude_code"
  | "codex"
  | "cursor"
  | "custom";

export type AgentEventMetrics = {
  latencyMs?: number;
  tokenInput?: number;
  tokenOutput?: number;
  costUsd?: number;
};

export type AgentEventMetadata = {
  source?: AgentEventSource;
  rawEventId?: string;
  traceId?: string;
  spanId?: string;
  confidence?: number;
  tags?: string[];
  [key: string]: unknown;
};

export type AgentEvent = {
  id: string;
  runId: string;
  taskId: string;
  parentEventId?: string;
  timestamp: string;
  sequence: number;

  agentId: string;
  agentName: string;
  agentRole: AgentRole;

  type: AgentEventType;
  content: string;
  summary?: string;

  targetAgentId?: string;
  targetTaskId?: string;

  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;

  artifactIds?: string[];
  filePath?: string;

  locationHint?: AgentLocation;
  status?: AgentEventStatus;

  metrics?: AgentEventMetrics;
  metadata?: AgentEventMetadata;
};

export type AgentBubble = {
  kind: BubbleKind;
  text: string;
  eventId: string;
};

export type AgentState = {
  agentId: string;
  agentName: string;
  role: AgentRole;
  status: AgentStateStatus;
  location: AgentLocation;
  subLocationId?: string;
  activity?: string;
  previousX?: number;
  previousY?: number;
  x: number;
  y: number;
  currentTaskId?: string;
  activeEventId?: string;
  bubble?: AgentBubble;
};

export type ProjectionEdge = {
  fromAgentId: string;
  toAgentId: string;
  eventId: string;
  kind: ProjectionEdgeKind;
};

export type RelationshipState = {
  relationshipId: string;
  agentIds: [string, string];
  strength: number;
  interactionCount: number;
  messageCount: number;
  handoffCount: number;
  declaredCount: number;
  diffusionCount: number;
  lastEventId: string;
  lastInteractionKind: RelationshipKind;
  lastSequence: number;
  evidenceEventIds: string[];
  tags: string[];
};

export type RunSummary = {
  totalEvents: number;
  handoffCount: number;
  toolCallCount: number;
  memoryActionCount: number;
  blockedCount: number;
  errorCount: number;
};

export type EventWarning = {
  eventId?: string;
  sequence?: number;
  code: string;
  message: string;
};

export type EventValidationIssue = {
  path: string;
  message: string;
};

export type QuarantinedEvent = {
  input: unknown;
  issues: EventValidationIssue[];
};

export type WorldState = {
  runId: string;
  cursor: number;
  currentEventId?: string;
  selectedEventId?: string;
  selectedAgentId?: string;
  agents: Record<string, AgentState>;
  visibleBubbles: Record<string, AgentBubble>;
  edges: ProjectionEdge[];
  relationships: Record<string, RelationshipState>;
  runSummary: RunSummary;
  warnings: EventWarning[];
  quarantinedEvents: QuarantinedEvent[];
};
