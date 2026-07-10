import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

const DEFAULT_EVENTS_PER_TICK = 12;
const DEFAULT_TICK_COUNT = 8;
const DEFAULT_TICK_MINUTES = 60;

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
  process.env.AGENT_TOWN_SCHEDULER_OUTPUT === undefined
    ? undefined
    : resolve(process.env.AGENT_TOWN_SCHEDULER_OUTPUT);
const eventLogPath =
  process.env.AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT === undefined
    ? undefined
    : resolve(process.env.AGENT_TOWN_SCHEDULER_EVENTS_OUTPUT);

const vite = await createViteServer({
  appType: "custom",
  logLevel: "error",
  server: {
    middlewareMode: true,
  },
});

try {
  const runnerModule = await vite.ssrLoadModule(
    "/src/server/smallvilleAutonomousSchedulerRunner.ts",
  );
  const result = await runnerModule.runSmallvilleAutonomousScheduler({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    eventLogPath,
    eventsPerTick: readPositiveInteger(
      process.env.AGENT_TOWN_SCHEDULER_EVENTS_PER_TICK,
      "AGENT_TOWN_SCHEDULER_EVENTS_PER_TICK",
      DEFAULT_EVENTS_PER_TICK,
    ),
    host: process.env.AGENT_TOWN_WORLD_MEMORY_HOST ?? "127.0.0.1",
    maxAgents: readOptionalInteger(
      process.env.AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS,
      "AGENT_TOWN_PROVIDER_LOOP_MAX_AGENTS",
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
    scheduleId: process.env.AGENT_TOWN_SCHEDULER_ID,
    startTimestamp: process.env.AGENT_TOWN_SCHEDULER_START,
    tickCount: readPositiveInteger(
      process.env.AGENT_TOWN_SCHEDULER_TICKS,
      "AGENT_TOWN_SCHEDULER_TICKS",
      DEFAULT_TICK_COUNT,
    ),
    tickDelayMs: readOptionalInteger(
      process.env.AGENT_TOWN_SCHEDULER_TICK_DELAY_MS,
      "AGENT_TOWN_SCHEDULER_TICK_DELAY_MS",
    ),
    tickMinutes: readPositiveInteger(
      process.env.AGENT_TOWN_SCHEDULER_TICK_MINUTES,
      "AGENT_TOWN_SCHEDULER_TICK_MINUTES",
      DEFAULT_TICK_MINUTES,
    ),
  });

  console.log(JSON.stringify(result.summary, null, 2));
} finally {
  await vite.close();
}
