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

export type SmallvilleBelievabilityCriterionKey =
  | "identity_continuity"
  | "experience_action_chain"
  | "memory_grounding"
  | "social_propagation"
  | "routine_continuity"
  | "adaptive_response"
  | "spatial_continuity"
  | "reviewability";

export type SmallvilleBelievabilityScore = 0 | 1 | 2 | 3 | 4;

export type SmallvilleBelievabilityCriterion = {
  key: SmallvilleBelievabilityCriterionKey;
  label: string;
  question: string;
  status: SmallvilleEvaluationStatus;
  score: SmallvilleBelievabilityScore;
  evidenceCount: number;
  targetCount: number;
  evidenceEventIds: string[];
  evidenceAgentIds: string[];
  finding: string;
  remainingRisk: string;
};

export type SmallvilleHumanReviewRubric = {
  scale: Record<SmallvilleBelievabilityScore, string>;
  overallScore: number;
  criteria: SmallvilleBelievabilityCriterion[];
  topReviewGaps: SmallvilleBelievabilityCriterion[];
  summary: string;
};

export type SmallvilleEvaluationReport = {
  isSmallvilleLike: boolean;
  overallScore: number;
  capabilityScores: SmallvilleCapabilityScore[];
  ablationChecks: SmallvilleAblationCheck[];
  topGaps: SmallvilleCapabilityScore[];
  humanReviewRubric: SmallvilleHumanReviewRubric;
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
const BELIEVABILITY_SCALE: Record<SmallvilleBelievabilityScore, string> = {
  0: "No auditable event evidence.",
  1: "Isolated event evidence; reviewer cannot follow a believable chain.",
  2: "Several event facts exist, but continuity is incomplete or narrow.",
  3: "Review-ready continuity across agents, memory, place, or social state.",
  4: "Strong town-scale evidence with clear event IDs and replay-derived state.",
};
const COMPLETE_EXPERIENCE_STAGES = [
  "observation",
  "retrieval",
  "reflection",
  "planning",
  "action",
] as const;

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

function eventStage(event: AgentEvent): string | undefined {
  const cognitiveStage = event.metadata?.cognitiveStage;

  if (typeof cognitiveStage === "string") {
    if (cognitiveStage === "conversation") {
      return "action";
    }

    return cognitiveStage;
  }

  if (event.type === "memory_read") {
    return "retrieval";
  }

  if (event.type === "memory_write") {
    return "observation";
  }

  if (event.type === "decision") {
    return "planning";
  }

  return isActionOrConversationEvent(event) ? "action" : undefined;
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

function statusForBelievabilityScore(
  score: SmallvilleBelievabilityScore,
): SmallvilleEvaluationStatus {
  if (score <= 0) {
    return "missing";
  }

  return score >= 3 ? "passed" : "partial";
}

function scoreForCoverage(
  evidenceCount: number,
  targetCount: number,
): SmallvilleBelievabilityScore {
  if (evidenceCount <= 0) {
    return 0;
  }

  if (targetCount <= 0) {
    return 4;
  }

  const ratio = evidenceCount / targetCount;

  if (ratio >= 1) {
    return 4;
  }

  if (ratio >= 0.75) {
    return 3;
  }

  if (ratio >= 0.4) {
    return 2;
  }

  return 1;
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

function sortEvents(events: readonly AgentEvent[]): AgentEvent[] {
  return [...events].sort((left, right) => {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }

    return left.id.localeCompare(right.id);
  });
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function evidenceEvents(
  events: readonly AgentEvent[],
  predicate: (event: AgentEvent) => boolean,
  limit = 8,
): AgentEvent[] {
  return sortEvents(events).filter(predicate).slice(0, limit);
}

function eventIds(events: readonly AgentEvent[]): string[] {
  return events.map((event) => event.id);
}

function eventAgentIds(events: readonly AgentEvent[]): string[] {
  return uniqueSorted(events.map((event) => event.agentId));
}

function recordArrayField(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArrayField(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasRetrievedMemoryEvidence(event: AgentEvent): boolean {
  return recordArrayField(event.metadata?.retrievedMemories).length > 0;
}

function hasDerivedMemoryEvidence(event: AgentEvent): boolean {
  return stringArrayField(event.metadata?.derivedFromMemoryIds).length > 0;
}

function hasExecutedMemoryEvidence(event: AgentEvent): boolean {
  return typeof event.metadata?.executedPlanMemoryId === "string";
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

function isActionOrConversationEvent(event: AgentEvent): boolean {
  return (
    event.type === "message" ||
    event.type === "handoff" ||
    event.type === "tool_call" ||
    event.metadata?.cognitiveStage === "action" ||
    event.metadata?.cognitiveStage === "conversation"
  );
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

function agentsWithExperienceChain(events: readonly AgentEvent[]): Set<string> {
  const stagesByAgentId = new Map<string, Set<string>>();

  for (const event of events) {
    if (!hasSmallvilleEvidence(event)) {
      continue;
    }

    const stage = eventStage(event);
    if (stage === undefined) {
      continue;
    }

    const stages = stagesByAgentId.get(event.agentId) ?? new Set<string>();
    stages.add(stage);
    stagesByAgentId.set(event.agentId, stages);
  }

  const completeAgentIds = new Set<string>();

  for (const [agentId, stages] of stagesByAgentId) {
    if (COMPLETE_EXPERIENCE_STAGES.every((stage) => stages.has(stage))) {
      completeAgentIds.add(agentId);
    }
  }

  return completeAgentIds;
}

function memoryGroundedAgentIds(events: readonly AgentEvent[]): Set<string> {
  const memoryEvidenceByAgentId = new Map<
    string,
    { retrieved: boolean; derived: boolean; executed: boolean; durable: boolean }
  >();

  for (const event of events) {
    const current = memoryEvidenceByAgentId.get(event.agentId) ?? {
      retrieved: false,
      derived: false,
      executed: false,
      durable: false,
    };

    memoryEvidenceByAgentId.set(event.agentId, {
      retrieved: current.retrieved || hasRetrievedMemoryEvidence(event),
      derived: current.derived || hasDerivedMemoryEvidence(event),
      executed: current.executed || hasExecutedMemoryEvidence(event),
      durable:
        current.durable ||
        event.metadata?.durableMemory !== undefined ||
        event.metadata?.agentAddressableMemory !== undefined,
    });
  }

  const groundedAgentIds = new Set<string>();

  for (const [agentId, evidence] of memoryEvidenceByAgentId) {
    if (evidence.retrieved && (evidence.derived || evidence.executed || evidence.durable)) {
      groundedAgentIds.add(agentId);
    }
  }

  return groundedAgentIds;
}

function ablationStatus(evidenceCount: number, strongThreshold = 1): SmallvilleEvaluationStatus {
  if (evidenceCount <= 0) {
    return "missing";
  }

  return evidenceCount >= strongThreshold ? "passed" : "partial";
}

function makeBelievabilityCriterion(input: {
  key: SmallvilleBelievabilityCriterionKey;
  label: string;
  question: string;
  score: SmallvilleBelievabilityScore;
  evidenceCount: number;
  targetCount: number;
  evidenceEvents: readonly AgentEvent[];
  evidenceAgentIds?: readonly string[];
  finding: string;
  remainingRisk: string;
}): SmallvilleBelievabilityCriterion {
  return {
    key: input.key,
    label: input.label,
    question: input.question,
    status: statusForBelievabilityScore(input.score),
    score: input.score,
    evidenceCount: input.evidenceCount,
    targetCount: input.targetCount,
    evidenceEventIds: eventIds(input.evidenceEvents),
    evidenceAgentIds: uniqueSorted(input.evidenceAgentIds ?? eventAgentIds(input.evidenceEvents)),
    finding: input.finding,
    remainingRisk: input.remainingRisk,
  };
}

function buildHumanReviewRubric(input: {
  events: readonly AgentEvent[];
  worldState: WorldState;
  targetAgents: number;
  capabilityScores: readonly SmallvilleCapabilityScore[];
  ablationChecks: readonly SmallvilleAblationCheck[];
}): SmallvilleHumanReviewRubric {
  const { events, worldState, targetAgents } = input;
  const smallvilleEvents = events.filter(hasSmallvilleEvidence);
  const personaEvents = events.filter((event) => typeof event.metadata?.persona === "string");
  const personaAgentIds = new Set(personaEvents.map((event) => event.agentId));
  const completeChainAgentIds = agentsWithExperienceChain(events);
  const memoryAgentIds = memoryGroundedAgentIds(events);
  const informedAgentIds = socialInformedAgentIds(events);
  const routinePhases = countRoutinePhases(events);
  const adaptiveRevisionIds = adaptiveRoutineRevisionIds(events);
  const relationshipCount = Object.keys(worldState.relationships).length;
  const socialEvents = events.filter((event) => socialDiffusionFor(event) !== undefined);
  const routineEvents = events.filter((event) => isRecord(event.metadata?.routine));
  const adaptiveEvents = events.filter(
    (event) =>
      isRecord(event.metadata?.intervention) ||
      isRecord(event.metadata?.routineConflict) ||
      isRecord(event.metadata?.routineRevision) ||
      event.metadata?.llmPlanner !== undefined,
  );
  const spatialEvents = smallvilleEvents.filter(
    (event) =>
      event.locationHint !== undefined &&
      event.locationHint !== "unknown" &&
      typeof event.metadata?.subLocationId === "string",
  );
  const nonMissingCapabilities = input.capabilityScores.filter(
    (capability) => capability.status !== "missing",
  );
  const nonMissingAblations = input.ablationChecks.filter((check) => check.status !== "missing");

  const criteria = [
    makeBelievabilityCriterion({
      key: "identity_continuity",
      label: "Identity continuity",
      question: "Can a reviewer recognize stable agents with personas, roles, and repeated evidence?",
      score: scoreForCoverage(personaAgentIds.size, targetAgents),
      evidenceCount: personaAgentIds.size,
      targetCount: targetAgents,
      evidenceEvents: evidenceEvents(events, (event) => typeof event.metadata?.persona === "string"),
      evidenceAgentIds: [...personaAgentIds],
      finding:
        personaAgentIds.size > 0
          ? `${personaAgentIds.size}/${targetAgents} target agents expose persona evidence in canonical events.`
          : "No persona evidence is available for human identity review.",
      remainingRisk:
        "Persona evidence is metadata-level continuity; it is not yet a free-form interview or diary study.",
    }),
    makeBelievabilityCriterion({
      key: "experience_action_chain",
      label: "Experience-to-action chain",
      question:
        "Can a reviewer trace observation, retrieval, reflection, planning, and action for the same agents?",
      score: scoreForCoverage(completeChainAgentIds.size, targetAgents),
      evidenceCount: completeChainAgentIds.size,
      targetCount: targetAgents,
      evidenceEvents: evidenceEvents(
        events,
        (event) => completeChainAgentIds.has(event.agentId) && eventStage(event) !== undefined,
      ),
      evidenceAgentIds: [...completeChainAgentIds],
      finding:
        completeChainAgentIds.size > 0
          ? `${completeChainAgentIds.size}/${targetAgents} target agents have a complete event-derived cognitive chain.`
          : "No agent has the full observation-to-action chain required for believable review.",
      remainingRisk:
        "The chain proves traceability, not that an outside human would judge the content natural.",
    }),
    makeBelievabilityCriterion({
      key: "memory_grounding",
      label: "Memory grounding",
      question: "Can plans and actions be audited back to retrieved or durable memories?",
      score: scoreForCoverage(memoryAgentIds.size, targetAgents),
      evidenceCount: memoryAgentIds.size,
      targetCount: targetAgents,
      evidenceEvents: evidenceEvents(
        events,
        (event) =>
          memoryAgentIds.has(event.agentId) &&
          (hasRetrievedMemoryEvidence(event) ||
            hasDerivedMemoryEvidence(event) ||
            hasExecutedMemoryEvidence(event) ||
            event.metadata?.agentAddressableMemory !== undefined ||
            event.metadata?.durableMemory !== undefined),
      ),
      evidenceAgentIds: [...memoryAgentIds],
      finding:
        memoryAgentIds.size > 0
          ? `${memoryAgentIds.size}/${targetAgents} target agents connect retrieval to derived or executed memory evidence.`
          : "No retrieval-to-plan memory chain is available.",
      remainingRisk:
        "Memory ranking is deterministic evidence; persistent provider-backed recall still needs external runtime proof.",
    }),
    makeBelievabilityCriterion({
      key: "social_propagation",
      label: "Social propagation",
      question: "Does social information spread through relationships instead of appearing globally?",
      score: scoreForCoverage(Math.max(informedAgentIds.size, relationshipCount), targetAgents),
      evidenceCount: Math.max(informedAgentIds.size, relationshipCount),
      targetCount: targetAgents,
      evidenceEvents: evidenceEvents(events, (event) => socialDiffusionFor(event) !== undefined),
      evidenceAgentIds: [...informedAgentIds],
      finding:
        socialEvents.length > 0
          ? `${informedAgentIds.size} agents carry social diffusion evidence and replay derives ${relationshipCount} relationships.`
          : "No social diffusion evidence is present.",
      remainingRisk:
        "Social spread is fixture/provider event evidence, not an empirical emergent-behavior benchmark.",
    }),
    makeBelievabilityCriterion({
      key: "routine_continuity",
      label: "Routine continuity",
      question: "Can a reviewer follow a day-scale routine instead of isolated actions?",
      score: scoreForCoverage(routinePhases.size, ROUTINE_PHASES.length),
      evidenceCount: routinePhases.size,
      targetCount: ROUTINE_PHASES.length,
      evidenceEvents: evidenceEvents(events, (event) => isRecord(event.metadata?.routine)),
      finding:
        routinePhases.size > 0
          ? `${routinePhases.size}/${ROUTINE_PHASES.length} routine phases are present in event metadata.`
          : "No day-scale routine phases are available.",
      remainingRisk:
        "Routine phases are bounded and deterministic; longer unsupervised days remain future work.",
    }),
    makeBelievabilityCriterion({
      key: "adaptive_response",
      label: "Adaptive response",
      question: "Do agents change behavior from interventions, conflicts, or planner output?",
      score: scoreForCoverage(
        adaptiveRevisionIds.size + adaptiveEvents.length,
        Math.max(1, Math.min(targetAgents, 8)),
      ),
      evidenceCount: adaptiveRevisionIds.size + adaptiveEvents.length,
      targetCount: Math.max(1, Math.min(targetAgents, 8)),
      evidenceEvents: evidenceEvents(
        events,
        (event) =>
          isRecord(event.metadata?.intervention) ||
          isRecord(event.metadata?.routineConflict) ||
          isRecord(event.metadata?.routineRevision) ||
          event.metadata?.llmPlanner !== undefined,
      ),
      finding:
        adaptiveEvents.length > 0
          ? `${adaptiveEvents.length} events show intervention, conflict, routine revision, or planner adaptation evidence.`
          : "No intervention or adaptation evidence is present.",
      remainingRisk:
        "Adaptation evidence is inspected after replay; live provider-backed autonomy is still gated separately.",
    }),
    makeBelievabilityCriterion({
      key: "spatial_continuity",
      label: "Spatial continuity",
      question: "Can behavior be reviewed as movement through stable town places?",
      score: scoreForCoverage(
        spatialEvents.length,
        Math.max(1, Math.min(smallvilleEvents.length, targetAgents * 3)),
      ),
      evidenceCount: spatialEvents.length,
      targetCount: Math.max(1, Math.min(smallvilleEvents.length, targetAgents * 3)),
      evidenceEvents: evidenceEvents(
        events,
        (event) =>
          hasSmallvilleEvidence(event) &&
          event.locationHint !== undefined &&
          event.locationHint !== "unknown" &&
          typeof event.metadata?.subLocationId === "string",
      ),
      finding:
        spatialEvents.length > 0
          ? `${spatialEvents.length} Smallville-like events have stable location and sub-location evidence.`
          : "No stable town-location evidence is available for spatial review.",
      remainingRisk:
        "Spatial continuity is event-derived; Phaser/Tiled objects still cannot create runtime facts.",
    }),
    makeBelievabilityCriterion({
      key: "reviewability",
      label: "Reviewability",
      question: "Can a reviewer see both evidence and gaps without reading renderer state?",
      score: scoreForCoverage(
        nonMissingCapabilities.length + nonMissingAblations.length,
        input.capabilityScores.length + input.ablationChecks.length,
      ),
      evidenceCount: nonMissingCapabilities.length + nonMissingAblations.length,
      targetCount: input.capabilityScores.length + input.ablationChecks.length,
      evidenceEvents: evidenceEvents(events, hasSmallvilleEvidence),
      finding:
        nonMissingCapabilities.length > 0
          ? `${nonMissingCapabilities.length} capability rows and ${nonMissingAblations.length} ablation rows expose auditable evidence or gaps.`
          : "The run has no Smallville-oriented evaluator evidence.",
      remainingRisk:
        "This is a deterministic review rubric, not a completed human-subject evaluation.",
    }),
  ];
  const overallScore =
    criteria.length === 0
      ? 0
      : Math.round(
          (criteria.reduce((total, criterion) => total + criterion.score, 0) /
            (criteria.length * 4)) *
            100,
        );
  const topReviewGaps = criteria
    .filter((criterion) => criterion.status !== "passed")
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.evidenceCount - right.evidenceCount ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 4);
  const passedCount = criteria.filter((criterion) => criterion.status === "passed").length;

  return {
    scale: BELIEVABILITY_SCALE,
    overallScore,
    criteria,
    topReviewGaps,
    summary: `${passedCount}/${criteria.length} human-review criteria are review-ready from canonical event evidence.`,
  };
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
    isActionOrConversationEvent,
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
  const ablationChecks: SmallvilleAblationCheck[] = [
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
  ];

  return {
    isSmallvilleLike: smallvilleLikeEventCount > 0,
    overallScore,
    capabilityScores,
    ablationChecks,
    topGaps,
    humanReviewRubric: buildHumanReviewRubric({
      events,
      worldState,
      targetAgents,
      capabilityScores,
      ablationChecks,
    }),
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
