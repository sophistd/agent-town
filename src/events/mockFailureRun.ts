import type {
  AgentEvent,
  AgentEventStatus,
  AgentEventType,
  AgentLocation,
} from "./types";

const runId = "run-failure-agent-town-001";
const taskId = "task-debug-event-ordering";
const agents = {
  planner: { agentId: "agent-planner", agentName: "Planner", agentRole: "planner" },
  researcher: {
    agentId: "agent-researcher",
    agentName: "Researcher",
    agentRole: "researcher",
  },
  coder: { agentId: "agent-coder", agentName: "Coder", agentRole: "coder" },
  reviewer: {
    agentId: "agent-reviewer",
    agentName: "Reviewer",
    agentRole: "reviewer",
  },
  memory: { agentId: "agent-memory", agentName: "Memory", agentRole: "memory" },
} as const;

type AgentKey = keyof typeof agents;

type FailureEvent = {
  sequence: number;
  agent: AgentKey;
  type: AgentEventType;
  summary: string;
  content: string;
  locationHint: AgentLocation;
  targetAgentId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  status?: AgentEventStatus;
};

function timestamp(sequence: number): string {
  return `2026-07-04T13:${String(sequence).padStart(2, "0")}:00.000Z`;
}

function makeEvent(input: FailureEvent): AgentEvent {
  const agent = agents[input.agent];

  return {
    id: `failure-${String(input.sequence).padStart(3, "0")}`,
    runId,
    taskId,
    timestamp: timestamp(input.sequence),
    sequence: input.sequence,
    ...agent,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: { source: "mock", tags: ["failure-path", "repair"] },
  };
}

export const mockFailureRun: AgentEvent[] = [
  makeEvent({ sequence: 0, agent: "planner", type: "thinking", summary: "Plan debug run", content: "Planner frames an ordering bug investigation.", locationHint: "town_hall" }),
  makeEvent({ sequence: 1, agent: "planner", type: "decision", summary: "Reproduce first", content: "Planner decides to reproduce before patching.", locationHint: "town_hall" }),
  makeEvent({ sequence: 2, agent: "planner", type: "handoff", summary: "Assign research", content: "Planner asks Researcher to inspect event-order rules.", locationHint: "dispatch_board", targetAgentId: agents.researcher.agentId }),
  makeEvent({ sequence: 3, agent: "researcher", type: "memory_read", summary: "Read schema note", content: "Researcher reads sequence and timestamp rules.", locationHint: "archive" }),
  makeEvent({ sequence: 4, agent: "researcher", type: "tool_call", summary: "Read M1 spec", content: "Researcher reads deterministic replay spec.", locationHint: "library", toolName: "read_docs", toolInput: { path: "M1 spec" }, toolOutputSummary: "Replay must use sequence order." }),
  makeEvent({ sequence: 5, agent: "researcher", type: "message", summary: "Report invariant", content: "Researcher reports sequence must dominate arrival time.", locationHint: "library", targetAgentId: agents.coder.agentId }),
  makeEvent({ sequence: 6, agent: "coder", type: "thinking", summary: "Inspect fixture", content: "Coder inspects event stream and notices duplicate sequence.", locationHint: "workshop" }),
  makeEvent({ sequence: 7, agent: "coder", type: "tool_call", summary: "Run ordering check", content: "Coder runs a local ordering check.", locationHint: "workshop", toolName: "run_command", toolInput: { command: "pnpm test -- ordering" }, toolOutputSummary: "Ordering check fails at event 12." }),
  makeEvent({ sequence: 8, agent: "coder", type: "error", summary: "Duplicate sequence", content: "Ordering check finds two events with sequence 12.", locationHint: "workshop", status: "failed" }),
  makeEvent({ sequence: 9, agent: "coder", type: "blocked", summary: "Needs source decision", content: "Coder blocks because source trace has conflicting timestamps.", locationHint: "dispatch_board", status: "blocked" }),
  makeEvent({ sequence: 10, agent: "coder", type: "message", summary: "Ask planner", content: "Coder asks Planner whether to sort by timestamp or sequence.", locationHint: "workshop", targetAgentId: agents.planner.agentId }),
  makeEvent({ sequence: 11, agent: "planner", type: "decision", summary: "Sequence wins", content: "Planner decides sequence is canonical replay order.", locationHint: "town_hall" }),
  makeEvent({ sequence: 12, agent: "planner", type: "handoff", summary: "Send repair task", content: "Planner hands repair task to Coder.", locationHint: "dispatch_board", targetAgentId: agents.coder.agentId }),
  makeEvent({ sequence: 13, agent: "coder", type: "tool_call", summary: "Patch fixture", content: "Coder renumbers conflicting event IDs and sequences.", locationHint: "workshop", toolName: "edit_file", toolInput: { path: "src/events/mockFailureRun.ts" }, toolOutputSummary: "Duplicate sequence removed." }),
  makeEvent({ sequence: 14, agent: "coder", type: "tool_call", summary: "Run ordering check again", content: "Coder reruns ordering check after repair.", locationHint: "workshop", toolName: "run_command", toolInput: { command: "pnpm test -- ordering" }, toolOutputSummary: "Ordering check passes." }),
  makeEvent({ sequence: 15, agent: "coder", type: "message", summary: "Repair ready", content: "Coder sends repair evidence to Reviewer.", locationHint: "workshop", targetAgentId: agents.reviewer.agentId }),
  makeEvent({ sequence: 16, agent: "reviewer", type: "tool_call", summary: "Review repair", content: "Reviewer checks that IDs, timestamps, and sequence are stable.", locationHint: "review_room", toolName: "review_diff", toolOutputSummary: "Stable ordering confirmed." }),
  makeEvent({ sequence: 17, agent: "reviewer", type: "blocked", summary: "Missing memory note", content: "Reviewer blocks final pass until source decision is saved.", locationHint: "review_room", status: "blocked" }),
  makeEvent({ sequence: 18, agent: "reviewer", type: "handoff", summary: "Request memory write", content: "Reviewer asks Memory to save sequence policy.", locationHint: "dispatch_board", targetAgentId: agents.memory.agentId }),
  makeEvent({ sequence: 19, agent: "memory", type: "memory_write", summary: "Save sequence policy", content: "Memory writes that sequence is replay order.", locationHint: "archive" }),
  makeEvent({ sequence: 20, agent: "memory", type: "message", summary: "Policy saved", content: "Memory confirms sequence policy is saved.", locationHint: "archive", targetAgentId: agents.reviewer.agentId }),
  makeEvent({ sequence: 21, agent: "reviewer", type: "tool_call", summary: "Run final review", content: "Reviewer validates no UI or adapter behavior was introduced.", locationHint: "review_room", toolName: "review_diff", toolOutputSummary: "Scope is clean." }),
  makeEvent({ sequence: 22, agent: "reviewer", type: "message", summary: "Approve repair", content: "Reviewer approves repaired event ordering.", locationHint: "review_room", targetAgentId: agents.planner.agentId }),
  makeEvent({ sequence: 23, agent: "researcher", type: "tool_call", summary: "Check docs", content: "Researcher verifies schema docs mention deterministic replay.", locationHint: "library", toolName: "read_file", toolInput: { path: "docs/EVENT_SCHEMA.md" }, toolOutputSummary: "Docs mention sequence-based replay." }),
  makeEvent({ sequence: 24, agent: "researcher", type: "message", summary: "Docs confirmed", content: "Researcher reports docs align with repair.", locationHint: "library", targetAgentId: agents.planner.agentId }),
  makeEvent({ sequence: 25, agent: "planner", type: "decision", summary: "Resume finalization", content: "Planner clears blocked state after repair evidence.", locationHint: "town_hall" }),
  makeEvent({ sequence: 26, agent: "coder", type: "tool_call", summary: "Capture failure evidence", content: "Coder writes failure run summary.", locationHint: "workshop", toolName: "write_file", toolInput: { path: "docs/evidence/M1/fixture-summary.md" }, toolOutputSummary: "Fixture summary updated." }),
  makeEvent({ sequence: 27, agent: "memory", type: "memory_read", summary: "Read final state", content: "Memory reads saved sequence policy for final summary.", locationHint: "archive" }),
  makeEvent({ sequence: 28, agent: "reviewer", type: "message", summary: "Ready to close", content: "Reviewer says failure path includes error, blocked, repair, and done.", locationHint: "review_room", targetAgentId: agents.planner.agentId }),
  makeEvent({ sequence: 29, agent: "planner", type: "done", summary: "Failure run repaired", content: "Planner completes the failure-path fixture story.", locationHint: "square", status: "done" }),
];
