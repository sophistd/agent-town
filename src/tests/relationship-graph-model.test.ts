import { describe, expect, it } from "vitest";

import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import {
  buildRelationshipGraphRows,
  buildRelationshipGraphSummary,
  DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
  type RelationshipGraphKindFilterMap,
} from "../ui/relationshipGraphModel";

const allKindsOff: RelationshipGraphKindFilterMap = {
  declared: false,
  diffusion: false,
  handoff: false,
  message: false,
};

describe("relationship graph projection model", () => {
  it("builds sorted rows with resolved evidence events", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);
    const rows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
      query: "",
      selectedOnly: false,
    });

    expect(rows.length).toBeGreaterThanOrEqual(25);
    expect(rows[0]?.latestEvidenceEvent?.id).toBe(rows[0]?.relationship.lastEventId);
    expect(rows[0]?.kindCounts.length).toBeGreaterThan(0);

    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1]?.relationship.strength).toBeGreaterThanOrEqual(
        rows[index]?.relationship.strength ?? 0,
      );
    }
  });

  it("filters by relationship kind, selected agent, and query text", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);
    const allRows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
      query: "",
      selectedOnly: false,
    });
    const selectedAgentId = allRows[0]?.relationship.agentIds[0];

    expect(selectedAgentId).toBeDefined();

    const messageRows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: {
        ...allKindsOff,
        message: true,
      },
      query: "",
      selectedOnly: false,
    });

    expect(messageRows.length).toBeGreaterThan(0);
    expect(messageRows.every((row) => row.relationship.messageCount > 0)).toBe(true);

    const selectedRows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
      query: "",
      selectedAgentId,
      selectedOnly: true,
    });

    expect(selectedRows.length).toBeGreaterThan(0);
    expect(
      selectedRows.every((row) => row.relationship.agentIds.includes(selectedAgentId ?? "")),
    ).toBe(true);

    const queryRows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
      query: allRows[0]?.relationship.relationshipId ?? "",
      selectedOnly: false,
    });

    expect(queryRows.map((row) => row.relationship.relationshipId)).toEqual([
      allRows[0]?.relationship.relationshipId,
    ]);
  });

  it("summarizes visible and selected relationship counts", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);
    const rows = buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
      kindFilters: DEFAULT_RELATIONSHIP_GRAPH_KIND_FILTERS,
      query: "",
      selectedOnly: false,
    });
    const selectedAgentId = rows[0]?.relationship.agentIds[0];
    const summary = buildRelationshipGraphSummary(state, rows, selectedAgentId);

    expect(summary.totalRelationships).toBe(Object.keys(state.relationships).length);
    expect(summary.visibleRelationships).toBe(rows.length);
    expect(summary.totalEvidenceRefs).toBeGreaterThan(0);
    expect(summary.selectedRelationships).toBeGreaterThan(0);
  });

  it("returns no rows when every relationship kind is disabled", () => {
    const state = replay(mockSmallvilleSocialRun, mockSmallvilleSocialRun.length - 1);

    expect(
      buildRelationshipGraphRows(state, mockSmallvilleSocialRun, {
        kindFilters: allKindsOff,
        query: "",
        selectedOnly: false,
      }),
    ).toEqual([]);
  });
});
