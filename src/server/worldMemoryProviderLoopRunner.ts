import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { AdapterQuarantinedEvent, AdapterWarning } from "../adapters/types";
import { parseNativeJsonl } from "../adapters/jsonlAdapter";
import {
  runWorldMemoryProviderLoop,
  type WorldMemoryProviderLoopResult,
} from "../adapters/worldMemoryProviderLoop";
import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import type { AgentEvent } from "../events/types";
import {
  startWorldMemoryHttpServer,
  type StartedWorldMemoryHttpServer,
} from "./worldMemoryHttpServer";

export type WorldMemoryProviderLoopRunnerInput = {
  inputPath: string;
  memoryFilePath: string;
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: OpenAiResponsesFetch;
  host?: string;
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryPlanMaxAgents?: number;
  model?: string;
  now?: string;
  outputPath?: string;
  port?: number;
  savedAt?: string;
};

export type WorldMemoryProviderLoopRunSummary = {
  acceptedInputEventCount: number;
  apiKeyProvided: boolean;
  inputPath: string;
  jsonlQuarantineCodes: string[];
  jsonlWarningCodes: string[];
  memoryFilePath: string;
  memoryPlanEventCount: number;
  providerRecordCount: number;
  providerRequest: {
    memoryRecordCount: number;
    promptHash: string;
    requestId: string;
    retrievalCount: number;
    selectedRecordCount: number;
  };
  providerResult: {
    eventCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
  quarantinedEventCodes: string[];
  recallEventCount: number;
  server: {
    url: string;
  };
  source: "world-memory-provider-loop";
  warningCodes: string[];
  worldMemoryIngest: {
    acceptedEventCount: number;
    incomingRecordCount: number;
    persistedRecordCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
};

export type WorldMemoryProviderLoopRunnerResult = {
  jsonlQuarantinedEvents: AdapterQuarantinedEvent[];
  jsonlWarnings: AdapterWarning[];
  loopResult: WorldMemoryProviderLoopResult;
  summary: WorldMemoryProviderLoopRunSummary;
};

function codes(items: readonly { code: string }[]): string[] {
  return items.map((item) => item.code);
}

function summaryForResult(input: {
  apiKeyProvided: boolean;
  inputPath: string;
  jsonlQuarantinedEvents: readonly AdapterQuarantinedEvent[];
  jsonlWarnings: readonly AdapterWarning[];
  loopResult: WorldMemoryProviderLoopResult;
  memoryFilePath: string;
  server: StartedWorldMemoryHttpServer;
}): WorldMemoryProviderLoopRunSummary {
  return {
    acceptedInputEventCount: input.loopResult.acceptedInputEvents.length,
    apiKeyProvided: input.apiKeyProvided,
    inputPath: input.inputPath,
    jsonlQuarantineCodes: codes(input.jsonlQuarantinedEvents),
    jsonlWarningCodes: codes(input.jsonlWarnings),
    memoryFilePath: input.memoryFilePath,
    memoryPlanEventCount: input.loopResult.memoryPlanResult.events.length,
    providerRecordCount: input.loopResult.providerRecords.length,
    providerRequest: {
      memoryRecordCount: input.loopResult.providerRequest.memory.recordCount,
      promptHash: input.loopResult.providerRequest.promptHash,
      requestId: input.loopResult.providerRequest.requestId,
      retrievalCount: input.loopResult.providerRequest.memory.retrievals.length,
      selectedRecordCount:
        input.loopResult.providerRequest.memory.selectedRecords.length,
    },
    providerResult: {
      eventCount: input.loopResult.providerResult.events.length,
      quarantineCodes: codes(input.loopResult.providerResult.quarantinedEvents),
      warningCodes: codes(input.loopResult.providerResult.warnings),
    },
    quarantinedEventCodes: codes(input.loopResult.quarantinedEvents),
    recallEventCount: input.loopResult.recallResult.events.length,
    server: {
      url: input.server.url,
    },
    source: "world-memory-provider-loop",
    warningCodes: codes(input.loopResult.warnings),
    worldMemoryIngest: {
      acceptedEventCount: input.loopResult.ingestResult.acceptedEventCount,
      incomingRecordCount: input.loopResult.ingestResult.incomingRecordCount,
      persistedRecordCount: input.loopResult.ingestResult.persistedRecordCount,
      quarantineCodes: codes(input.loopResult.ingestResult.quarantinedEvents),
      warningCodes: codes(input.loopResult.ingestResult.warnings),
    },
  };
}

async function writeSummary(
  outputPath: string | undefined,
  summary: WorldMemoryProviderLoopRunSummary,
): Promise<void> {
  if (outputPath === undefined) {
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

export async function runWorldMemoryProviderLoopFromJsonl(
  input: WorldMemoryProviderLoopRunnerInput,
): Promise<WorldMemoryProviderLoopRunnerResult> {
  const rawInput = await readFile(input.inputPath, "utf8");
  const jsonlResult = parseNativeJsonl(rawInput);
  const server = await startWorldMemoryHttpServer({
    filePath: input.memoryFilePath,
    host: input.host ?? "127.0.0.1",
    port: input.port ?? 0,
  });
  const apiKey = input.apiKey?.trim();

  try {
    const loopResult = await runWorldMemoryProviderLoop({
      apiKey,
      baseUrl: input.baseUrl,
      events: jsonlResult.events satisfies readonly AgentEvent[],
      fetchImpl: input.fetchImpl,
      maxAgents: input.maxAgents,
      maxMemoryRecords: input.maxMemoryRecords,
      maxOutputTokens: input.maxOutputTokens,
      maxRecords: input.maxRecords,
      memoriesPerAgent: input.memoriesPerAgent,
      memoryPlanMaxAgents: input.memoryPlanMaxAgents,
      model: input.model,
      now: input.now,
      savedAt: input.savedAt,
      worldMemoryBaseUrl: server.url,
    });
    const summary = summaryForResult({
      apiKeyProvided: apiKey !== undefined && apiKey.length > 0,
      inputPath: input.inputPath,
      jsonlQuarantinedEvents: jsonlResult.quarantinedEvents,
      jsonlWarnings: jsonlResult.warnings,
      loopResult,
      memoryFilePath: input.memoryFilePath,
      server,
    });

    await writeSummary(input.outputPath, summary);

    return {
      jsonlQuarantinedEvents: jsonlResult.quarantinedEvents,
      jsonlWarnings: jsonlResult.warnings,
      loopResult,
      summary,
    };
  } finally {
    await server.close();
  }
}
