import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;

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

function readPort(rawPort) {
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`PORT must be an integer from 0 to 65535, received ${rawPort}.`);
  }

  return port;
}

const rawFilePath =
  process.env.AGENT_TOWN_WORLD_MEMORY_FILE ?? process.argv[2] ?? undefined;

if (rawFilePath === undefined || rawFilePath.trim().length === 0) {
  console.error(
    "AGENT_TOWN_WORLD_MEMORY_FILE or a file path argument is required.",
  );
  process.exit(1);
}

const filePath = resolve(rawFilePath);
const host = process.env.HOST ?? process.env.AGENT_TOWN_WORLD_MEMORY_HOST ?? DEFAULT_HOST;
const port = readPort(
  process.env.PORT ?? process.env.AGENT_TOWN_WORLD_MEMORY_PORT ?? DEFAULT_PORT,
);
const providerLoop = {
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENAI_BASE_URL,
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
  memoriesPerAgent: readOptionalInteger(
    process.env.AGENT_TOWN_PROVIDER_LOOP_MEMORIES_PER_AGENT,
    "AGENT_TOWN_PROVIDER_LOOP_MEMORIES_PER_AGENT",
  ),
  memoryPlanMaxAgents: readOptionalInteger(
    process.env.AGENT_TOWN_PROVIDER_LOOP_MEMORY_PLAN_MAX_AGENTS,
    "AGENT_TOWN_PROVIDER_LOOP_MEMORY_PLAN_MAX_AGENTS",
  ),
  model: process.env.OPENAI_MODEL ?? process.env.AGENT_TOWN_OPENAI_MODEL,
};

const vite = await createViteServer({
  appType: "custom",
  logLevel: "error",
  server: {
    middlewareMode: true,
  },
});

const serverModule = await vite.ssrLoadModule(
  "/src/server/worldMemoryHttpServer.ts",
);
const started = await serverModule.startWorldMemoryHttpServer({
  filePath,
  host,
  port,
  providerLoop,
});

console.log(
  JSON.stringify(
    {
      filePath,
      providerLoop: {
        apiKeyProvided:
          providerLoop.apiKey !== undefined &&
          providerLoop.apiKey.trim().length > 0,
      },
      service: "agent-town-world-memory",
      url: started.url,
    },
    null,
    2,
  ),
);

let closing = false;

async function close(signal) {
  if (closing) {
    return;
  }

  closing = true;

  try {
    await started.close();
    await vite.close();
    console.log(`${signal}: agent-town world memory server stopped.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void close("SIGINT");
});

process.on("SIGTERM", () => {
  void close("SIGTERM");
});
