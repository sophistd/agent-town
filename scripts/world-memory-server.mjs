import { resolve } from "node:path";

import { createServer as createViteServer } from "vite";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;

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
});

console.log(
  JSON.stringify(
    {
      filePath,
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
