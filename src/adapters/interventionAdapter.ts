import { validateEventStream } from "../events/validators";
import type {
  AgentEvent,
  AgentLocation,
  AgentRole,
} from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
  AgentEventAdapter,
} from "./types";

const INTERVENTION_SOURCE = "intervention";
const DEFAULT_INTERVENTION_TIMESTAMP = "2026-07-04T17:00:00.000Z";

type InterventionAgent = {
  id: string;
  name: string;
  role: AgentRole;
  location: AgentLocation;
  subLocationId: string;
  activity: string;
};

type InterventionIntent = {
  id: string;
  label: string;
  lead: InterventionAgent;
  target: InterventionAgent;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  keywords: string[];
};

type ProjectionTarget = {
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
};

export type NaturalLanguageInterventionInput = {
  prompt: string;
  previousEvents?: readonly AgentEvent[];
  now?: string;
};

const isabella: InterventionAgent = {
  id: "agent-isabella",
  name: "Isabella",
  role: "planner",
  location: "town_hall",
  subLocationId: "town_hall_table",
  activity: "coordinates intervention",
};

const klaus: InterventionAgent = {
  id: "agent-klaus",
  name: "Klaus",
  role: "researcher",
  location: "library",
  subLocationId: "library_reading_nook",
  activity: "grounds intervention",
};

const maria: InterventionAgent = {
  id: "agent-maria",
  name: "Maria",
  role: "coder",
  location: "workshop",
  subLocationId: "workshop_debug_desk",
  activity: "implements intervention",
};

const sam: InterventionAgent = {
  id: "agent-sam",
  name: "Sam",
  role: "reviewer",
  location: "review_room",
  subLocationId: "review_evidence_wall",
  activity: "checks intervention",
};

const mei: InterventionAgent = {
  id: "agent-mei",
  name: "Mei",
  role: "memory",
  location: "archive",
  subLocationId: "archive_writing_desk",
  activity: "records intervention",
};

const interventionIntents: readonly InterventionIntent[] = [
  {
    id: "memory_update",
    label: "preserve a durable memory",
    lead: mei,
    target: isabella,
    locationHint: "archive",
    subLocationId: "archive_writing_desk",
    activity: "writes memory",
    keywords: ["memory", "remember", "preserve", "archive", "record", "recall"],
  },
  {
    id: "research_check",
    label: "verify the intervention with reference evidence",
    lead: klaus,
    target: sam,
    locationHint: "library",
    subLocationId: "library_reading_nook",
    activity: "checks reference",
    keywords: ["research", "library", "paper", "reference", "verify", "read"],
  },
  {
    id: "implementation_change",
    label: "turn the intervention into projection work",
    lead: maria,
    target: sam,
    locationHint: "workshop",
    subLocationId: "workshop_debug_desk",
    activity: "updates runtime",
    keywords: ["build", "code", "implement", "workshop", "fix", "runtime", "tool"],
  },
  {
    id: "acceptance_review",
    label: "test the intervention against acceptance evidence",
    lead: sam,
    target: mei,
    locationHint: "review_room",
    subLocationId: "review_evidence_wall",
    activity: "reviews proof",
    keywords: ["review", "evidence", "acceptance", "test", "prove", "risk"],
  },
  {
    id: "social_coordination",
    label: "coordinate a visible town response",
    lead: isabella,
    target: mei,
    locationHint: "square",
    subLocationId: "square_fountain_edge",
    activity: "coordinates town",
    keywords: ["party", "gather", "meet", "invite", "square", "fountain", "social"],
  },
];

function quarantineIntervention(input: unknown, message: string): AdapterQuarantinedEvent {
  return {
    code: "invalid_intervention_prompt",
    input,
    issues: [{ path: "prompt", message }],
    source: INTERVENTION_SOURCE,
  };
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return slug.length > 0 ? slug : "intervention";
}

function promptHash(input: string): string {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

function timestampAt(startTimestamp: string, sequence: number): string {
  const start = new Date(startTimestamp);
  start.setUTCMinutes(start.getUTCMinutes() + sequence);

  return start.toISOString();
}

function scoreIntent(prompt: string, intent: InterventionIntent): number {
  const normalized = prompt.toLowerCase();

  return intent.keywords.reduce(
    (score, keyword) => score + (normalized.includes(keyword) ? 1 : 0),
    0,
  );
}

function inferIntent(prompt: string): InterventionIntent {
  return [...interventionIntents].sort((left, right) => {
    const scoreDiff = scoreIntent(prompt, right) - scoreIntent(prompt, left);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.id.localeCompare(right.id);
  })[0] ?? interventionIntents[0];
}

function inferProjectionTarget(prompt: string, intent: InterventionIntent): ProjectionTarget {
  const normalized = prompt.toLowerCase();

  if (/\b(library|book|reading|research)\b/.test(normalized)) {
    return {
      locationHint: "library",
      subLocationId: "library_reading_nook",
      activity: "changes library plan",
    };
  }

  if (/\b(workshop|build|code|implement|runtime)\b/.test(normalized)) {
    return {
      locationHint: "workshop",
      subLocationId: "workshop_debug_desk",
      activity: "changes runtime plan",
    };
  }

  if (/\b(archive|memory|remember|preserve)\b/.test(normalized)) {
    return {
      locationHint: "archive",
      subLocationId: "archive_writing_desk",
      activity: "preserves memory",
    };
  }

  if (/\b(review|evidence|acceptance|test|prove)\b/.test(normalized)) {
    return {
      locationHint: "review_room",
      subLocationId: "review_evidence_wall",
      activity: "checks evidence",
    };
  }

  if (/\b(dispatch|announce|notice|invite)\b/.test(normalized)) {
    return {
      locationHint: "dispatch_board",
      subLocationId: "dispatch_notice_wall",
      activity: "updates notice",
    };
  }

  return {
    locationHint: intent.locationHint,
    subLocationId: intent.subLocationId,
    activity: intent.activity,
  };
}

function summarizePreviousEvents(previousEvents: readonly AgentEvent[] | undefined): {
  previousRunId?: string;
  previousEventCount: number;
  previousMemoryActionCount: number;
  previousAgentCount: number;
  recentMemoryIds: string[];
  recentEventIds: string[];
} {
  const events = previousEvents ?? [];
  const recentMemoryEvents = events
    .filter((event) => event.type === "memory_read" || event.type === "memory_write")
    .slice(-3);

  return {
    previousRunId: events[0]?.runId,
    previousEventCount: events.length,
    previousMemoryActionCount: events.filter(
      (event) => event.type === "memory_read" || event.type === "memory_write",
    ).length,
    previousAgentCount: new Set(events.map((event) => event.agentId)).size,
    recentMemoryIds: recentMemoryEvents.map((event) => event.id),
    recentEventIds: events.slice(-3).map((event) => event.id),
  };
}

function makeInterventionEvent(input: {
  runId: string;
  taskId: string;
  timestamp: string;
  sequence: number;
  agent: InterventionAgent;
  type: AgentEvent["type"];
  summary: string;
  content: string;
  locationHint: AgentLocation;
  subLocationId: string;
  activity: string;
  targetAgent?: InterventionAgent;
  status?: AgentEvent["status"];
  toolName?: string;
  toolInput?: unknown;
  toolOutputSummary?: string;
  metadata: Record<string, unknown>;
}): AgentEvent {
  return {
    id: `${input.runId}-${String(input.sequence).padStart(2, "0")}`,
    runId: input.runId,
    taskId: input.taskId,
    timestamp: timestampAt(input.timestamp, input.sequence),
    sequence: input.sequence,
    agentId: input.agent.id,
    agentName: input.agent.name,
    agentRole: input.agent.role,
    type: input.type,
    content: input.content,
    summary: input.summary,
    targetAgentId: input.targetAgent?.id,
    targetTaskId: input.taskId,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutputSummary: input.toolOutputSummary,
    locationHint: input.locationHint,
    status: input.status ?? "running",
    metadata: {
      source: INTERVENTION_SOURCE,
      tags: [
        "natural-language-intervention",
        String(input.metadata.cognitiveStage),
        input.subLocationId,
      ],
      subLocationId: input.subLocationId,
      activity: input.activity,
      ...input.metadata,
    },
  };
}

export function parseNaturalLanguageIntervention(
  input: NaturalLanguageInterventionInput,
): AdapterResult {
  const prompt = input.prompt.trim();

  if (prompt.length === 0) {
    return {
      events: [],
      quarantinedEvents: [
        quarantineIntervention(input, "intervention prompt must not be empty."),
      ],
      source: INTERVENTION_SOURCE,
      warnings: [],
    };
  }

  const intent = inferIntent(prompt);
  const projectionTarget = inferProjectionTarget(prompt, intent);
  const prior = summarizePreviousEvents(input.previousEvents);
  const promptSlug = slugify(prompt);
  const runId = `run-intervention-${promptHash(prompt)}-${promptSlug}`;
  const taskId = `task-intervention-${intent.id}`;
  const startTimestamp =
    input.now !== undefined && !Number.isNaN(Date.parse(input.now))
      ? input.now
      : DEFAULT_INTERVENTION_TIMESTAMP;
  const sharedMetadata = {
    cognitiveStage: "intervention",
    intervention: {
      source: "user",
      prompt,
      intentId: intent.id,
      intent: intent.label,
      leadAgentId: intent.lead.id,
      targetAgentId: intent.target.id,
      targetLocation: projectionTarget.locationHint,
      targetSubLocationId: projectionTarget.subLocationId,
      previousRunId: prior.previousRunId,
      previousEventCount: prior.previousEventCount,
      previousMemoryActionCount: prior.previousMemoryActionCount,
      previousAgentCount: prior.previousAgentCount,
      recentMemoryIds: prior.recentMemoryIds,
      recentEventIds: prior.recentEventIds,
      generatedBy: "deterministic-intervention-adapter",
    },
  };
  const events = [
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 0,
      agent: intent.lead,
      type: "memory_write",
      summary: "Receive user intervention",
      content: `${intent.lead.name} records a user intervention: ${prompt}`,
      locationHint: intent.lead.location,
      subLocationId: intent.lead.subLocationId,
      activity: "receives intervention",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "observation",
        memoryKind: "observation",
        memoryId: `${runId}-memory-observation`,
        importance: 10,
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 1,
      agent: mei,
      type: "memory_read",
      summary: "Retrieve prior run context",
      content: `Mei retrieves ${prior.previousMemoryActionCount} memory actions from ${prior.previousRunId ?? "no prior run"} before the town changes course.`,
      locationHint: "archive",
      subLocationId: "archive_shelves",
      activity: "retrieves prior context",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "retrieval",
        retrievalQuery: prompt,
        retrievedMemories: prior.recentMemoryIds.map((memoryId, index) => ({
          memoryId,
          content: `Prior event ${memoryId} is relevant to the new intervention.`,
          score: 1 - index * 0.08,
          relevanceScore: 1,
          recencyScore: 1 - index * 0.08,
          importanceScore: 0.8,
        })),
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 2,
      agent: intent.lead,
      type: "thinking",
      summary: "Reflect on intervention",
      content: `${intent.lead.name} reflects that the user intervention should ${intent.label}.`,
      locationHint: intent.lead.location,
      subLocationId: intent.lead.subLocationId,
      activity: "reflects on intervention",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "reflection",
        derivedFromMemoryIds: prior.recentMemoryIds,
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 3,
      agent: intent.lead,
      type: "decision",
      summary: "Plan intervention response",
      content: `${intent.lead.name} decides to route the intervention to ${intent.target.name} at ${projectionTarget.subLocationId}.`,
      locationHint: "town_hall",
      subLocationId: "town_hall_table",
      activity: "plans intervention",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "planning",
        planStep: {
          goal: intent.label,
          nextAction: `Ask ${intent.target.name} to enact the intervention.`,
          targetAgentId: intent.target.id,
          expectedLocation: projectionTarget.subLocationId,
        },
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 4,
      agent: intent.lead,
      type: "message",
      summary: "Route intervention",
      content: `${intent.lead.name} tells ${intent.target.name}: ${prompt}`,
      locationHint: intent.lead.location,
      subLocationId: intent.lead.subLocationId,
      activity: "routes intervention",
      targetAgent: intent.target,
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "conversation",
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 5,
      agent: intent.target,
      type: "tool_call",
      summary: "Apply intervention plan",
      content: `${intent.target.name} applies the natural-language intervention through the canonical event pipeline.`,
      locationHint: projectionTarget.locationHint,
      subLocationId: projectionTarget.subLocationId,
      activity: projectionTarget.activity,
      toolName: "apply_natural_language_intervention",
      toolInput: {
        prompt,
        intentId: intent.id,
        previousRunId: prior.previousRunId,
      },
      toolOutputSummary: "Intervention normalized into AgentEvent evidence.",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "action",
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 6,
      agent: intent.target,
      type: "done",
      summary: "Target acknowledges intervention",
      content: `${intent.target.name} acknowledges the intervention at ${projectionTarget.subLocationId}.`,
      locationHint: projectionTarget.locationHint,
      subLocationId: projectionTarget.subLocationId,
      activity: "acknowledges intervention",
      status: "done",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "closure",
      },
    }),
    makeInterventionEvent({
      runId,
      taskId,
      timestamp: startTimestamp,
      sequence: 7,
      agent: intent.lead,
      type: "done",
      summary: "Close intervention loop",
      content: `${intent.lead.name} closes the intervention loop with prior memory, plan, action, and response visible.`,
      locationHint: projectionTarget.locationHint,
      subLocationId: projectionTarget.subLocationId,
      activity: "closes intervention",
      status: "done",
      metadata: {
        ...sharedMetadata,
        cognitiveStage: "closure",
      },
    }),
  ];
  const validation = validateEventStream(events);
  const quarantinedEvents: AdapterQuarantinedEvent[] = validation.quarantinedEvents.map(
    (event) => ({
      ...event,
      code: "invalid_generated_intervention_event",
      source: INTERVENTION_SOURCE,
    }),
  );
  const warnings: AdapterWarning[] = [];

  return {
    events: validation.events,
    quarantinedEvents,
    source: INTERVENTION_SOURCE,
    warnings,
  };
}

export const naturalLanguageInterventionAdapter: AgentEventAdapter<
  NaturalLanguageInterventionInput
> = {
  source: INTERVENTION_SOURCE,
  parse: parseNaturalLanguageIntervention,
};
