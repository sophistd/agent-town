import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildFileWorldMemoryPlanResult,
  buildFileWorldMemoryRecallResult,
  ingestEventsIntoFileWorldMemory,
} from "../adapters/worldMemoryRuntime";
import { mockSmallvilleSocialRun } from "../events/generativeRuntime";
import { replay } from "../events/reducer";
import type { AgentEvent } from "../events/types";

const savedAt = "2026-07-04T18:40:00.000Z";

const nonMemoryEvent: AgentEvent = {
  id: "world-memory-non-memory-000",
  runId: "run-world-memory-runtime-unit",
  taskId: "task-world-memory-runtime-unit",
  timestamp: "2026-07-04T18:00:00.000Z",
  sequence: 0,
  agentId: "agent-isabella",
  agentName: "Isabella",
  agentRole: "planner",
  type: "thinking",
  content: "Isabella inspects the world-memory runtime boundary.",
  locationHint: "archive",
  status: "running",
};

async function withTempMemoryFile<T>(
  run: (filePath: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "agent-town-world-memory-"));

  try {
    return await run(join(directory, "world-memory.json"));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

describe("file world memory runtime", () => {
  it("ingests canonical event memory, then recalls and plans from the same file", async () => {
    await withTempMemoryFile(async (filePath) => {
      const ingestResult = await ingestEventsIntoFileWorldMemory({
        events: mockSmallvilleSocialRun,
        filePath,
        savedAt,
      });
      const recallResult = await buildFileWorldMemoryRecallResult({
        filePath,
        now: "2026-07-04T18:45:00.000Z",
      });
      const planResult = await buildFileWorldMemoryPlanResult({
        filePath,
        now: "2026-07-04T18:50:00.000Z",
        previousEvents: mockSmallvilleSocialRun,
      });
      const finalPlanState = replay(planResult.events, planResult.events.length - 1);

      expect(ingestResult).toMatchObject({
        acceptedEventCount: 150,
        incomingRecordCount: 50,
        persistedRecordCount: 50,
        source: "memory",
      });
      expect(ingestResult.quarantinedEvents).toHaveLength(0);
      expect(ingestResult.warnings).toEqual([
        expect.objectContaining({
          code: "persistent_memory_file_missing",
        }),
      ]);
      expect(recallResult.warnings).toHaveLength(0);
      expect(recallResult.quarantinedEvents).toHaveLength(0);
      expect(recallResult.events).toHaveLength(50);
      expect(recallResult.events.every((event) => event.type === "memory_read")).toBe(
        true,
      );
      expect(planResult.warnings).toHaveLength(0);
      expect(planResult.quarantinedEvents).toHaveLength(0);
      expect(planResult.events).toHaveLength(75);
      expect(finalPlanState.warnings).toHaveLength(0);
      expect(finalPlanState.runSummary.memoryActionCount).toBe(25);
    });
  });

  it("quarantines invalid event input while persisting valid memory events", async () => {
    await withTempMemoryFile(async (filePath) => {
      const validMemoryEvent = mockSmallvilleSocialRun[0];
      const ingestResult = await ingestEventsIntoFileWorldMemory({
        events: [
          validMemoryEvent,
          {
            ...validMemoryEvent,
            id: "",
            sequence: 1,
          },
        ],
        filePath,
        savedAt,
      });
      const recallResult = await buildFileWorldMemoryRecallResult({ filePath });

      expect(ingestResult.acceptedEventCount).toBe(1);
      expect(ingestResult.incomingRecordCount).toBe(1);
      expect(ingestResult.persistedRecordCount).toBe(1);
      expect(ingestResult.quarantinedEvents).toEqual([
        expect.objectContaining({
          code: "invalid_world_memory_ingest_event",
          source: "memory",
        }),
      ]);
      expect(recallResult.events).toHaveLength(1);
      expect(recallResult.events[0]).toMatchObject({
        agentId: validMemoryEvent?.agentId,
        metadata: {
          durableMemory: expect.objectContaining({
            sourceEventId: validMemoryEvent?.id,
          }),
        },
      });
    });
  });

  it("does not create world memory from non-memory events", async () => {
    await withTempMemoryFile(async (filePath) => {
      const ingestResult = await ingestEventsIntoFileWorldMemory({
        events: [nonMemoryEvent],
        filePath,
        savedAt,
      });
      const recallResult = await buildFileWorldMemoryRecallResult({ filePath });

      expect(ingestResult).toMatchObject({
        acceptedEventCount: 1,
        incomingRecordCount: 0,
        persistedRecordCount: 0,
      });
      expect(ingestResult.quarantinedEvents).toHaveLength(0);
      expect(ingestResult.warnings).toEqual([
        expect.objectContaining({
          code: "world_memory_ingest_no_memory_events",
        }),
      ]);
      expect(recallResult.events).toHaveLength(0);
      expect(recallResult.warnings).toEqual([
        expect.objectContaining({
          code: "persistent_memory_file_missing",
        }),
        expect.objectContaining({
          code: "persistent_memory_empty",
        }),
      ]);
    });
  });
});
