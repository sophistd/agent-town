import type {
  AgentEvent,
  AgentEventStatus,
  AgentEventType,
  AgentLocation,
  AgentRole,
} from "./types";

export type CognitiveStage =
  | "observation"
  | "retrieval"
  | "reflection"
  | "planning"
  | "action"
  | "conversation"
  | "closure";

export type MemoryKind = "observation" | "reflection" | "plan";

export type MemoryRecord = {
  id: string;
  agentId: string;
  content: string;
  createdAtSequence: number;
  importance: number;
  kind: MemoryKind;
  lastAccessedSequence: number;
  tags: string[];
};

export type RetrievedMemory = {
  memoryId: string;
  content: string;
  importance: number;
  importanceScore: number;
  recencyScore: number;
  relevanceScore: number;
  score: number;
};

export type CognitiveAgentSeed = {
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  persona: string;
  homeLocation: AgentLocation;
  homeSubLocationId: string;
  workLocation: AgentLocation;
  workSubLocationId: string;
  workActivity: string;
  memories: Array<{
    content: string;
    importance: number;
    tags: string[];
  }>;
};

type CognitivePlan = {
  agentId: string;
  observation: string;
  query: string;
  reflection: string;
  decision: string;
  action: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  targetAgentId?: string;
  targetTaskId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  eventType: Extract<AgentEventType, "handoff" | "message" | "tool_call">;
};

const runId = "run-smallville-cognitive-001";
const taskId = "task-smallville-cognitive-loop";
const baseTimestamp = "2026-07-04T15:";

const cognitiveAgents: CognitiveAgentSeed[] = [
  {
    agentId: "agent-isabella",
    agentName: "Isabella",
    agentRole: "planner",
    persona: "Coordinates the town day and turns weak signals into shared plans.",
    homeLocation: "town_hall",
    homeSubLocationId: "town_hall_table",
    workLocation: "town_hall",
    workSubLocationId: "town_hall_office",
    workActivity: "forms invitation",
    memories: [
      {
        content: "Yesterday Sam accepted evidence only after every visual claim had a screenshot.",
        importance: 8,
        tags: ["review", "evidence", "sam"],
      },
      {
        content: "Klaus explains product boundaries clearly when he starts from source-of-truth rules.",
        importance: 7,
        tags: ["klaus", "boundary", "research"],
      },
      {
        content: "Mei can turn scattered town activity into a durable memory note.",
        importance: 6,
        tags: ["mei", "memory", "archive"],
      },
    ],
  },
  {
    agentId: "agent-klaus",
    agentName: "Klaus",
    agentRole: "researcher",
    persona: "Grounds town behavior in literature and converts references into constraints.",
    homeLocation: "library",
    homeSubLocationId: "library_stacks",
    workLocation: "library",
    workSubLocationId: "library_reading_nook",
    workActivity: "reads precedent",
    memories: [
      {
        content: "Smallville-like behavior needs observation, memory retrieval, reflection, and planning.",
        importance: 9,
        tags: ["smallville", "memory", "planning"],
      },
      {
        content: "Maria can implement projection code quickly when boundaries are precise.",
        importance: 7,
        tags: ["maria", "projection", "implementation"],
      },
      {
        content: "The town should expose cognition evidence instead of hiding it behind scenery.",
        importance: 8,
        tags: ["evidence", "cognition", "ui"],
      },
    ],
  },
  {
    agentId: "agent-maria",
    agentName: "Maria",
    agentRole: "coder",
    persona: "Implements projection mechanics while keeping runtime facts event-owned.",
    homeLocation: "workshop",
    homeSubLocationId: "workshop_bench",
    workLocation: "workshop",
    workSubLocationId: "workshop_debug_desk",
    workActivity: "checks runtime",
    memories: [
      {
        content: "A Phaser scene can render projection hints but must not own agent facts.",
        importance: 9,
        tags: ["phaser", "projection", "boundary"],
      },
      {
        content: "Interior anchors become useful when event metadata names the sub-location.",
        importance: 8,
        tags: ["interior", "metadata", "rendering"],
      },
      {
        content: "Browser QA previously caught lifecycle timing problems that unit tests missed.",
        importance: 7,
        tags: ["qa", "browser", "lifecycle"],
      },
    ],
  },
  {
    agentId: "agent-sam",
    agentName: "Sam",
    agentRole: "reviewer",
    persona: "Acts as adversarial acceptance and asks whether proof covers the claim.",
    homeLocation: "review_room",
    homeSubLocationId: "review_table",
    workLocation: "review_room",
    workSubLocationId: "review_evidence_wall",
    workActivity: "checks evidence",
    memories: [
      {
        content: "A claim to match Stanford Smallville needs explicit gaps, not just better art.",
        importance: 10,
        tags: ["smallville", "gap", "review"],
      },
      {
        content: "Passing tests are weak evidence when they do not cover the actual product claim.",
        importance: 8,
        tags: ["tests", "coverage", "evidence"],
      },
      {
        content: "No merge should happen until user confirmation is explicit.",
        importance: 6,
        tags: ["merge", "safety", "scope"],
      },
    ],
  },
  {
    agentId: "agent-mei",
    agentName: "Mei",
    agentRole: "memory",
    persona: "Maintains durable town memory and links present activity to prior context.",
    homeLocation: "archive",
    homeSubLocationId: "archive_shelves",
    workLocation: "archive",
    workSubLocationId: "archive_writing_desk",
    workActivity: "writes memory",
    memories: [
      {
        content: "Town evidence works best when fact, evidence, inference, and limitation stay separate.",
        importance: 9,
        tags: ["evidence", "memory", "scope"],
      },
      {
        content: "The previous Town day trace proved projection, not autonomous cognition.",
        importance: 8,
        tags: ["town-day", "limitation", "cognition"],
      },
      {
        content: "Linear is acceptance, Notion is construction shape, and GitHub PR is code evidence.",
        importance: 7,
        tags: ["linear", "notion", "github"],
      },
    ],
  },
];

const cognitivePlans: CognitivePlan[] = [
  {
    agentId: "agent-isabella",
    observation: "The town needs a cognition loop, not only a prettier map.",
    query: "smallville evidence memory planning review",
    reflection: "A stronger town day should show why agents choose actions, not only where they stand.",
    decision: "Invite Klaus, Maria, Sam, and Mei into a public cognition walkthrough.",
    action: "Isabella posts the cognition walkthrough invitation at the dispatch board.",
    locationHint: "dispatch_board",
    subLocationId: "dispatch_notice_wall",
    activity: "posts invitation",
    targetAgentId: "agent-klaus",
    targetTaskId: "task-cognition-walkthrough",
    eventType: "handoff",
  },
  {
    agentId: "agent-klaus",
    observation: "Isabella asks for a Smallville-level cognition walkthrough.",
    query: "smallville memory reflection planning cognition evidence",
    reflection: "The paper-shaped gap is memory retrieval plus reflection plus planning, not the sprite layer.",
    decision: "Turn the reference into a concrete acceptance checklist for Maria and Sam.",
    action: "Klaus sends the cognitive acceptance checklist to Maria.",
    locationHint: "library",
    subLocationId: "library_reading_nook",
    activity: "shares checklist",
    targetAgentId: "agent-maria",
    eventType: "message",
  },
  {
    agentId: "agent-maria",
    observation: "Klaus says cognition evidence must survive renderer changes.",
    query: "projection metadata interior browser lifecycle",
    reflection: "The correct implementation is an event generator that emits cognition evidence before Phaser sees it.",
    decision: "Implement a deterministic cognitive runtime that outputs AgentEvent.",
    action: "Maria validates that the cognitive run still renders through the existing projection path.",
    locationHint: "workshop",
    subLocationId: "workshop_debug_desk",
    activity: "validates runtime",
    eventType: "tool_call",
    toolName: "run_cognitive_projection_check",
    toolInput: { path: "src/events/generativeRuntime.ts" },
    toolOutputSummary: "Cognition metadata stays in AgentEvent and WorldState projection hints.",
  },
  {
    agentId: "agent-sam",
    observation: "The town claim now needs adversarial acceptance against the real Stanford gap.",
    query: "smallville gap tests evidence acceptance",
    reflection: "A pass should require a gap matrix plus deterministic evidence, not only a pretty screenshot.",
    decision: "Require evidence that retrieval, reflection, planning, action, and limitation are all visible.",
    action: "Sam pins the cognitive-loop acceptance notes to the evidence wall.",
    locationHint: "review_room",
    subLocationId: "review_evidence_wall",
    activity: "pins checklist",
    eventType: "tool_call",
    toolName: "review_cognition_loop",
    toolInput: { gates: ["retrieval", "reflection", "planning", "projection"] },
    toolOutputSummary: "Acceptance checklist requires deterministic cognition stages and scope truth.",
  },
  {
    agentId: "agent-mei",
    observation: "The town needs a durable record of why this is still not full Stanford parity.",
    query: "memory scope limitation evidence github notion linear",
    reflection: "Durable memory should record both the progress and the remaining missing cognition machinery.",
    decision: "Write a memory note that separates achieved projection from unimplemented autonomy.",
    action: "Mei writes the cognition-loop memory note in the archive.",
    locationHint: "archive",
    subLocationId: "archive_writing_desk",
    activity: "records limitation",
    eventType: "tool_call",
    toolName: "write_memory_note",
    toolInput: { note: "deterministic cognition loop is not autonomous simulation" },
    toolOutputSummary: "Memory note distinguishes event generation from full autonomous agents.",
  },
];

function timestamp(sequence: number): string {
  return `${baseTimestamp}${String(sequence).padStart(2, "0")}:00.000Z`;
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function scoreRelevance(query: string, memory: MemoryRecord): number {
  const queryTokens = tokenize(query);
  const memoryTokens = tokenize(`${memory.content} ${memory.tags.join(" ")}`);

  if (queryTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of queryTokens) {
    if (memoryTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.size;
}

function scoreRecency(currentSequence: number, memory: MemoryRecord): number {
  const distance = Math.max(0, currentSequence - memory.lastAccessedSequence);

  return 1 / (1 + distance / 12);
}

function scoreImportance(memory: MemoryRecord): number {
  return Math.max(0, Math.min(1, memory.importance / 10));
}

export function scoreMemoryRecord(
  memory: MemoryRecord,
  query: string,
  currentSequence: number,
): RetrievedMemory {
  const recencyScore = scoreRecency(currentSequence, memory);
  const relevanceScore = scoreRelevance(query, memory);
  const importanceScore = scoreImportance(memory);
  const score = 0.45 * relevanceScore + 0.35 * importanceScore + 0.2 * recencyScore;

  return {
    memoryId: memory.id,
    content: memory.content,
    importance: memory.importance,
    importanceScore: roundScore(importanceScore),
    recencyScore: roundScore(recencyScore),
    relevanceScore: roundScore(relevanceScore),
    score: roundScore(score),
  };
}

export function retrieveMemories(
  memoryStream: readonly MemoryRecord[],
  query: string,
  currentSequence: number,
  limit = 3,
): RetrievedMemory[] {
  return memoryStream
    .map((memory) => scoreMemoryRecord(memory, query, currentSequence))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.memoryId.localeCompare(right.memoryId);
    })
    .slice(0, limit);
}

function seedMemoryStream(agents: readonly CognitiveAgentSeed[]): Map<string, MemoryRecord[]> {
  const streams = new Map<string, MemoryRecord[]>();

  for (const agent of agents) {
    streams.set(
      agent.agentId,
      agent.memories.map((memory, index) => ({
        id: `${agent.agentId}-seed-${String(index).padStart(2, "0")}`,
        agentId: agent.agentId,
        content: memory.content,
        createdAtSequence: 0,
        importance: memory.importance,
        kind: "observation",
        lastAccessedSequence: 0,
        tags: memory.tags,
      })),
    );
  }

  return streams;
}

function getAgent(agentId: string): CognitiveAgentSeed {
  const agent = cognitiveAgents.find((candidate) => candidate.agentId === agentId);

  if (agent === undefined) {
    throw new Error(`Unknown cognitive agent: ${agentId}`);
  }

  return agent;
}

function makeEvent(input: {
  agent: CognitiveAgentSeed;
  sequence: number;
  type: AgentEventType;
  summary: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  cognitiveStage: CognitiveStage;
  targetAgentId?: string;
  targetTaskId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  artifactIds?: string[];
  status?: AgentEventStatus;
  metadata?: Record<string, unknown>;
}): AgentEvent {
  return {
    id: `cognitive-${String(input.sequence).padStart(3, "0")}`,
    runId,
    taskId,
    timestamp: timestamp(input.sequence),
    sequence: input.sequence,
    agentId: input.agent.agentId,
    agentName: input.agent.agentName,
    agentRole: input.agent.agentRole,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    targetTaskId: input.targetTaskId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    artifactIds: input.artifactIds,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: {
      source: "mock",
      tags: ["smallville-cognitive", input.cognitiveStage, input.subLocationId],
      cognitiveStage: input.cognitiveStage,
      subLocationId: input.subLocationId,
      activity: input.activity,
      persona: input.agent.persona,
      ...input.metadata,
    },
  };
}

function remember(
  streams: Map<string, MemoryRecord[]>,
  event: AgentEvent,
  kind: MemoryKind,
  content: string,
  importance: number,
  tags: string[],
): MemoryRecord {
  const record: MemoryRecord = {
    id: `${event.agentId}-${kind}-${String(event.sequence).padStart(3, "0")}`,
    agentId: event.agentId,
    content,
    createdAtSequence: event.sequence,
    importance,
    kind,
    lastAccessedSequence: event.sequence,
    tags,
  };
  const stream = streams.get(event.agentId) ?? [];
  streams.set(event.agentId, [...stream, record]);

  return record;
}

export function generateSmallvilleCognitiveRun(): AgentEvent[] {
  const streams = seedMemoryStream(cognitiveAgents);
  const events: AgentEvent[] = [];
  let sequence = 0;

  for (const plan of cognitivePlans) {
    const agent = getAgent(plan.agentId);
    const observation = makeEvent({
      agent,
      sequence,
      type: "memory_write",
      summary: "Observe town need",
      content: plan.observation,
      locationHint: agent.homeLocation,
      subLocationId: agent.homeSubLocationId,
      activity: "observes",
      cognitiveStage: "observation",
      metadata: {
        memoryKind: "observation",
      },
    });
    const observationRecord = remember(
      streams,
      observation,
      "observation",
      plan.observation,
      8,
      ["observation", "smallville-cognitive"],
    );
    observation.metadata = {
      ...observation.metadata,
      memoryId: observationRecord.id,
      importance: observationRecord.importance,
    };
    events.push(observation);
    sequence += 1;

    const stream = streams.get(agent.agentId) ?? [];
    const retrievedMemories = retrieveMemories(stream, plan.query, sequence, 3);
    const retrievedIds = new Set(retrievedMemories.map((memory) => memory.memoryId));
    streams.set(
      agent.agentId,
      stream.map((memory) =>
        retrievedIds.has(memory.id)
          ? { ...memory, lastAccessedSequence: sequence }
          : memory,
      ),
    );

    events.push(
      makeEvent({
        agent,
        sequence,
        type: "memory_read",
        summary: "Retrieve relevant memory",
        content: `${agent.agentName} retrieves memories for query: ${plan.query}.`,
        locationHint: "archive",
        subLocationId: "archive_shelves",
        activity: "retrieves memory",
        cognitiveStage: "retrieval",
        metadata: {
          retrievalQuery: plan.query,
          retrievedMemories,
        },
      }),
    );
    sequence += 1;

    const reflection = makeEvent({
      agent,
      sequence,
      type: "thinking",
      summary: "Reflect on retrieved memories",
      content: plan.reflection,
      locationHint: agent.workLocation,
      subLocationId: agent.workSubLocationId,
      activity: "reflects",
      cognitiveStage: "reflection",
      metadata: {
        derivedFromMemoryIds: retrievedMemories.map((memory) => memory.memoryId),
        reflectionThreshold: 0.72,
        averageRetrievedScore: roundScore(
          retrievedMemories.reduce((sum, memory) => sum + memory.score, 0) /
            Math.max(1, retrievedMemories.length),
        ),
      },
    });
    const reflectionRecord = remember(
      streams,
      reflection,
      "reflection",
      plan.reflection,
      9,
      ["reflection", "smallville-cognitive"],
    );
    reflection.metadata = {
      ...reflection.metadata,
      memoryId: reflectionRecord.id,
    };
    events.push(reflection);
    sequence += 1;

    const decision = makeEvent({
      agent,
      sequence,
      type: "decision",
      summary: "Plan next action",
      content: plan.decision,
      locationHint: "town_hall",
      subLocationId: "town_hall_table",
      activity: "plans",
      cognitiveStage: "planning",
      metadata: {
        planStep: {
          goal: plan.decision,
          nextAction: plan.action,
          targetAgentId: plan.targetAgentId,
          targetTaskId: plan.targetTaskId,
          expectedLocation: plan.subLocationId,
        },
      },
    });
    const planRecord = remember(
      streams,
      decision,
      "plan",
      plan.decision,
      8,
      ["plan", "smallville-cognitive"],
    );
    decision.metadata = {
      ...decision.metadata,
      memoryId: planRecord.id,
    };
    events.push(decision);
    sequence += 1;

    events.push(
      makeEvent({
        agent,
        sequence,
        type: plan.eventType,
        summary: "Act on plan",
        content: plan.action,
        locationHint: plan.locationHint,
        subLocationId: plan.subLocationId,
        activity: plan.activity,
        cognitiveStage: plan.eventType === "message" ? "conversation" : "action",
        targetAgentId: plan.targetAgentId,
        targetTaskId: plan.targetTaskId,
        toolName: plan.toolName,
        toolInput: plan.toolInput,
        toolOutputSummary: plan.toolOutputSummary,
        metadata: {
          executedPlanMemoryId: planRecord.id,
          actionSource: "deterministic-cognitive-runtime",
        },
      }),
    );
    sequence += 1;
  }

  const closureOrder = [
    "agent-isabella",
    "agent-klaus",
    "agent-maria",
    "agent-sam",
    "agent-mei",
  ];

  for (const agentId of closureOrder) {
    const agent = getAgent(agentId);
    events.push(
      makeEvent({
        agent,
        sequence,
        type: "done",
        summary: "Close cognitive loop",
        content: `${agent.agentName} closes the cognitive walkthrough with memory, reflection, plan, and action evidence visible.`,
        locationHint: "square",
        subLocationId: "square_fountain_edge",
        activity: "closes loop",
        cognitiveStage: "closure",
        status: "done",
        metadata: {
          provedStages: ["observation", "retrieval", "reflection", "planning", "action"],
        },
      }),
    );
    sequence += 1;
  }

  return events;
}

export const mockSmallvilleCognitiveRun: AgentEvent[] = generateSmallvilleCognitiveRun();
