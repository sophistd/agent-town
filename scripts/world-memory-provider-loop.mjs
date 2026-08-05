import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

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

const rawInputPath =
  process.env.AGENT_TOWN_PROVIDER_LOOP_INPUT ?? process.argv[2] ?? undefined;
const rawMemoryFilePath =
  process.env.AGENT_TOWN_WORLD_MEMORY_FILE ?? process.argv[3] ?? undefined;

if (rawInputPath === undefined || rawInputPath.trim().length === 0) {
  console.error(
    "AGENT_TOWN_PROVIDER_LOOP_INPUT or an input JSONL path argument is required.",
  );
  process.exit(1);
}

if (rawMemoryFilePath === undefined || rawMemoryFilePath.trim().length === 0) {
  console.error(
    "AGENT_TOWN_WORLD_MEMORY_FILE or a memory file path argument is required.",
  );
  process.exit(1);
}

const inputPath = resolve(rawInputPath);
const memoryFilePath = resolve(rawMemoryFilePath);
const outputPath =
  process.env.AGENT_TOWN_PROVIDER_LOOP_OUTPUT === undefined
    ? undefined
    : resolve(process.env.AGENT_TOWN_PROVIDER_LOOP_OUTPUT);

const vite = await createViteServer({
  appType: "custom",
  logLevel: "error",
  server: {
    middlewareMode: true,
  },
});

try {
  const runnerModule = await vite.ssrLoadModule(
    "/src/server/worldMemoryProviderLoopRunner.ts",
  );
  const result = await runnerModule.runWorldMemoryProviderLoopFromJsonl({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    host: process.env.AGENT_TOWN_WORLD_MEMORY_HOST ?? "127.0.0.1",
    inputPath,
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
    now: process.env.AGENT_TOWN_PROVIDER_LOOP_NOW,
    outputPath,
    port: readOptionalInteger(
      process.env.AGENT_TOWN_WORLD_MEMORY_PORT,
      "AGENT_TOWN_WORLD_MEMORY_PORT",
    ),
    savedAt: process.env.AGENT_TOWN_PROVIDER_LOOP_SAVED_AT,
  });

  console.log(JSON.stringify(result.summary, null, 2));
} finally {
  await vite.close();
}
