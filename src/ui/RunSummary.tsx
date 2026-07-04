import type { CSSProperties } from "react";

import {
  selectActiveAgentCount,
  selectFirstBlockedEvent,
  selectFirstErrorEvent,
  selectPreviousEvent,
  selectRelationshipCount,
  selectRunSummary,
  selectTopRelationships,
} from "../events/selectors";
import {
  evaluateSmallvilleRun,
  type SmallvilleCapabilityScore,
} from "../events/smallvilleEvaluation";
import type { AgentEvent, RelationshipState, WorldState } from "../events/types";

type RunSummaryProps = {
  events: readonly AgentEvent[];
  onJumpToEvent: (event: AgentEvent) => void;
  worldState: WorldState;
};

const sectionStyle = {
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(157, 181, 166, 0.2)",
} satisfies CSSProperties;

const titleStyle = {
  margin: "0 0 12px",
  color: "#dce8df",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
} satisfies CSSProperties;

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
} satisfies CSSProperties;

const metricStyle = {
  border: "1px solid rgba(143, 170, 157, 0.22)",
  borderRadius: "6px",
  padding: "8px",
  background: "#101a1d",
} satisfies CSSProperties;

const metricLabelStyle = {
  display: "block",
  color: "#95aaa0",
  fontSize: "11px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const metricValueStyle = {
  display: "block",
  marginTop: "2px",
  color: "#edf6ef",
  fontSize: "17px",
  fontWeight: 750,
  lineHeight: 1.2,
} satisfies CSSProperties;

const shortcutRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8px",
  marginTop: "12px",
} satisfies CSSProperties;

const buttonStyle = {
  minHeight: "34px",
  border: "1px solid rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  background: "#162427",
  color: "#d9e4de",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "left",
  padding: "7px 9px",
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...buttonStyle,
  color: "#8b8b83",
  cursor: "not-allowed",
} satisfies CSSProperties;

const relationshipListStyle = {
  display: "grid",
  gap: "6px",
  marginTop: "12px",
} satisfies CSSProperties;

const relationshipRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "center",
  borderTop: "1px solid rgba(143, 170, 157, 0.16)",
  paddingTop: "7px",
  color: "#d8e2dc",
  fontSize: "12px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const relationshipMetaStyle = {
  color: "#95aaa0",
  fontSize: "11px",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const relationshipStrengthStyle = {
  color: "#edf6ef",
  fontSize: "12px",
  fontWeight: 750,
} satisfies CSSProperties;

const evaluationStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "14px",
  borderTop: "1px solid rgba(143, 170, 157, 0.16)",
  paddingTop: "12px",
} satisfies CSSProperties;

const evaluationHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "end",
} satisfies CSSProperties;

const evaluationTitleStyle = {
  margin: 0,
  color: "#dce8df",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
} satisfies CSSProperties;

const evaluationScoreStyle = {
  color: "#edf6ef",
  fontSize: "22px",
  fontWeight: 800,
  lineHeight: 1,
} satisfies CSSProperties;

const evaluationMetaStyle = {
  color: "#95aaa0",
  fontSize: "11px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const evaluationRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "center",
  color: "#d8e2dc",
  fontSize: "12px",
  lineHeight: 1.35,
} satisfies CSSProperties;

const evaluationStatusStyle = {
  border: "1px solid rgba(143, 170, 157, 0.24)",
  borderRadius: "6px",
  padding: "2px 7px",
  color: "#edf6ef",
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
} satisfies CSSProperties;

function statusLabel(capability: SmallvilleCapabilityScore): string {
  return `${capability.status} ${capability.score}`;
}

const evidencePriority: Record<string, number> = {
  llm_contract: 0,
  routine_schedule: 1,
  relationship_graph: 2,
  social_coordination: 3,
  persistent_memory: 4,
  planning: 5,
  reflection: 6,
  memory_retrieval: 7,
  observation: 8,
  action_conversation: 9,
  agent_identity: 10,
};

function topPassedCapabilities(
  capabilities: readonly SmallvilleCapabilityScore[],
): SmallvilleCapabilityScore[] {
  return [...capabilities]
    .filter((capability) => capability.status === "passed")
    .sort(
      (left, right) =>
        evidencePriority[left.key] - evidencePriority[right.key] ||
        right.score - left.score ||
        right.evidenceCount - left.evidenceCount ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 2);
}

function ShortcutButton({
  event,
  label,
  onJumpToEvent,
}: {
  event?: AgentEvent;
  label: string;
  onJumpToEvent: (event: AgentEvent) => void;
}) {
  return (
    <button
      type="button"
      style={event === undefined ? disabledButtonStyle : buttonStyle}
      disabled={event === undefined}
      onClick={() => {
        if (event !== undefined) {
          onJumpToEvent(event);
        }
      }}
    >
      {label}: {event?.id ?? "none"}
    </button>
  );
}

function formatAgentName(worldState: WorldState, agentId: string): string {
  return worldState.agents[agentId]?.agentName ?? agentId;
}

function RelationshipRow({
  relationship,
  worldState,
}: {
  relationship: RelationshipState;
  worldState: WorldState;
}) {
  const [leftAgentId, rightAgentId] = relationship.agentIds;

  return (
    <div style={relationshipRowStyle}>
      <div>
        <strong>
          {formatAgentName(worldState, leftAgentId)} / {formatAgentName(worldState, rightAgentId)}
        </strong>
        <div style={relationshipMetaStyle}>
          {relationship.lastInteractionKind}; events={relationship.interactionCount}; evidence=
          {relationship.evidenceEventIds.length}
        </div>
      </div>
      <span style={relationshipStrengthStyle}>{relationship.strength}</span>
    </div>
  );
}

export function RunSummary({ events, onJumpToEvent, worldState }: RunSummaryProps) {
  const summary = selectRunSummary(worldState);
  const firstBlockedEvent = selectFirstBlockedEvent(events);
  const firstErrorEvent = selectFirstErrorEvent(events);
  const previousErrorContext = selectPreviousEvent(events, firstErrorEvent?.id);
  const topRelationships = selectTopRelationships(worldState, 4);
  const smallvilleEvaluation = evaluateSmallvilleRun(events, worldState);
  const coveredAblations = smallvilleEvaluation.ablationChecks.filter(
    (check) => check.status !== "missing",
  ).length;
  const topEvidence = topPassedCapabilities(smallvilleEvaluation.capabilityScores);

  const metrics = [
    ["Events", summary.totalEvents],
    ["Agents", selectActiveAgentCount(worldState)],
    ["Relationships", selectRelationshipCount(worldState)],
    ["Handoffs", summary.handoffCount],
    ["Tool calls", summary.toolCallCount],
    ["Memory actions", summary.memoryActionCount],
    ["Blocked", summary.blockedCount],
    ["Errors", summary.errorCount],
  ] as const;

  return (
    <section style={sectionStyle} aria-label="Run summary">
      <h2 style={titleStyle}>Run Summary</h2>
      <div style={metricGridStyle}>
        {metrics.map(([label, value]) => (
          <div key={label} style={metricStyle}>
            <span style={metricLabelStyle}>{label}</span>
            <strong style={metricValueStyle}>{value}</strong>
          </div>
        ))}
      </div>

      {smallvilleEvaluation.isSmallvilleLike ? (
        <div style={evaluationStyle} aria-label="Smallville evaluation">
          <div style={evaluationHeaderStyle}>
            <div>
              <h3 style={evaluationTitleStyle}>Smallville Eval</h3>
              <div style={evaluationMetaStyle}>
                Agents {smallvilleEvaluation.evidenceSummary.agentCount}; events{" "}
                {smallvilleEvaluation.evidenceSummary.eventCount}; relationships{" "}
                {smallvilleEvaluation.evidenceSummary.relationshipCount}
              </div>
            </div>
            <strong style={evaluationScoreStyle}>{smallvilleEvaluation.overallScore}</strong>
          </div>

          <div style={evaluationMetaStyle}>
            Ablations covered {coveredAblations}/{smallvilleEvaluation.ablationChecks.length};
            routine phases {smallvilleEvaluation.evidenceSummary.routinePhaseCount}/6
          </div>

          {topEvidence.length > 0 ? (
            <>
              <div style={evaluationMetaStyle}>Evidence</div>
              {topEvidence.map((capability) => (
                <div key={capability.key} style={evaluationRowStyle}>
                  <span>{capability.label}</span>
                  <span style={evaluationStatusStyle}>{statusLabel(capability)}</span>
                </div>
              ))}
            </>
          ) : null}

          <div style={evaluationMetaStyle}>Gaps</div>
          {smallvilleEvaluation.topGaps.slice(0, 3).map((capability) => (
            <div key={capability.key} style={evaluationRowStyle}>
              <span>{capability.label}</span>
              <span style={evaluationStatusStyle}>{statusLabel(capability)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={shortcutRowStyle} aria-label="Failure shortcuts">
        <ShortcutButton
          event={firstBlockedEvent}
          label="First blocked"
          onJumpToEvent={onJumpToEvent}
        />
        <ShortcutButton
          event={firstErrorEvent}
          label="First error"
          onJumpToEvent={onJumpToEvent}
        />
        <ShortcutButton
          event={previousErrorContext}
          label="Before error"
          onJumpToEvent={onJumpToEvent}
        />
      </div>

      <div style={relationshipListStyle} aria-label="Top relationships">
        {topRelationships.map((relationship) => (
          <RelationshipRow
            key={relationship.relationshipId}
            relationship={relationship}
            worldState={worldState}
          />
        ))}
      </div>
    </section>
  );
}
