import type { AgentEvent, WorldState } from "./types";

export type SmallvilleCapabilityKey =
  | "agent_identity"
  | "observation"
  | "memory_retrieval"
  | "reflection"
  | "planning"
  | "action_conversation"
  | "social_coordination"
  | "relationship_graph"
  | "routine_schedule"
  | "adaptive_routine"
  | "persistent_memory"
  | "llm_contract";

export type SmallvilleEvaluationStatus = "passed" | "partial" | "missing";

export type SmallvilleCapabilityScore = {
  key: SmallvilleCapabilityKey;
  label: string;
  status: SmallvilleEvaluationStatus;
  score: number;
  evidenceCount: number;
  targetCount: number;
  summary: string;
};

export type SmallvilleAblationCheck = {
  component: string;
  status: SmallvilleEvaluationStatus;
  evidenceCount: number;
  impact: string;
};

export type SmallvilleEvaluationReport = {
  isSmallvilleLike: boolean;
  overallScore: number;
  capabilityScores: SmallvilleCapabilityScore[];
  ablationChecks: SmallvilleAblationCheck[];
  topGaps: SmallvilleCapabilityScore[];
  evidenceSummary: {
    agentCount: number;
    eventCount: number;
    relationshipCount: number;
    socialInformedAgentCount: number;
    routinePhaseCount: number;
    adaptiveRoutineRevisionCount: number;
  };
};

const ROUTINE_PHASES = ["wake", "retrieve", "work", "plan", "act", "close"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function metadataTags(event: AgentEvent): string[] {
  const tags = event.metadata?.tags;

  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === "string");
}

function hasSmallvilleEvidence(event: AgentEvent): boolean {
  return (
    metadataTags(event).some((tag) => tag.startsWith("smallville")) ||
    event.metadata?.cognitiveStage !== undefined ||
    event.metadata?.socialDiffusion !== undefined ||
    event.metadata?.routine !== undefined ||
    event.metadata?.routineConflict !== undefined ||
    event.metadata?.routineRevision !== undefined ||
    event.metadata?.agentAddressableMemory !== undefined ||
    event.metadata?.llmPlanner !== undefined
  );
}

function countEvents(
  events: readonly AgentEvent[],
  predicate: (event: AgentEvent) => boolean,
): number {
  return events.filter(predicate).length;
}

function countCognitiveStage(events: readonly AgentEvent[], stage: string): number {
  return countEvents(events, (event) => event.metadata?.cognitiveStage === stage);
}

function statusForRatio(evidenceCount: number, targetCount: number): SmallvilleEvaluationStatus {
  if (evidenceCount <= 0) {
    return "missing";
  }

  if (targetCount <= 0 || evidenceCount >= targetCount) {
    return "passed";
  }

  return "partial";
}

function scoreForRatio(evidenceCount: number, targetCount: number): number {
  if (evidenceCount <= 0) {
    return 0;
  }

  if (targetCount <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((evidenceCount / targetCount) * 100));
}

function makeCapability(input: {
  key: SmallvilleCapabilityKey;
  label: string;
  evidenceCount: number;
  targetCount: number;
  summary: string;
}): SmallvilleCapabilityScore {
  return {
    ...input,
    score: scoreForRatio(input.evidenceCount, input.targetCount),
    status: statusForRatio(input.evidenceCount, input.targetCount),
  };
}

function countRoutinePhases(events: readonly AgentEvent[]): Set<string> {
  const phases = new Set<string>();

  for (const event of events) {
    const routine = event.metadata?.routine;
    if (!isRecord(routine)) {
      continue;
    }

    const phase = routine.phase;
    if (typeof phase === "string" && ROUTINE_PHASES.includes(phase as (typeof ROUTINE_PHASES)[number])) {
      phases.add(phase);
    }
  }

  return phases;
}

function socialInformedAgentIds(events: readonly AgentEvent[]): Set<string> {
  const agentIds = new Set<string>();

  for (const event of events) {
    const diffusion = event.metadata?.socialDiffusion;
    if (!isRecord(diffusion)) {
      continue;
    }

    if (diffusion.knowsParty === true || diffusion.attended === true) {
      agentIds.add(event.agentId);
    }
  }

  return agentIds;
}

function socialDiffusionFor(event: AgentEvent): Record<string, unknown> | undefined {
  const diffusion = event.metadata?.socialDiffusion;

  return isRecord(diffusion) ? diffusion : undefined;
}

function adaptiveRoutineRevisionIds(events: readonly AgentEvent[]): Set<string> {
  const revisionIds = new Set<string>();

  for (const event of events) {
    const revision = event.metadata?.routineRevision;

    if (!isRecord(revision)) {
      continue;
    }

    const revisionId = revision.revisionId;
    if (typeof revisionId === "string" && revisionId.length > 0) {
      revisionIds.add(revisionId);
    }
  }

  return revisionIds;
}

function ablationStatus(evidenceCount: number, strongThreshold = 1): SmallvilleEvaluationStatus {
  if (evidenceCount <= 0) {
    return "missing";
  }

  return evidenceCount >= strongThreshold ? "passed" : "partial";
}

export function evaluateSmallvilleRun(
  events: readonly AgentEvent[],
  worldState: WorldState,
): SmallvilleEvaluationReport {
  const agentIds = new Set(events.map((event) => event.agentId));
  const agentCount = agentIds.size;
  const targetAgents = Math.max(1, Math.min(agentCount, 25));
  const smallvilleLikeEventCount = countEvents(events, hasSmallvilleEvidence);
  const relationshipCount = Object.keys(worldState.relationships).length;
  const observationCount = countCognitiveStage(events, "observation");
  const retrievalCount =
    countCognitiveStage(events, "retrieval") + countEvents(events, (event) => event.type === "memory_read");
  const reflectionCount = countCognitiveStage(events, "reflection");
  const planningCount =
    countCognitiveStage(events, "planning") + countEvents(events, (event) => event.type === "decision");
  const actionConversationCount = countEvents(
    events,
    (event) =>
      event.type === "message" ||
      event.type === "handoff" ||
      event.type === "tool_call" ||
      event.metadata?.cognitiveStage === "action" ||
      event.metadata?.cognitiveStage === "conversation",
  );
  const informedAgentIds = socialInformedAgentIds(events);
  const invitationMessageCount = countEvents(
    events,
    (event) => event.type === "message" && socialDiffusionFor(event)?.eventId === "valentine-party",
  );
  const routinePhases = countRoutinePhases(events);
  const adaptiveRevisionIds = adaptiveRoutineRevisionIds(events);
  const durableMemoryCount = countEvents(
    events,
    (event) =>
      event.metadata?.durableMemory !== undefined ||
      event.metadata?.agentAddressableMemory !== undefined,
  );
  const llmPlannerCount = countEvents(events, (event) => event.metadata?.llmPlanner !== undefined);
  const personaCount = countEvents(events, (event) => typeof event.metadata?.persona === "string");

  const capabilityScores = [
    makeCapability({
      key: "agent_identity",
      label: "Agent identity",
      evidenceCount: Math.max(personaCount, agentCount),
      targetCount: targetAgents,
      summary: "Personas, roles, and agent identities are represented as event evidence.",
    }),
    makeCapability({
      key: "observation",
      label: "Observation",
      evidenceCount: observationCount,
      targetCount: targetAgents,
      summary: "Observation-stage events seed memory and later behavior.",
    }),
    makeCapability({
      key: "memory_retrieval",
      label: "Memory retrieval",
      evidenceCount: retrievalCount,
      targetCount: targetAgents,
      summary: "Retrieval evidence is present before reflection or planning.",
    }),
    makeCapability({
      key: "reflection",
      label: "Reflection",
      evidenceCount: reflectionCount,
      targetCount: targetAgents,
      summary: "Reflection events synthesize retrieved memories into higher-level context.",
    }),
    makeCapability({
      key: "planning",
      label: "Planning",
      evidenceCount: planningCount,
      targetCount: targetAgents,
      summary: "Planning events choose next actions and projection targets.",
    }),
    makeCapability({
      key: "action_conversation",
      label: "Action/conversation",
      evidenceCount: actionConversationCount,
      targetCount: targetAgents,
      summary: "Agents act, converse, hand off, or call tools through canonical events.",
    }),
    makeCapability({
      key: "social_coordination",
      label: "Social coordination",
      evidenceCount: Math.max(informedAgentIds.size, invitationMessageCount),
      targetCount: targetAgents,
      summary: "Social information spreads through invitation or attendance evidence.",
    }),
    makeCapability({
      key: "relationship_graph",
      label: "Relationship graph",
      evidenceCount: relationshipCount,
      targetCount: targetAgents,
      summary: "Replay derives stable relationship state from canonical event evidence.",
    }),
    makeCapability({
      key: "routine_schedule",
      label: "Routine schedule",
      evidenceCount: routinePhases.size,
      targetCount: ROUTINE_PHASES.length,
      summary: "Routine evidence covers wake, retrieval, work, planning, action, and closure phases.",
    }),
    makeCapability({
      key: "adaptive_routine",
      label: "Adaptive routine",
      evidenceCount: adaptiveRevisionIds.size,
      targetCount: targetAgents,
      summary: "Routine plans revise from observation and memory evidence before action.",
    }),
    makeCapability({
      key: "persistent_memory",
      label: "Persistent memory",
      evidenceCount: durableMemoryCount,
      targetCount: targetAgents,
      summary: "Durable memory evidence returns through adapters as canonical events.",
    }),
    makeCapability({
      key: "llm_contract",
      label: "LLM contract",
      evidenceCount: llmPlannerCount,
      targetCount: Math.max(1, Math.min(8, events.length)),
      summary: "Model-shaped planner output is parsed and quarantined before replay.",
    }),
  ];

  const scoredCapabilities = capabilityScores.filter((capability) => capability.targetCount > 0);
  const overallScore =
    scoredCapabilities.length === 0
      ? 0
      : Math.round(
          scoredCapabilities.reduce((total, capability) => total + capability.score, 0) /
            scoredCapabilities.length,
        );
  const topGaps = capabilityScores
    .filter((capability) => capability.status !== "passed")
    .sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))
    .slice(0, 4);

  return {
    isSmallvilleLike: smallvilleLikeEventCount > 0,
    overallScore,
    capabilityScores,
    ablationChecks: [
      {
        component: "Observation",
        status: ablationStatus(observationCount, targetAgents),
        evidenceCount: observationCount,
        impact: "Without observations, the run has no experience stream to retrieve or reflect on.",
      },
      {
        component: "Retrieval",
        status: ablationStatus(retrievalCount, targetAgents),
        evidenceCount: retrievalCount,
        impact: "Without retrieval, plans cannot be grounded in remembered context.",
      },
      {
        component: "Reflection",
        status: ablationStatus(reflectionCount, targetAgents),
        evidenceCount: reflectionCount,
        impact: "Without reflection, the run lacks higher-level synthesis from memory.",
      },
      {
        component: "Planning",
        status: ablationStatus(planningCount, targetAgents),
        evidenceCount: planningCount,
        impact: "Without planning, actions are not decomposed into inspectable next steps.",
      },
      {
        component: "Relationship graph",
        status: ablationStatus(relationshipCount, targetAgents),
        evidenceCount: relationshipCount,
        impact: "Without relationships, social diffusion cannot be audited as event-derived structure.",
      },
      {
        component: "Routine schedule",
        status: ablationStatus(routinePhases.size, ROUTINE_PHASES.length),
        evidenceCount: routinePhases.size,
        impact: "Without routines, the town cannot show day-scale behavioral continuity.",
      },
      {
        component: "Adaptive routine",
        status: ablationStatus(adaptiveRevisionIds.size, targetAgents),
        evidenceCount: adaptiveRevisionIds.size,
        impact: "Without adaptive revision, schedules remain scripted and cannot respond to new observations.",
      },
      {
        component: "LLM planner contract",
        status: ablationStatus(llmPlannerCount),
        evidenceCount: llmPlannerCount,
        impact: "Without the contract, future provider-backed behavior has no parser or quarantine gate.",
      },
    ],
    topGaps,
    evidenceSummary: {
      agentCount,
      eventCount: events.length,
      relationshipCount,
      socialInformedAgentCount: informedAgentIds.size,
      routinePhaseCount: routinePhases.size,
      adaptiveRoutineRevisionCount: adaptiveRevisionIds.size,
    },
  };
}
