export type InvalidEventFixture = {
  name: string;
  reason: string;
  input: unknown;
};

export const invalidEvents: InvalidEventFixture[] = [
  {
    name: "missing id",
    reason: "AgentEvent requires a stable string id.",
    input: { runId: "run-invalid", taskId: "task-invalid", sequence: 0 },
  },
  {
    name: "non numeric sequence",
    reason: "sequence must be a number for deterministic replay.",
    input: { id: "invalid-001", sequence: "1" },
  },
  {
    name: "unknown event type",
    reason: "type must be one of the canonical AgentEventType values.",
    input: { id: "invalid-002", sequence: 2, type: "sleeping" },
  },
  {
    name: "missing timestamp",
    reason: "timestamp is required for event inspection.",
    input: { id: "invalid-003", sequence: 3, type: "thinking" },
  },
  {
    name: "invalid role",
    reason: "agentRole must be a canonical AgentRole.",
    input: { id: "invalid-004", sequence: 4, agentRole: "wizard" },
  },
  {
    name: "invalid location hint",
    reason: "locationHint must be a canonical AgentLocation.",
    input: { id: "invalid-005", sequence: 5, locationHint: "moon_base" },
  },
  {
    name: "message missing target",
    reason: "message events should name a target agent when agent-to-agent.",
    input: { id: "invalid-006", sequence: 6, type: "message" },
  },
  {
    name: "tool call missing tool name",
    reason: "tool_call events must identify the invoked tool.",
    input: { id: "invalid-007", sequence: 7, type: "tool_call" },
  },
  {
    name: "negative metrics",
    reason: "latency and token counts must not be negative.",
    input: {
      id: "invalid-008",
      sequence: 8,
      type: "tool_call",
      metrics: { latencyMs: -1, tokenInput: -10 },
    },
  },
  {
    name: "non object input",
    reason: "validator should quarantine non-object values.",
    input: "not an event",
  },
  {
    name: "duplicate semantic identity",
    reason: "same runId and sequence should not appear twice in a valid stream.",
    input: [
      { id: "invalid-009a", runId: "run-invalid", sequence: 9 },
      { id: "invalid-009b", runId: "run-invalid", sequence: 9 },
    ],
  },
];
