import type {
  AgentEvent,
  AgentEventStatus,
  AgentEventType,
  AgentLocation,
} from "./types";

const runId = "run-happy-agent-town-001";
const taskId = "task-agent-town-prototype";
const baseTimestamp = "2026-07-04T12:";

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

type FixtureEvent = {
  sequence: number;
  agent: AgentKey;
  type: AgentEventType;
  content: string;
  summary: string;
  locationHint: AgentLocation;
  targetAgentId?: string;
  targetTaskId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  artifactIds?: string[];
  filePath?: string;
  status?: AgentEventStatus;
};

function timestamp(sequence: number): string {
  return `${baseTimestamp}${String(sequence).padStart(2, "0")}:00.000Z`;
}

function makeEvent(input: FixtureEvent): AgentEvent {
  const agent = agents[input.agent];

  return {
    id: `happy-${String(input.sequence).padStart(3, "0")}`,
    runId,
    taskId,
    timestamp: timestamp(input.sequence),
    sequence: input.sequence,
    ...agent,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    targetTaskId: input.targetTaskId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    artifactIds: input.artifactIds,
    filePath: input.filePath,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: { source: "mock", tags: ["happy-path", "mvp"] },
  };
}

export const mockEvents: AgentEvent[] = [
  makeEvent({
    sequence: 0,
    agent: "planner",
    type: "thinking",
    summary: "Break down prototype task",
    content: "Planner identifies product, event, projection, and evidence work.",
    locationHint: "town_hall",
  }),
  makeEvent({
    sequence: 1,
    agent: "planner",
    type: "decision",
    summary: "Use event-first plan",
    content: "Planner chooses AgentEvent before visuals.",
    locationHint: "town_hall",
  }),
  makeEvent({
    sequence: 2,
    agent: "planner",
    type: "handoff",
    summary: "Assign research",
    content: "Planner hands runtime-observability research to Researcher.",
    locationHint: "dispatch_board",
    targetAgentId: agents.researcher.agentId,
    targetTaskId: "task-research-runtime-ui",
  }),
  makeEvent({
    sequence: 3,
    agent: "researcher",
    type: "memory_read",
    summary: "Read prior product notes",
    content: "Researcher reads event-first Agent Town notes from memory.",
    locationHint: "archive",
  }),
  makeEvent({
    sequence: 4,
    agent: "researcher",
    type: "tool_call",
    summary: "Search Phaser docs",
    content: "Researcher calls search_docs for Phaser lifecycle guidance.",
    locationHint: "library",
    toolName: "search_docs",
    toolInput: { query: "Phaser React lifecycle canvas boundary" },
    toolOutputSummary: "Use React wrapper and destroy Phaser instance on unmount.",
  }),
  makeEvent({
    sequence: 5,
    agent: "researcher",
    type: "message",
    summary: "Share lifecycle constraint",
    content: "Researcher tells Coder to keep Phaser as projection only.",
    locationHint: "library",
    targetAgentId: agents.coder.agentId,
  }),
  makeEvent({
    sequence: 6,
    agent: "coder",
    type: "thinking",
    summary: "Plan scaffold",
    content: "Coder plans src/events, src/game, src/ui, src/state, src/adapters.",
    locationHint: "workshop",
  }),
  makeEvent({
    sequence: 7,
    agent: "coder",
    type: "tool_call",
    summary: "Create project files",
    content: "Coder creates Vite, TypeScript, and Vitest scaffold.",
    locationHint: "workshop",
    toolName: "edit_file",
    toolInput: { files: ["package.json", "src/main.tsx", "src/ui/App.tsx"] },
    toolOutputSummary: "Scaffold files created.",
    artifactIds: ["artifact-scaffold"],
  }),
  makeEvent({
    sequence: 8,
    agent: "coder",
    type: "tool_call",
    summary: "Run checks",
    content: "Coder runs typecheck, test, and build.",
    locationHint: "workshop",
    toolName: "run_command",
    toolInput: { command: "pnpm typecheck && pnpm test && pnpm build" },
    toolOutputSummary: "Baseline commands pass.",
  }),
  makeEvent({
    sequence: 9,
    agent: "coder",
    type: "handoff",
    summary: "Send scaffold for review",
    content: "Coder hands scaffold evidence to Reviewer.",
    locationHint: "dispatch_board",
    targetAgentId: agents.reviewer.agentId,
  }),
  makeEvent({
    sequence: 10,
    agent: "reviewer",
    type: "tool_call",
    summary: "Review boundaries",
    content: "Reviewer checks that event layer has no renderer dependency.",
    locationHint: "review_room",
    toolName: "review_diff",
    toolInput: { paths: ["src/events", "src/game", "src/ui"] },
    toolOutputSummary: "Boundary clean; fixture coverage still missing.",
  }),
  makeEvent({
    sequence: 11,
    agent: "reviewer",
    type: "blocked",
    summary: "Needs fixture story",
    content: "Reviewer blocks completion until fixture story is represented.",
    locationHint: "review_room",
    status: "blocked",
  }),
  makeEvent({
    sequence: 12,
    agent: "coder",
    type: "message",
    summary: "Acknowledge blocker",
    content: "Coder accepts fixture-story blocker and asks Planner for scope.",
    locationHint: "workshop",
    targetAgentId: agents.planner.agentId,
  }),
  makeEvent({
    sequence: 13,
    agent: "planner",
    type: "decision",
    summary: "Fixture is next session",
    content: "Planner keeps fixture implementation in S05, not scaffold.",
    locationHint: "town_hall",
  }),
  makeEvent({
    sequence: 14,
    agent: "planner",
    type: "handoff",
    summary: "Assign memory note",
    content: "Planner asks Memory to record architecture boundary.",
    locationHint: "dispatch_board",
    targetAgentId: agents.memory.agentId,
  }),
  makeEvent({
    sequence: 15,
    agent: "memory",
    type: "memory_write",
    summary: "Record boundary",
    content: "Memory writes AgentEvent source-of-truth rule to project memory.",
    locationHint: "archive",
    artifactIds: ["artifact-boundary-note"],
  }),
  makeEvent({
    sequence: 16,
    agent: "memory",
    type: "message",
    summary: "Boundary note saved",
    content: "Memory reports that architecture boundary was recorded.",
    locationHint: "archive",
    targetAgentId: agents.planner.agentId,
  }),
  makeEvent({
    sequence: 17,
    agent: "researcher",
    type: "tool_call",
    summary: "Check Tiled timing",
    content: "Researcher confirms Tiled map can wait until product polish.",
    locationHint: "library",
    toolName: "read_docs",
    toolInput: { topic: "Tiled map defer decision" },
    toolOutputSummary: "Tiled is deferred until M5.",
  }),
  makeEvent({
    sequence: 18,
    agent: "reviewer",
    type: "message",
    summary: "Approve scaffold scope",
    content: "Reviewer confirms blocker is tracked as next-session work.",
    locationHint: "review_room",
    targetAgentId: agents.planner.agentId,
  }),
  makeEvent({
    sequence: 19,
    agent: "planner",
    type: "decision",
    summary: "Close scaffold session",
    content: "Planner marks scaffold ready and routes next issue to fixtures.",
    locationHint: "town_hall",
  }),
  makeEvent({
    sequence: 20,
    agent: "coder",
    type: "tool_call",
    summary: "Capture evidence",
    content: "Coder records command output and file tree evidence.",
    locationHint: "workshop",
    toolName: "write_file",
    toolInput: { path: "docs/evidence/M1/test-output.md" },
    toolOutputSummary: "Evidence note recorded.",
    filePath: "docs/evidence/M1/test-output.md",
  }),
  makeEvent({
    sequence: 21,
    agent: "reviewer",
    type: "tool_call",
    summary: "Final review pass",
    content: "Reviewer validates that no adapter or renderer scope leaked in.",
    locationHint: "review_room",
    toolName: "review_diff",
    toolOutputSummary: "No scope leak found.",
  }),
  makeEvent({
    sequence: 22,
    agent: "memory",
    type: "memory_read",
    summary: "Confirm invariant",
    content: "Memory reads source-of-truth rule before final summary.",
    locationHint: "archive",
  }),
  makeEvent({
    sequence: 23,
    agent: "planner",
    type: "message",
    summary: "Prepare handoff",
    content: "Planner tells team S05 will add deterministic fixtures.",
    locationHint: "square",
    targetAgentId: agents.researcher.agentId,
  }),
  makeEvent({
    sequence: 24,
    agent: "planner",
    type: "done",
    summary: "Happy path complete",
    content: "Planner completes the scaffold run and identifies next issue.",
    locationHint: "square",
    status: "done",
  }),
];
