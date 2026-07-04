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

type SocialAgentSeed = Omit<CognitiveAgentSeed, "memories"> & {
  dailyIntention: string;
  inviteWave: number;
  relationshipIds: string[];
};

export type RoutinePhase =
  | "wake"
  | "retrieve"
  | "work"
  | "plan"
  | "act"
  | "close";

type RoutineSegment = {
  dayId: string;
  phase: RoutinePhase;
  segmentId: string;
  startMinute: number;
  endMinute: number;
  scheduledLocation: AgentLocation;
  scheduledSubLocationId: string;
  plannedActivity: string;
  intention: string;
  conflictId?: string;
};

type RoutineConflict = {
  conflictId: string;
  capacity: number;
  crowdedSubLocationId: string;
  resolution: string;
  shiftedToLocation: AgentLocation;
  shiftedToSubLocationId: string;
  involvedAgentIds: string[];
};

export type SocialDiffusionSummary = {
  agentCount: number;
  informedAgentIds: string[];
  invitationMessageCount: number;
  maxWave: number;
};

export type RoutineDaySummary = {
  agentCount: number;
  actionCount: number;
  conflictCount: number;
  memoryReadCount: number;
  memoryWriteCount: number;
  phaseCounts: Record<RoutinePhase, number>;
  scheduledAgentIds: string[];
};

const runId = "run-smallville-cognitive-001";
const taskId = "task-smallville-cognitive-loop";
const baseTimestamp = "2026-07-04T15:00:00.000Z";

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

function timestampAt(startTimestamp: string, sequence: number): string {
  const start = new Date(startTimestamp);
  start.setUTCMinutes(start.getUTCMinutes() + sequence);

  return start.toISOString();
}

function timestamp(sequence: number): string {
  return timestampAt(baseTimestamp, sequence);
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

const socialRunId = "run-smallville-social-001";
const socialTaskId = "task-valentine-social-diffusion";
const socialBaseTimestamp = "2026-07-04T16:00:00.000Z";
const routineRunId = "run-smallville-routine-001";
const routineTaskId = "task-smallville-routine-scheduler";
const routineDayId = "smallville-routine-day-2026-07-04";
const routineBaseTimestamp = "2026-07-04T17:00:00.000Z";

const socialAgentSeeds: readonly SocialAgentSeed[] = [
  {
    agentId: "agent-isabella",
    agentName: "Isabella",
    agentRole: "planner",
    persona: "Hosts civic rituals and turns one suggestion into a coordinated plan.",
    homeLocation: "town_hall",
    homeSubLocationId: "town_hall_table",
    workLocation: "dispatch_board",
    workSubLocationId: "dispatch_notice_wall",
    workActivity: "posts party plan",
    dailyIntention: "host a small Valentine's gathering by the fountain",
    inviteWave: 0,
    relationshipIds: ["agent-klaus", "agent-mei", "agent-sam"],
  },
  {
    agentId: "agent-klaus",
    agentName: "Klaus",
    agentRole: "researcher",
    persona: "Turns rumors into trustworthy town knowledge.",
    homeLocation: "library",
    homeSubLocationId: "library_stacks",
    workLocation: "library",
    workSubLocationId: "library_reading_nook",
    workActivity: "checks precedent",
    dailyIntention: "verify the invitation and tell the researchers",
    inviteWave: 1,
    relationshipIds: ["agent-mei", "agent-nora", "agent-teo", "agent-priya"],
  },
  {
    agentId: "agent-mei",
    agentName: "Mei",
    agentRole: "memory",
    persona: "Maintains the town memory stream and knows who should hear what.",
    homeLocation: "archive",
    homeSubLocationId: "archive_shelves",
    workLocation: "archive",
    workSubLocationId: "archive_writing_desk",
    workActivity: "records invitation",
    dailyIntention: "record the party as a durable social memory",
    inviteWave: 1,
    relationshipIds: ["agent-sam", "agent-pavel", "agent-zara", "agent-iris"],
  },
  {
    agentId: "agent-sam",
    agentName: "Sam",
    agentRole: "reviewer",
    persona: "Checks whether social claims are supported by observable evidence.",
    homeLocation: "review_room",
    homeSubLocationId: "review_table",
    workLocation: "review_room",
    workSubLocationId: "review_evidence_wall",
    workActivity: "checks acceptance",
    dailyIntention: "make sure the gathering has verifiable attendance",
    inviteWave: 1,
    relationshipIds: ["agent-maria", "agent-omar", "agent-june", "agent-victor"],
  },
  {
    agentId: "agent-maria",
    agentName: "Maria",
    agentRole: "coder",
    persona: "Builds projection mechanics while staying alert to social signals.",
    homeLocation: "workshop",
    homeSubLocationId: "workshop_bench",
    workLocation: "workshop",
    workSubLocationId: "workshop_debug_desk",
    workActivity: "checks route",
    dailyIntention: "prepare the fountain projection for the gathering",
    inviteWave: 2,
    relationshipIds: ["agent-nora", "agent-lina", "agent-marco", "agent-rafa"],
  },
  {
    agentId: "agent-nora",
    agentName: "Nora",
    agentRole: "planner",
    persona: "Coordinates small routines and keeps the town square calendar.",
    homeLocation: "town_hall",
    homeSubLocationId: "town_hall_office",
    workLocation: "town_hall",
    workSubLocationId: "town_hall_table",
    workActivity: "updates calendar",
    dailyIntention: "reserve the square for evening coordination",
    inviteWave: 2,
    relationshipIds: ["agent-teo", "agent-anika", "agent-celine"],
  },
  {
    agentId: "agent-teo",
    agentName: "Teo",
    agentRole: "researcher",
    persona: "Carries new information from the library into casual conversation.",
    homeLocation: "library",
    homeSubLocationId: "library_reading_nook",
    workLocation: "library",
    workSubLocationId: "library_stacks",
    workActivity: "sorts notes",
    dailyIntention: "tell nearby readers why the gathering matters",
    inviteWave: 2,
    relationshipIds: ["agent-priya", "agent-haruto", "agent-yuna"],
  },
  {
    agentId: "agent-priya",
    agentName: "Priya",
    agentRole: "critic",
    persona: "Asks whether a plan is socially useful before endorsing it.",
    homeLocation: "review_room",
    homeSubLocationId: "review_table",
    workLocation: "library",
    workSubLocationId: "library_reading_nook",
    workActivity: "questions premise",
    dailyIntention: "make the party inclusive instead of symbolic",
    inviteWave: 2,
    relationshipIds: ["agent-pavel", "agent-sol", "agent-elena"],
  },
  {
    agentId: "agent-pavel",
    agentName: "Pavel",
    agentRole: "memory",
    persona: "Connects current plans to what the town promised yesterday.",
    homeLocation: "archive",
    homeSubLocationId: "archive_shelves",
    workLocation: "archive",
    workSubLocationId: "archive_writing_desk",
    workActivity: "links memory",
    dailyIntention: "bring past invitations into the current plan",
    inviteWave: 2,
    relationshipIds: ["agent-zara", "agent-noah", "agent-diego"],
  },
  {
    agentId: "agent-zara",
    agentName: "Zara",
    agentRole: "orchestrator",
    persona: "Moves between rooms and connects people who would not otherwise meet.",
    homeLocation: "dispatch_board",
    homeSubLocationId: "dispatch_queue",
    workLocation: "square",
    workSubLocationId: "square_cafe",
    workActivity: "routes guests",
    dailyIntention: "turn memory into turnout",
    inviteWave: 2,
    relationshipIds: ["agent-iris", "agent-diego"],
  },
  {
    agentId: "agent-iris",
    agentName: "Iris",
    agentRole: "custom",
    persona: "Makes the square feel welcoming through small gestures.",
    homeLocation: "square",
    homeSubLocationId: "square_cafe",
    workLocation: "square",
    workSubLocationId: "square_fountain_edge",
    workActivity: "sets tables",
    dailyIntention: "prepare the gathering place",
    inviteWave: 2,
    relationshipIds: ["agent-omar", "agent-celine", "agent-victor"],
  },
  {
    agentId: "agent-omar",
    agentName: "Omar",
    agentRole: "reviewer",
    persona: "Watches whether plans become observable commitments.",
    homeLocation: "review_room",
    homeSubLocationId: "review_evidence_wall",
    workLocation: "review_room",
    workSubLocationId: "review_table",
    workActivity: "tracks RSVP",
    dailyIntention: "count who actually heard the invitation",
    inviteWave: 2,
    relationshipIds: ["agent-june", "agent-lina", "agent-noah"],
  },
  {
    agentId: "agent-june",
    agentName: "June",
    agentRole: "critic",
    persona: "Identifies awkward social edges before the gathering happens.",
    homeLocation: "review_room",
    homeSubLocationId: "review_table",
    workLocation: "dispatch_board",
    workSubLocationId: "dispatch_notice_wall",
    workActivity: "edits notice",
    dailyIntention: "make the invitation less formal",
    inviteWave: 2,
    relationshipIds: ["agent-victor", "agent-yuna", "agent-marco"],
  },
  {
    agentId: "agent-victor",
    agentName: "Victor",
    agentRole: "custom",
    persona: "Often decides late but influences nearby friends.",
    homeLocation: "square",
    homeSubLocationId: "square_fountain_edge",
    workLocation: "workshop",
    workSubLocationId: "workshop_bench",
    workActivity: "helps setup",
    dailyIntention: "decide whether to attend after hearing from reviewers",
    inviteWave: 2,
    relationshipIds: ["agent-lina", "agent-rafa", "agent-anika"],
  },
  {
    agentId: "agent-lina",
    agentName: "Lina",
    agentRole: "coder",
    persona: "Turns social plans into concrete setup tasks.",
    homeLocation: "workshop",
    homeSubLocationId: "workshop_bench",
    workLocation: "workshop",
    workSubLocationId: "workshop_debug_desk",
    workActivity: "makes checklist",
    dailyIntention: "prepare lights for the fountain",
    inviteWave: 3,
    relationshipIds: ["agent-marco", "agent-maria", "agent-noah"],
  },
  {
    agentId: "agent-marco",
    agentName: "Marco",
    agentRole: "custom",
    persona: "Treats invitations as chances to repair weak ties.",
    homeLocation: "square",
    homeSubLocationId: "square_cafe",
    workLocation: "square",
    workSubLocationId: "square_cafe",
    workActivity: "sets menu",
    dailyIntention: "bring a cafe plan to the party",
    inviteWave: 3,
    relationshipIds: ["agent-rafa", "agent-elena", "agent-zara"],
  },
  {
    agentId: "agent-rafa",
    agentName: "Rafa",
    agentRole: "orchestrator",
    persona: "Collects late RSVPs and prevents the plan from fragmenting.",
    homeLocation: "dispatch_board",
    homeSubLocationId: "dispatch_queue",
    workLocation: "dispatch_board",
    workSubLocationId: "dispatch_notice_wall",
    workActivity: "collects RSVP",
    dailyIntention: "close the attendance loop",
    inviteWave: 3,
    relationshipIds: ["agent-anika", "agent-isabella", "agent-zara"],
  },
  {
    agentId: "agent-anika",
    agentName: "Anika",
    agentRole: "researcher",
    persona: "Learns by listening to multiple sides of a town plan.",
    homeLocation: "library",
    homeSubLocationId: "library_stacks",
    workLocation: "library",
    workSubLocationId: "library_reading_nook",
    workActivity: "compares stories",
    dailyIntention: "verify the party time",
    inviteWave: 3,
    relationshipIds: ["agent-celine", "agent-nora", "agent-victor"],
  },
  {
    agentId: "agent-celine",
    agentName: "Celine",
    agentRole: "planner",
    persona: "Turns informal talk into a schedule people can follow.",
    homeLocation: "town_hall",
    homeSubLocationId: "town_hall_table",
    workLocation: "town_hall",
    workSubLocationId: "town_hall_office",
    workActivity: "sets time",
    dailyIntention: "write down the evening sequence",
    inviteWave: 3,
    relationshipIds: ["agent-haruto", "agent-iris", "agent-june"],
  },
  {
    agentId: "agent-haruto",
    agentName: "Haruto",
    agentRole: "memory",
    persona: "Remembers who tends to be left out of group plans.",
    homeLocation: "archive",
    homeSubLocationId: "archive_shelves",
    workLocation: "archive",
    workSubLocationId: "archive_writing_desk",
    workActivity: "checks omissions",
    dailyIntention: "make sure quiet agents are invited",
    inviteWave: 3,
    relationshipIds: ["agent-teo", "agent-yuna"],
  },
  {
    agentId: "agent-yuna",
    agentName: "Yuna",
    agentRole: "custom",
    persona: "Speaks softly but spreads trusted plans quickly.",
    homeLocation: "square",
    homeSubLocationId: "square_cafe",
    workLocation: "library",
    workSubLocationId: "library_reading_nook",
    workActivity: "passes whisper",
    dailyIntention: "invite friends without making the room too formal",
    inviteWave: 3,
    relationshipIds: ["agent-sol", "agent-haruto", "agent-priya"],
  },
  {
    agentId: "agent-sol",
    agentName: "Sol",
    agentRole: "critic",
    persona: "Notices when a social plan creates pressure instead of warmth.",
    homeLocation: "review_room",
    homeSubLocationId: "review_table",
    workLocation: "review_room",
    workSubLocationId: "review_evidence_wall",
    workActivity: "softens plan",
    dailyIntention: "make attendance optional and comfortable",
    inviteWave: 3,
    relationshipIds: ["agent-elena", "agent-priya", "agent-noah"],
  },
  {
    agentId: "agent-elena",
    agentName: "Elena",
    agentRole: "custom",
    persona: "Brings practical hospitality into abstract plans.",
    homeLocation: "square",
    homeSubLocationId: "square_cafe",
    workLocation: "square",
    workSubLocationId: "square_cafe",
    workActivity: "plans snacks",
    dailyIntention: "bring food to the gathering",
    inviteWave: 3,
    relationshipIds: ["agent-noah", "agent-marco", "agent-zara"],
  },
  {
    agentId: "agent-noah",
    agentName: "Noah",
    agentRole: "coder",
    persona: "Uses visible artifacts to coordinate with people he barely knows.",
    homeLocation: "workshop",
    homeSubLocationId: "workshop_bench",
    workLocation: "workshop",
    workSubLocationId: "workshop_debug_desk",
    workActivity: "builds sign",
    dailyIntention: "make a readable RSVP sign",
    inviteWave: 3,
    relationshipIds: ["agent-diego", "agent-pavel", "agent-sol"],
  },
  {
    agentId: "agent-diego",
    agentName: "Diego",
    agentRole: "reviewer",
    persona: "Looks for the final proof that a town plan became shared reality.",
    homeLocation: "review_room",
    homeSubLocationId: "review_evidence_wall",
    workLocation: "square",
    workSubLocationId: "square_fountain_edge",
    workActivity: "records turnout",
    dailyIntention: "write down who came and how they heard",
    inviteWave: 4,
    relationshipIds: ["agent-isabella", "agent-zara", "agent-omar"],
  },
];

function socialTimestamp(sequence: number): string {
  return timestampAt(socialBaseTimestamp, sequence);
}

function routineTimestamp(sequence: number): string {
  return timestampAt(routineBaseTimestamp, sequence);
}

function getSocialAgent(agentId: string): SocialAgentSeed {
  const agent = socialAgentSeeds.find((candidate) => candidate.agentId === agentId);

  if (agent === undefined) {
    throw new Error(`Unknown social agent: ${agentId}`);
  }

  return agent;
}

function seedSocialMemoryStream(agents: readonly SocialAgentSeed[]): Map<string, MemoryRecord[]> {
  const streams = new Map<string, MemoryRecord[]>();

  for (const agent of agents) {
    const relationshipNames = agent.relationshipIds
      .map((relationshipId) => getSocialAgent(relationshipId).agentName)
      .join(", ");
    streams.set(agent.agentId, [
      {
        id: `${agent.agentId}-seed-party`,
        agentId: agent.agentId,
        content: `${agent.agentName} knows that town gatherings work only when invitations travel through trusted relationships.`,
        createdAtSequence: 0,
        importance: 8,
        kind: "observation",
        lastAccessedSequence: 0,
        tags: ["party", "relationship", "smallville-social"],
      },
      {
        id: `${agent.agentId}-seed-relationships`,
        agentId: agent.agentId,
        content: `${agent.agentName} tends to coordinate with ${relationshipNames}.`,
        createdAtSequence: 0,
        importance: 7,
        kind: "observation",
        lastAccessedSequence: 0,
        tags: ["relationship", "social-graph", agent.workLocation],
      },
      {
        id: `${agent.agentId}-seed-intention`,
        agentId: agent.agentId,
        content: `${agent.agentName}'s plan today is to ${agent.dailyIntention}.`,
        createdAtSequence: 0,
        importance: 6,
        kind: "plan",
        lastAccessedSequence: 0,
        tags: ["daily-plan", "routine", agent.workSubLocationId],
      },
    ]);
  }

  return streams;
}

function makeSocialEvent(input: {
  agent: SocialAgentSeed;
  sequence: number;
  type: AgentEventType;
  summary: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  cognitiveStage: CognitiveStage;
  targetAgentId?: string;
  status?: AgentEventStatus;
  metadata?: Record<string, unknown>;
}): AgentEvent {
  return {
    id: `social-${String(input.sequence).padStart(3, "0")}`,
    runId: socialRunId,
    taskId: socialTaskId,
    timestamp: socialTimestamp(input.sequence),
    sequence: input.sequence,
    agentId: input.agent.agentId,
    agentName: input.agent.agentName,
    agentRole: input.agent.agentRole,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    targetTaskId: socialTaskId,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: {
      source: "mock",
      tags: [
        "smallville-social",
        input.cognitiveStage,
        input.subLocationId,
        `wave-${input.agent.inviteWave}`,
      ],
      cognitiveStage: input.cognitiveStage,
      subLocationId: input.subLocationId,
      activity: input.activity,
      persona: input.agent.persona,
      relationships: input.agent.relationshipIds,
      ...input.metadata,
    },
  };
}

function makeRoutineSegment(input: {
  agent: SocialAgentSeed;
  phase: RoutinePhase;
  sequence: number;
  location: AgentLocation;
  subLocationId: string;
  activity: string;
  conflictId?: string;
}): RoutineSegment {
  const startMinute = 480 + input.sequence * 5;

  return {
    dayId: routineDayId,
    phase: input.phase,
    segmentId: `${input.agent.agentId}-${input.phase}`,
    startMinute,
    endMinute: startMinute + 5,
    scheduledLocation: input.location,
    scheduledSubLocationId: input.subLocationId,
    plannedActivity: input.activity,
    intention: input.agent.dailyIntention,
    conflictId: input.conflictId,
  };
}

function makeRoutineEvent(input: {
  agent: SocialAgentSeed;
  sequence: number;
  type: AgentEventType;
  summary: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  cognitiveStage: CognitiveStage;
  phase: RoutinePhase;
  targetAgentId?: string;
  status?: AgentEventStatus;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  metadata?: Record<string, unknown>;
  conflict?: RoutineConflict;
}): AgentEvent {
  const routine = makeRoutineSegment({
    agent: input.agent,
    phase: input.phase,
    sequence: input.sequence,
    location: input.locationHint,
    subLocationId: input.subLocationId,
    activity: input.activity,
    conflictId: input.conflict?.conflictId,
  });

  return {
    id: `routine-${String(input.sequence).padStart(3, "0")}`,
    runId: routineRunId,
    taskId: routineTaskId,
    timestamp: routineTimestamp(input.sequence),
    sequence: input.sequence,
    agentId: input.agent.agentId,
    agentName: input.agent.agentName,
    agentRole: input.agent.agentRole,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgentId,
    targetTaskId: routineTaskId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: {
      source: "mock",
      tags: [
        "smallville-routine",
        input.cognitiveStage,
        input.phase,
        input.subLocationId,
        ...(input.conflict === undefined ? [] : ["routine-conflict"]),
      ],
      cognitiveStage: input.cognitiveStage,
      subLocationId: input.subLocationId,
      activity: input.activity,
      persona: input.agent.persona,
      relationships: input.agent.relationshipIds,
      routine,
      routineConflict: input.conflict,
      ...input.metadata,
    },
  };
}

function fallbackLocationForRoutineConflict(
  agent: SocialAgentSeed,
): Pick<RoutineConflict, "shiftedToLocation" | "shiftedToSubLocationId"> {
  switch (agent.agentRole) {
    case "planner":
    case "orchestrator":
      return {
        shiftedToLocation: "dispatch_board",
        shiftedToSubLocationId: "dispatch_queue",
      };
    case "researcher":
    case "critic":
      return {
        shiftedToLocation: "library",
        shiftedToSubLocationId: "library_stacks",
      };
    case "coder":
      return {
        shiftedToLocation: "workshop",
        shiftedToSubLocationId: "workshop_bench",
      };
    case "memory":
      return {
        shiftedToLocation: "archive",
        shiftedToSubLocationId: "archive_shelves",
      };
    case "reviewer":
      return {
        shiftedToLocation: "review_room",
        shiftedToSubLocationId: "review_table",
      };
    case "custom":
      return {
        shiftedToLocation: "square",
        shiftedToSubLocationId: "square_fountain_edge",
      };
  }
}

function buildRoutineConflicts(
  agents: readonly SocialAgentSeed[],
): Map<string, RoutineConflict> {
  const bySubLocation = new Map<string, SocialAgentSeed[]>();
  const conflicts = new Map<string, RoutineConflict>();
  const capacity = 2;

  for (const agent of agents) {
    bySubLocation.set(agent.workSubLocationId, [
      ...(bySubLocation.get(agent.workSubLocationId) ?? []),
      agent,
    ]);
  }

  for (const [subLocationId, crowdedAgents] of bySubLocation) {
    if (crowdedAgents.length <= capacity) {
      continue;
    }

    crowdedAgents.slice(capacity).forEach((agent, index) => {
      const fallback = fallbackLocationForRoutineConflict(agent);
      const conflictId = `routine-conflict-${subLocationId}-${index + 1}`;
      conflicts.set(agent.agentId, {
        conflictId,
        capacity,
        crowdedSubLocationId: subLocationId,
        resolution: `${agent.agentName} shifts the routine to ${fallback.shiftedToSubLocationId} while preserving the same intention.`,
        ...fallback,
        involvedAgentIds: crowdedAgents.map((candidate) => candidate.agentId),
      });
    });
  }

  return conflicts;
}

function routineActionFor(
  agent: SocialAgentSeed,
  conflict: RoutineConflict | undefined,
): {
  type: Extract<AgentEventType, "handoff" | "message" | "tool_call">;
  activity: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  targetAgentId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
} {
  const targetAgent = getSocialAgent(agent.relationshipIds[0]);
  const locationHint = conflict?.shiftedToLocation ?? agent.workLocation;
  const subLocationId = conflict?.shiftedToSubLocationId ?? agent.workSubLocationId;

  if (agent.agentRole === "coder") {
    return {
      type: "tool_call",
      activity: agent.workActivity,
      content: `${agent.agentName} works on ${agent.workActivity} for the daily routine.`,
      locationHint,
      subLocationId,
      toolName: "routine_task",
      toolInput: {
        agentId: agent.agentId,
        intention: agent.dailyIntention,
        subLocationId,
      },
      toolOutputSummary: `${agent.agentName}'s routine task becomes visible as AgentEvent evidence.`,
    };
  }

  if (agent.agentRole === "planner" || agent.agentRole === "orchestrator") {
    return {
      type: "handoff",
      activity: "routes routine step",
      content: `${agent.agentName} routes the next routine step to ${targetAgent.agentName}.`,
      locationHint,
      subLocationId,
      targetAgentId: targetAgent.agentId,
    };
  }

  return {
    type: "message",
    activity: "coordinates routine",
    content: `${agent.agentName} tells ${targetAgent.agentName} how today's routine affects ${agent.dailyIntention}.`,
    locationHint,
    subLocationId,
    targetAgentId: targetAgent.agentId,
  };
}

export function summarizeSocialDiffusion(
  events: readonly AgentEvent[],
): SocialDiffusionSummary {
  const informedAgentIds = new Set<string>();
  let invitationMessageCount = 0;
  let maxWave = 0;

  for (const event of events) {
    const diffusion = event.metadata?.socialDiffusion;
    if (typeof diffusion !== "object" || diffusion === null || Array.isArray(diffusion)) {
      continue;
    }

    const record = diffusion as Record<string, unknown>;
    if (record.knowsParty === true) {
      informedAgentIds.add(event.agentId);
    }

    if (event.type === "message" && record.eventId === "valentine-party") {
      invitationMessageCount += 1;
    }

    if (typeof record.wave === "number") {
      maxWave = Math.max(maxWave, record.wave);
    }
  }

  return {
    agentCount: informedAgentIds.size,
    informedAgentIds: [...informedAgentIds].sort(),
    invitationMessageCount,
    maxWave,
  };
}

function isRoutinePhase(value: unknown): value is RoutinePhase {
  return (
    value === "wake" ||
    value === "retrieve" ||
    value === "work" ||
    value === "plan" ||
    value === "act" ||
    value === "close"
  );
}

export function summarizeRoutineDay(events: readonly AgentEvent[]): RoutineDaySummary {
  const agentIds = new Set<string>();
  const phaseCounts: Record<RoutinePhase, number> = {
    wake: 0,
    retrieve: 0,
    work: 0,
    plan: 0,
    act: 0,
    close: 0,
  };
  let actionCount = 0;
  let conflictCount = 0;
  let memoryReadCount = 0;
  let memoryWriteCount = 0;

  for (const event of events) {
    const routine = event.metadata?.routine;

    if (typeof routine === "object" && routine !== null && !Array.isArray(routine)) {
      agentIds.add(event.agentId);
      const phase = (routine as Record<string, unknown>).phase;

      if (isRoutinePhase(phase)) {
        phaseCounts[phase] += 1;
      }
    }

    if (event.metadata?.routineConflict !== undefined) {
      conflictCount += 1;
    }

    if (event.type === "handoff" || event.type === "message" || event.type === "tool_call") {
      actionCount += 1;
    }

    if (event.type === "memory_read") {
      memoryReadCount += 1;
    }

    if (event.type === "memory_write") {
      memoryWriteCount += 1;
    }
  }

  return {
    agentCount: agentIds.size,
    actionCount,
    conflictCount,
    memoryReadCount,
    memoryWriteCount,
    phaseCounts,
    scheduledAgentIds: [...agentIds].sort(),
  };
}

export function generateSmallvilleRoutineRun(): AgentEvent[] {
  const streams = seedSocialMemoryStream(socialAgentSeeds);
  const conflicts = buildRoutineConflicts(socialAgentSeeds);
  const events: AgentEvent[] = [];
  let sequence = 0;

  for (const agent of socialAgentSeeds) {
    const conflict = conflicts.get(agent.agentId);
    const action = routineActionFor(agent, conflict);

    const observationContent = `${agent.agentName} starts the day intending to ${agent.dailyIntention}.`;
    const observation = makeRoutineEvent({
      agent,
      sequence,
      type: "memory_write",
      summary: "Observe daily intention",
      content: observationContent,
      locationHint: agent.homeLocation,
      subLocationId: agent.homeSubLocationId,
      activity: "checks daily routine",
      cognitiveStage: "observation",
      phase: "wake",
      metadata: {
        memoryKind: "observation",
      },
    });
    const observationRecord = remember(
      streams,
      observation,
      "observation",
      observationContent,
      8,
      ["routine", "observation", agent.workSubLocationId],
    );
    observation.metadata = {
      ...observation.metadata,
      memoryId: observationRecord.id,
      importance: observationRecord.importance,
    };
    events.push(observation);
    sequence += 1;

    const query = `${agent.dailyIntention} ${agent.workActivity} ${agent.workSubLocationId}`;
    const stream = streams.get(agent.agentId) ?? [];
    const retrievedMemories = retrieveMemories(stream, query, sequence, 3);
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
      makeRoutineEvent({
        agent,
        sequence,
        type: "memory_read",
        summary: "Retrieve routine memory",
        content: `${agent.agentName} retrieves memories before leaving for ${agent.workSubLocationId}.`,
        locationHint: "archive",
        subLocationId: "archive_shelves",
        activity: "retrieves routine memory",
        cognitiveStage: "retrieval",
        phase: "retrieve",
        metadata: {
          retrievalQuery: query,
          retrievedMemories,
        },
      }),
    );
    sequence += 1;

    const conflictPhrase =
      conflict === undefined
        ? `${agent.agentName}'s planned location has room for the routine.`
        : conflict.resolution;
    const reflectionContent = `${agent.agentName} reflects on the retrieved routine memory. ${conflictPhrase}`;
    const reflection = makeRoutineEvent({
      agent,
      sequence,
      type: conflict === undefined ? "thinking" : "blocked",
      summary: conflict === undefined ? "Reflect on routine fit" : "Resolve routine conflict",
      content: reflectionContent,
      locationHint: conflict?.shiftedToLocation ?? agent.workLocation,
      subLocationId: conflict?.shiftedToSubLocationId ?? agent.workSubLocationId,
      activity: conflict === undefined ? "reflects on schedule" : "resolves crowding",
      cognitiveStage: "reflection",
      phase: "work",
      status: conflict === undefined ? "running" : "blocked",
      conflict,
      metadata: {
        derivedFromMemoryIds: retrievedMemories.map((memory) => memory.memoryId),
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
      reflectionContent,
      conflict === undefined ? 7 : 9,
      ["routine", "reflection", conflict === undefined ? "open-slot" : "conflict"],
    );
    reflection.metadata = {
      ...reflection.metadata,
      memoryId: reflectionRecord.id,
    };
    events.push(reflection);
    sequence += 1;

    const planContent = `${agent.agentName} plans to ${agent.dailyIntention} by ${action.activity} at ${action.subLocationId}.`;
    const plan = makeRoutineEvent({
      agent,
      sequence,
      type: "decision",
      summary: "Plan routine segment",
      content: planContent,
      locationHint: "town_hall",
      subLocationId: "town_hall_table",
      activity: "plans routine",
      cognitiveStage: "planning",
      phase: "plan",
      metadata: {
        planStep: {
          goal: agent.dailyIntention,
          nextAction: action.content,
          targetAgentId: action.targetAgentId,
          expectedLocation: action.subLocationId,
          conflictId: conflict?.conflictId,
        },
      },
    });
    const planRecord = remember(
      streams,
      plan,
      "plan",
      planContent,
      8,
      ["routine", "plan", action.subLocationId],
    );
    plan.metadata = {
      ...plan.metadata,
      memoryId: planRecord.id,
    };
    events.push(plan);
    sequence += 1;

    events.push(
      makeRoutineEvent({
        agent,
        sequence,
        type: action.type,
        summary: "Act on routine plan",
        content: action.content,
        locationHint: action.locationHint,
        subLocationId: action.subLocationId,
        activity: action.activity,
        cognitiveStage: action.type === "message" ? "conversation" : "action",
        phase: "act",
        targetAgentId: action.targetAgentId,
        toolName: action.toolName,
        toolInput: action.toolInput,
        toolOutputSummary: action.toolOutputSummary,
        metadata: {
          executedPlanMemoryId: planRecord.id,
          actionSource: "deterministic-routine-scheduler",
        },
      }),
    );
    sequence += 1;

    const closeContent = `${agent.agentName} writes back how the routine moved through ${action.subLocationId}.`;
    const close = makeRoutineEvent({
      agent,
      sequence,
      type: "memory_write",
      summary: "Write routine memory",
      content: closeContent,
      locationHint: action.locationHint,
      subLocationId: action.subLocationId,
      activity: "writes routine memory",
      cognitiveStage: "closure",
      phase: "close",
      status: "done",
      metadata: {
        memoryKind: "plan",
        closedPlanMemoryId: planRecord.id,
        resolvedConflictId: conflict?.conflictId,
      },
    });
    const closeRecord = remember(
      streams,
      close,
      "plan",
      closeContent,
      8,
      ["routine", "closure", action.subLocationId],
    );
    close.metadata = {
      ...close.metadata,
      memoryId: closeRecord.id,
    };
    events.push(close);
    sequence += 1;
  }

  return events;
}

export function generateSmallvilleSocialRun(): AgentEvent[] {
  const streams = seedSocialMemoryStream(socialAgentSeeds);
  const events: AgentEvent[] = [];
  let sequence = 0;

  socialAgentSeeds.forEach((agent, index) => {
    const heardFromAgent =
      index === 0 ? undefined : socialAgentSeeds[Math.max(0, index - 1)];
    const targetAgent = getSocialAgent(agent.relationshipIds[0]);
    const observationContent =
      heardFromAgent === undefined
        ? "A user suggests that Isabella should host a Valentine's gathering by the fountain."
        : `${agent.agentName} hears from ${heardFromAgent.agentName} that Isabella is planning a Valentine's gathering.`;
    const socialDiffusion = {
      eventId: "valentine-party",
      wave: agent.inviteWave,
      heardFromAgentId: heardFromAgent?.agentId,
      spreadsToAgentIds: [targetAgent.agentId],
      knowsParty: true,
    };

    const observation = makeSocialEvent({
      agent,
      sequence,
      type: "memory_write",
      summary: index === 0 ? "Seed party intervention" : "Hear party invitation",
      content: observationContent,
      locationHint: agent.homeLocation,
      subLocationId: agent.homeSubLocationId,
      activity: index === 0 ? "receives intervention" : "hears invitation",
      cognitiveStage: "observation",
      metadata: {
        memoryKind: "observation",
        intervention:
          index === 0
            ? {
                source: "user",
                prompt: "Isabella wants to host a Valentine's gathering.",
              }
            : undefined,
        socialDiffusion,
      },
    });
    const observationRecord = remember(
      streams,
      observation,
      "observation",
      observationContent,
      9,
      ["observation", "valentine-party", "smallville-social"],
    );
    observation.metadata = {
      ...observation.metadata,
      memoryId: observationRecord.id,
      importance: observationRecord.importance,
    };
    events.push(observation);
    sequence += 1;

    const query = `valentine party ${targetAgent.agentName} relationship schedule`;
    const stream = streams.get(agent.agentId) ?? [];
    const retrievedMemories = retrieveMemories(stream, query, sequence, 3);
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
      makeSocialEvent({
        agent,
        sequence,
        type: "memory_read",
        summary: "Retrieve social memory",
        content: `${agent.agentName} retrieves memories before deciding whether to tell ${targetAgent.agentName}.`,
        locationHint: "archive",
        subLocationId: "archive_shelves",
        activity: "retrieves social memory",
        cognitiveStage: "retrieval",
        metadata: {
          retrievalQuery: query,
          retrievedMemories,
          socialDiffusion,
        },
      }),
    );
    sequence += 1;

    const reflectionContent = `${agent.agentName} reflects that the invitation should travel through ${targetAgent.agentName} because ${targetAgent.agentName} connects another part of town.`;
    const reflection = makeSocialEvent({
      agent,
      sequence,
      type: "thinking",
      summary: "Reflect on social path",
      content: reflectionContent,
      locationHint: agent.workLocation,
      subLocationId: agent.workSubLocationId,
      activity: "reflects on tie",
      cognitiveStage: "reflection",
      metadata: {
        derivedFromMemoryIds: retrievedMemories.map((memory) => memory.memoryId),
        averageRetrievedScore: roundScore(
          retrievedMemories.reduce((sum, memory) => sum + memory.score, 0) /
            Math.max(1, retrievedMemories.length),
        ),
        socialDiffusion,
      },
    });
    const reflectionRecord = remember(
      streams,
      reflection,
      "reflection",
      reflectionContent,
      8,
      ["reflection", "valentine-party", "smallville-social"],
    );
    reflection.metadata = {
      ...reflection.metadata,
      memoryId: reflectionRecord.id,
    };
    events.push(reflection);
    sequence += 1;

    const decisionContent = `${agent.agentName} decides to attend if the plan remains voluntary and to tell ${targetAgent.agentName}.`;
    const decision = makeSocialEvent({
      agent,
      sequence,
      type: "decision",
      summary: "Plan invitation relay",
      content: decisionContent,
      locationHint: "town_hall",
      subLocationId: "town_hall_table",
      activity: "plans relay",
      cognitiveStage: "planning",
      metadata: {
        planStep: {
          goal: agent.dailyIntention,
          nextAction: `Tell ${targetAgent.agentName} about the Valentine's gathering.`,
          targetAgentId: targetAgent.agentId,
          expectedLocation: targetAgent.homeSubLocationId,
        },
        socialDiffusion,
      },
    });
    const planRecord = remember(
      streams,
      decision,
      "plan",
      decisionContent,
      8,
      ["plan", "valentine-party", "smallville-social"],
    );
    decision.metadata = {
      ...decision.metadata,
      memoryId: planRecord.id,
    };
    events.push(decision);
    sequence += 1;

    events.push(
      makeSocialEvent({
        agent,
        sequence,
        type: "message",
        summary: "Spread party invitation",
        content: `${agent.agentName} tells ${targetAgent.agentName}: Isabella is hosting a Valentine's gathering by the fountain, and you should come if it fits your evening.`,
        locationHint: agent.workLocation,
        subLocationId: agent.workSubLocationId,
        activity: "spreads invitation",
        cognitiveStage: "conversation",
        targetAgentId: targetAgent.agentId,
        metadata: {
          executedPlanMemoryId: planRecord.id,
          socialDiffusion,
        },
      }),
    );
    sequence += 1;
  });

  for (const agent of socialAgentSeeds) {
    events.push(
      makeSocialEvent({
        agent,
        sequence,
        type: "done",
        summary: "Arrive at party",
        content: `${agent.agentName} arrives at the fountain knowing who carried the invitation through town.`,
        locationHint: "square",
        subLocationId: "square_fountain_edge",
        activity: "attends party",
        cognitiveStage: "closure",
        status: "done",
        metadata: {
          socialDiffusion: {
            eventId: "valentine-party",
            wave: agent.inviteWave,
            knowsParty: true,
            attended: true,
          },
        },
      }),
    );
    sequence += 1;
  }

  return events;
}

export const mockSmallvilleCognitiveRun: AgentEvent[] = generateSmallvilleCognitiveRun();
export const mockSmallvilleRoutineRun: AgentEvent[] = generateSmallvilleRoutineRun();
export const mockSmallvilleSocialRun: AgentEvent[] = generateSmallvilleSocialRun();
