import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

const DEFAULT_BATCH_SIZE = 30;

function readOptionalInteger(rawValue, name) {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return undefined;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, received ${rawValue}.`);
  }

  return value;
}

function readPositiveInteger(rawValue, name, fallback) {
  const value = readOptionalInteger(rawValue, name) ?? fallback;

  if (value <= 0) {
    throw new Error(`${name} must be a positive integer, received ${value}.`);
  }

  return value;
}

function readScenario(rawValue) {
  const scenario = rawValue ?? "social";

  if (!["cognitive", "routine", "social"].includes(scenario)) {
    throw new Error(
      `AGENT_TOWN_RUNTIME_STREAM_SCENARIO must be cognitive, routine, or social; received ${scenario}.`,
    );
  }

  return scenario;
}

const rawMemoryFilePath =
  process.env.AGENT_TOWN_WORLD_MEMORY_FILE ?? process.argv[2] ?? undefined;

if (rawMemoryFilePath === undefined || rawMemoryFilePath.trim().length === 0) {
  console.error(
    "AGENT_TOWN_WORLD_MEMORY_FILE or a memory file path argument is required.",
  );
  process.exit(1);
}

const memoryFilePath = resolve(rawMemoryFilePath);
const outputPath =
  process.env.AGENT_TOWN_RUNTIME_STREAM_OUTPUT === undefined
    ? undefined
    : resolve(process.env.AGENT_TOWN_RUNTIME_STREAM_OUTPUT);
const eventLogPath =
  process.env.AGENT_TOWN_RUNTIME_STREAM_EVENTS_OUTPUT === undefined
    ? undefined
    : resolve(process.env.AGENT_TOWN_RUNTIME_STREAM_EVENTS_OUTPUT);

const vite = await createViteServer({
  appType: "custom",
  logLevel: "error",
  server: {
    middlewareMode: true,
  },
});

try {
  const runnerModule = await vite.ssrLoadModule(
    "/src/server/smallvilleExternalRuntimeStreamRunner.ts",
  );
  const result = await runnerModule.runSmallvilleExternalRuntimeStream({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    batchSize: readPositiveInteger(
      process.env.AGENT_TOWN_RUNTIME_STREAM_BATCH_SIZE,
      "AGENT_TOWN_RUNTIME_STREAM_BATCH_SIZE",
      DEFAULT_BATCH_SIZE,
    ),
    eventLogPath,
    host: process.env.AGENT_TOWN_WORLD_MEMORY_HOST ?? "127.0.0.1",
    maxAgents: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS,
      "AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS",
    ),
    maxEvents: readOptionalInteger(
      process.env.AGENT_TOWN_RUNTIME_STREAM_MAX_EVENTS,
      "AGENT_TOWN_RUNTIME_STREAM_MAX_EVENTS",
    ),
    maxMemoryRecords: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS,
      "AGENT_TOWN_PROVIDER_LOOP_MAX_MEMORY_RECORDS",
    ),
    maxOutputTokens: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MAX_OUTPUT_TOKENS,
      "AGENT_TOWN_PROVIDER_LOOP_MAX_OUTPUT_TOKENS",
    ),
    maxRecords: readOptionalInteger(
      process.env.AGENT_TOWN_WORLD_MEMORY_MAX_RECORDS,
      "AGENT_TOWN_WORLD_MEMORY_MAX_RECORDS",
    ),
    memoriesPerAgent: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MEMORIES_PER_AGENT,
      "AGENT_TOWN_PROVIDER_LOOP_MEMORIES_PER_AGENT",
    ),
    memoryFilePath,
    memoryPlanMaxAgents: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MEMORY_PLAN_MAX_AGENTS,
      "AGENT_TOWN_PROVIDER_LOOP_MEMORY_PLAN_MAX_AGENTS",
    ),
    model: process.env.OPENAI_MODEL ?? process.env.AGENT_TOWN_OPENAI_MODEL,
    outputPath,
    port: readOptionalInteger(
      process.env.AGENT_TOWN_WORLD_MEMORY_PORT,
      "AGENT_TOWN_WORLD_MEMORY_PORT",
    ),
    scenario: readScenario(process.env.AGENT_TOWN_RUNTIME_STREAM_SCENARIO),
    startTimestamp: process.env.AGENT_TOWN_RUNTIME_STREAM_START,
    tickMinutes: readPositiveInteger(
      process.env.AGENT_TOWN_RUNTIME_STREAM_TICK_MINUTES,
      "AGENT_TOWN_RUNTIME_STREAM_TICK_MINUTES",
      1,
    ),
  });

  console.log(JSON.stringify(result.summary, null, 2));
} finally {
  await vite.close();
}
