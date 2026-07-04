import { describe, expect, it } from "vitest";

import {
  buildAgentAddressableMemoryPlanResult,
  buildPersistentMemoryRecallResult,
} from "../adapters/persistentMemoryAdapter";
import {
  extractPersistentMemoryRecords,
  mergePersistentMemoryRecords,
  retrievePersistentMemoryRecords,
} from "../events/persistentMemory";
import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import {
  loadPersistentMemoryRecords,
  PERSISTENT_MEMORY_STORAGE_KEY,
  savePersistentMemoryRecords,
  type StorageLike,
} from "../state/persistentMemoryStore";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("persistent memory stream", () => {
  it("extracts memory read/write events as durable records", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun,
      "2026-07-04T18:10:00.000Z",
    );

    expect(records).toHaveLength(50);
    expect(records[0]).toMatchObject({
      agentId: "agent-isabella",
      savedAt: "2026-07-04T18:10:00.000Z",
      sourceRunId: "run-smallville-social-001",
      sourceType: "memory_write",
    });
    expect(records.some((record) => record.sourceType === "memory_read")).toBe(true);
    expect(records.some((record) => record.retrievedMemoryIds.length > 0)).toBe(true);
  });

  it("merges records by stable source event identity", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun.slice(0, 12),
      "2026-07-04T18:10:00.000Z",
    );
    const merged = mergePersistentMemoryRecords(
      records,
      [
        {
          ...records[0],
          savedAt: "2026-07-04T18:11:00.000Z",
        },
      ],
    );

    expect(merged).toHaveLength(records.length);
    expect(merged[0]?.savedAt).toBe("2026-07-04T18:11:00.000Z");
  });

  it("round-trips records through versioned storage", () => {
    const storage = new MemoryStorage();
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun.slice(0, 12),
      "2026-07-04T18:10:00.000Z",
    );
    const saveWarnings = savePersistentMemoryRecords(
      storage,
      records,
      "2026-07-04T18:12:00.000Z",
    );
    const loaded = loadPersistentMemoryRecords(storage);

    expect(saveWarnings).toHaveLength(0);
    expect(storage.getItem(PERSISTENT_MEMORY_STORAGE_KEY)).toContain(
      "\"schemaVersion\":1",
    );
    expect(loaded.warnings).toHaveLength(0);
    expect(loaded.records).toEqual(records);
  });

  it("recalls persistent records as canonical AgentEvent evidence", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun.slice(0, 18),
      "2026-07-04T18:10:00.000Z",
    );
    const result = buildPersistentMemoryRecallResult(
      records,
      "2026-07-04T18:20:00.000Z",
    );
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("memory");
    expect(result.warnings).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events).toHaveLength(records.length);
    expect(result.events.every((event) => event.type === "memory_read")).toBe(true);
    expect(result.events[0]?.metadata?.source).toBe("memory");
    expect(result.events[0]?.metadata?.durableMemory).toMatchObject({
      schemaVersion: 1,
      sourceRunId: "run-smallville-social-001",
    });
    expect(finalState.warnings).toHaveLength(0);
    expect(finalState.runSummary.memoryActionCount).toBe(records.length);
  });

  it("retrieves durable records by agent, query relevance, importance, and recency", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun,
      "2026-07-04T18:10:00.000Z",
    );
    const retrieved = retrievePersistentMemoryRecords(records, {
      agentId: "agent-isabella",
      agentName: "Isabella",
      agentRole: "planner",
      currentTimestamp: "2026-07-04T18:30:00.000Z",
      query: "Isabella Valentine's gathering invitation plan",
      limit: 3,
    });

    expect(retrieved).toHaveLength(3);
    expect(retrieved[0]).toMatchObject({
      agentId: "agent-isabella",
      agentAffinityScore: 1,
    });
    expect(retrieved[0]?.score).toBeGreaterThanOrEqual(retrieved[1]?.score ?? 0);
    expect(retrieved.some((memory) => memory.relevanceScore > 0)).toBe(true);
  });

  it("builds an agent-addressable memory plan as replayable AgentEvent evidence", () => {
    const records = extractPersistentMemoryRecords(
      mockSmallvilleSocialRun,
      "2026-07-04T18:10:00.000Z",
    );
    const result = buildAgentAddressableMemoryPlanResult({
      records,
      previousEvents: mockSmallvilleSocialRun,
      now: "2026-07-04T18:30:00.000Z",
    });
    const finalState = replay(result.events, result.events.length - 1);

    expect(result.source).toBe("memory");
    expect(result.warnings).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.events).toHaveLength(75);
    expect(result.events.filter((event) => event.type === "memory_read")).toHaveLength(25);
    expect(result.events.filter((event) => event.type === "thinking")).toHaveLength(25);
    expect(result.events.filter((event) => event.type === "decision")).toHaveLength(25);
    expect(result.events[0]).toMatchObject({
      agentId: "agent-isabella",
      metadata: {
        source: "memory",
        cognitiveStage: "retrieval",
        agentAddressableMemory: expect.objectContaining({
          schemaVersion: 1,
          agentId: "agent-isabella",
          selectedRecordIds: expect.arrayContaining([
            "memory:run-smallville-social-001:social-000",
          ]),
        }),
      },
    });
    expect(result.events[1]?.metadata).toMatchObject({
      cognitiveStage: "reflection",
      derivedFromMemoryIds: expect.arrayContaining([
        "memory:run-smallville-social-001:social-000",
      ]),
    });
    expect(result.events[2]?.metadata).toMatchObject({
      cognitiveStage: "planning",
      planStep: expect.objectContaining({
        goal: "Use persistent memory as agent-local evidence for the next town action.",
      }),
    });
    expect(finalState.warnings).toHaveLength(0);
    expect(finalState.runSummary.memoryActionCount).toBe(25);
    expect(Object.keys(finalState.agents)).toHaveLength(25);
  });

  it("reports an empty memory bank without fabricating events", () => {
    const result = buildPersistentMemoryRecallResult([]);

    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "persistent_memory_empty",
        source: "memory",
      }),
    ]);
  });

  it("reports an empty memory bank for agent-addressable planning", () => {
    const result = buildAgentAddressableMemoryPlanResult({ records: [] });

    expect(result.events).toHaveLength(0);
    expect(result.quarantinedEvents).toHaveLength(0);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "persistent_memory_plan_empty",
        source: "memory",
      }),
    ]);
  });
});
