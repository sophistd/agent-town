import type { AgentEvent, AgentEventType, AgentLocation, AgentRole } from "./types";

const runId = "run-stress-agent-town-001";
const taskId = "task-stress-replay";

const agentCycle: Array<{
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
}> = [
  { agentId: "agent-planner", agentName: "Planner", agentRole: "planner" },
  { agentId: "agent-researcher", agentName: "Researcher", agentRole: "researcher" },
  { agentId: "agent-coder", agentName: "Coder", agentRole: "coder" },
  { agentId: "agent-reviewer", agentName: "Reviewer", agentRole: "reviewer" },
  { agentId: "agent-memory", agentName: "Memory", agentRole: "memory" },
];

const typeCycle: AgentEventType[] = [
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
];

const locationCycle: AgentLocation[] = [
  "town_hall",
  "library",
  "workshop",
  "archive",
  "review_room",
  "dispatch_board",
  "square",
];

function timestamp(sequence: number): string {
  const minute = Math.floor(sequence / 60);
  const second = sequence % 60;
  return `2026-07-04T14:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.000Z`;
}

export const mockStressRun: AgentEvent[] = Array.from({ length: 200 }, (_, sequence) => {
  const agent = agentCycle[sequence % agentCycle.length];
  const type = typeCycle[sequence % typeCycle.length];
  const targetAgent = agentCycle[(sequence + 1) % agentCycle.length];

  return {
    id: `stress-${String(sequence).padStart(3, "0")}`,
    runId,
    taskId,
    timestamp: timestamp(sequence),
    sequence,
    ...agent,
    type,
    content: `Stress event ${sequence} records ${type} from ${agent.agentName}.`,
    summary: `Stress ${sequence}: ${type}`,
    targetAgentId:
      type === "message" || type === "handoff" ? targetAgent.agentId : undefined,
    toolName: type === "tool_call" ? "stress_tool" : undefined,
    toolInput: type === "tool_call" ? { sequence } : undefined,
    toolOutputSummary:
      type === "tool_call" ? `Stress tool completed ${sequence}.` : undefined,
    artifactIds: type === "done" ? [`artifact-stress-${sequence}`] : undefined,
    locationHint: locationCycle[sequence % locationCycle.length],
    status:
      type === "blocked"
        ? "blocked"
        : type === "error"
          ? "failed"
          : type === "done"
            ? "done"
            : "running",
    metrics: {
      latencyMs: 20 + sequence,
      tokenInput: 100 + sequence,
      tokenOutput: 50 + (sequence % 25),
      costUsd: Number((0.001 + sequence * 0.0001).toFixed(4)),
    },
    metadata: { source: "mock", tags: ["stress", "deterministic"] },
  };
});
