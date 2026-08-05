import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import {
  buildFileWorldMemoryPlanResult,
  buildFileWorldMemoryRecallResult,
  ingestEventsIntoFileWorldMemory,
} from "../adapters/worldMemoryRuntime";
import type { OpenAiResponsesFetch } from "../adapters/llmPlannerAdapter";
import type {
  AdapterQuarantinedEvent,
  AdapterWarning,
} from "../adapters/types";
import {
  runWorldMemoryProviderLoop,
  type WorldMemoryProviderLoopResult,
} from "../adapters/worldMemoryProviderLoop";
import type {
  AgentEvent,
  AgentEventSource,
  QuarantinedEvent,
} from "../events/types";
import { validateEventStream } from "../events/validators";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_MAX_BODY_BYTES = 1_000_000;
const WORLD_MEMORY_SOURCE: AgentEventSource = "memory";

export type WorldMemoryHttpServerOptions = {
  filePath: string;
  maxBodyBytes?: number;
  maxRecords?: number;
  now?: () => string;
  providerLoop?: WorldMemoryHttpProviderLoopOptions;
};

export type WorldMemoryHttpServerListenOptions = WorldMemoryHttpServerOptions & {
  host?: string;
  port?: number;
};

export type StartedWorldMemoryHttpServer = {
  close: () => Promise<void>;
  server: Server;
  url: string;
};

export type WorldMemoryHttpProviderLoopOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: OpenAiResponsesFetch;
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  memoryPlanMaxAgents?: number;
  memoriesPerAgent?: number;
  model?: string;
};

export type WorldMemoryProviderLoopHttpSummary = {
  acceptedInputEventCount: number;
  apiKeyProvided: boolean;
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
  source: "world-memory-provider-loop-http";
  warningCodes: string[];
  worldMemoryBaseUrl: string;
  worldMemoryIngest: {
    acceptedEventCount: number;
    incomingRecordCount: number;
    persistedRecordCount: number;
    quarantineCodes: string[];
    warningCodes: string[];
  };
};

export type WorldMemoryProviderLoopHttpResult = {
  events: AgentEvent[];
  memoryPlanEvents: AgentEvent[];
  quarantinedEvents: AdapterQuarantinedEvent[];
  recallEvents: AgentEvent[];
  summary: WorldMemoryProviderLoopHttpSummary;
  warnings: AdapterWarning[];
};

type ActiveWorldMemoryHttpServerOptions = WorldMemoryHttpServerOptions & {
  selfBaseUrl?: () => string | undefined;
};

type JsonSuccess<T> = {
  data: T;
  ok: true;
};

type JsonFailure = {
  error: {
    code: string;
    message: string;
  };
  ok: false;
};

class WorldMemoryHttpError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function now(options: WorldMemoryHttpServerOptions): string {
  return options.now?.() ?? new Date().toISOString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "unknown world-memory server error";
}

function writeJson<T>(
  response: ServerResponse,
  statusCode: number,
  body: JsonSuccess<T> | JsonFailure,
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function allowedCorsOrigin(origin: string | undefined): string | undefined {
  if (origin === undefined || origin.trim().length === 0) {
    return undefined;
  }

  try {
    const url = new URL(origin);

    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]")
    ) {
      return origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function applyCorsHeaders(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const origin = allowedCorsOrigin(request.headers.origin);

  if (origin === undefined) {
    return;
  }

  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("vary", "origin");
}

function okNoContent(response: ServerResponse): void {
  response.statusCode = 204;
  response.end();
}

function ok<T>(response: ServerResponse, data: T): void {
  writeJson(response, 200, { data, ok: true });
}

function fail(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
): void {
  writeJson(response, statusCode, {
    error: { code, message },
    ok: false,
  });
}

function readOptionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new WorldMemoryHttpError(
    400,
    "invalid_world_memory_request",
    `${key} must be a non-empty string when provided.`,
  );
}

function rejectRequestSecrets(body: Record<string, unknown>): void {
  const secretKeys = ["apiKey", "openAiApiKey", "OPENAI_API_KEY"];
  const providedSecretKey = secretKeys.find((key) => body[key] !== undefined);

  if (providedSecretKey === undefined) {
    return;
  }

  throw new WorldMemoryHttpError(
    400,
    "world_memory_provider_loop_secret_in_request",
    `${providedSecretKey} is not accepted in provider-loop request bodies. Configure provider credentials in the local/server environment instead.`,
  );
}

function readOptionalPositiveInteger(
  body: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  if (Number.isInteger(value) && Number(value) > 0) {
    return Number(value);
  }

  throw new WorldMemoryHttpError(
    400,
    "invalid_world_memory_request",
    `${key} must be a positive integer when provided.`,
  );
}

function readEvents(body: Record<string, unknown>, key: string): readonly unknown[] {
  const value = body[key];

  if (Array.isArray(value)) {
    return value;
  }

  throw new WorldMemoryHttpError(
    400,
    "invalid_world_memory_request",
    `${key} must be an array of event-shaped objects.`,
  );
}

function readOptionalEvents(
  body: Record<string, unknown>,
  key: string,
): readonly unknown[] | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  throw new WorldMemoryHttpError(
    400,
    "invalid_world_memory_request",
    `${key} must be an array of event-shaped objects when provided.`,
  );
}

function quarantinePlanContextEvent(
  event: QuarantinedEvent,
): AdapterQuarantinedEvent {
  return {
    ...event,
    code: "invalid_world_memory_plan_context_event",
    source: WORLD_MEMORY_SOURCE,
  };
}

async function readJsonBody(
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    totalBytes += buffer.byteLength;

    if (totalBytes > maxBodyBytes) {
      throw new WorldMemoryHttpError(
        413,
        "world_memory_request_too_large",
        `Request body exceeds ${maxBodyBytes} bytes.`,
      );
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (raw.trim().length === 0) {
    throw new WorldMemoryHttpError(
      400,
      "invalid_world_memory_request",
      "A JSON request body is required.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new WorldMemoryHttpError(
      400,
      "invalid_world_memory_json",
      `Request body is not valid JSON: ${errorMessage(error)}.`,
    );
  }

  if (!isRecord(parsed)) {
    throw new WorldMemoryHttpError(
      400,
      "invalid_world_memory_request",
      "Request body must be a JSON object.",
    );
  }

  return parsed;
}

function requestUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", "http://127.0.0.1");
}

function requestOrigin(request: IncomingMessage): string {
  const host = request.headers.host;

  if (host === undefined || host.trim().length === 0) {
    throw new WorldMemoryHttpError(
      400,
      "invalid_world_memory_request",
      "Host header is required for provider-loop self calls.",
    );
  }

  return `http://${host}`;
}

function worldMemoryBaseUrl(
  request: IncomingMessage,
  options: ActiveWorldMemoryHttpServerOptions,
): string {
  return options.selfBaseUrl?.() ?? requestOrigin(request);
}

function codes(items: readonly { code: string }[]): string[] {
  return items.map((item) => item.code);
}

function providerLoopSummary(input: {
  apiKeyProvided: boolean;
  loopResult: WorldMemoryProviderLoopResult;
  memoryFilePath: string;
  worldMemoryBaseUrl: string;
}): WorldMemoryProviderLoopHttpSummary {
  return {
    acceptedInputEventCount: input.loopResult.acceptedInputEvents.length,
    apiKeyProvided: input.apiKeyProvided,
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
    source: "world-memory-provider-loop-http",
    warningCodes: codes(input.loopResult.warnings),
    worldMemoryBaseUrl: input.worldMemoryBaseUrl,
    worldMemoryIngest: {
      acceptedEventCount: input.loopResult.ingestResult.acceptedEventCount,
      incomingRecordCount: input.loopResult.ingestResult.incomingRecordCount,
      persistedRecordCount: input.loopResult.ingestResult.persistedRecordCount,
      quarantineCodes: codes(input.loopResult.ingestResult.quarantinedEvents),
      warningCodes: codes(input.loopResult.ingestResult.warnings),
    },
  };
}

async function handleIngest(
  request: IncomingMessage,
  response: ServerResponse,
  options: WorldMemoryHttpServerOptions,
): Promise<void> {
  const body = await readJsonBody(
    request,
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  );
  const result = await ingestEventsIntoFileWorldMemory({
    events: readEvents(body, "events"),
    filePath: options.filePath,
    maxRecords:
      readOptionalPositiveInteger(body, "maxRecords") ?? options.maxRecords,
    savedAt: readOptionalString(body, "savedAt") ?? now(options),
  });

  ok(response, result);
}

async function handleRecall(
  request: IncomingMessage,
  response: ServerResponse,
  options: WorldMemoryHttpServerOptions,
): Promise<void> {
  const url = requestUrl(request);
  const result = await buildFileWorldMemoryRecallResult({
    filePath: options.filePath,
    now: url.searchParams.get("now") ?? undefined,
  });

  ok(response, result);
}

async function handlePlan(
  request: IncomingMessage,
  response: ServerResponse,
  options: WorldMemoryHttpServerOptions,
): Promise<void> {
  const body = await readJsonBody(
    request,
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  );
  const previousEventsInput = readOptionalEvents(body, "previousEvents");
  const previousEvents =
    previousEventsInput === undefined
      ? undefined
      : validateEventStream(previousEventsInput);
  const result = await buildFileWorldMemoryPlanResult({
    filePath: options.filePath,
    maxAgents: readOptionalPositiveInteger(body, "maxAgents"),
    memoriesPerAgent: readOptionalPositiveInteger(body, "memoriesPerAgent"),
    now: readOptionalString(body, "now"),
    previousEvents: previousEvents?.events,
  });

  ok(response, {
    ...result,
    quarantinedEvents: [
      ...result.quarantinedEvents,
      ...(previousEvents?.quarantinedEvents.map(quarantinePlanContextEvent) ?? []),
    ],
  });
}

async function handleProviderLoop(
  request: IncomingMessage,
  response: ServerResponse,
  options: ActiveWorldMemoryHttpServerOptions,
): Promise<void> {
  const body = await readJsonBody(
    request,
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  );

  rejectRequestSecrets(body);

  const providerLoopOptions = options.providerLoop ?? {};
  const apiKey = providerLoopOptions.apiKey?.trim();
  const baseUrl = worldMemoryBaseUrl(request, options);
  const requestNow = readOptionalString(body, "now") ?? now(options);
  const loopResult = await runWorldMemoryProviderLoop({
    apiKey,
    baseUrl: providerLoopOptions.baseUrl,
    events: readEvents(body, "events"),
    fetchImpl: providerLoopOptions.fetchImpl,
    maxAgents:
      readOptionalPositiveInteger(body, "maxAgents") ??
      providerLoopOptions.maxAgents,
    maxMemoryRecords:
      readOptionalPositiveInteger(body, "maxMemoryRecords") ??
      providerLoopOptions.maxMemoryRecords,
    maxOutputTokens:
      readOptionalPositiveInteger(body, "maxOutputTokens") ??
      providerLoopOptions.maxOutputTokens,
    maxRecords:
      readOptionalPositiveInteger(body, "maxRecords") ?? options.maxRecords,
    memoriesPerAgent:
      readOptionalPositiveInteger(body, "memoriesPerAgent") ??
      providerLoopOptions.memoriesPerAgent,
    memoryPlanMaxAgents:
      readOptionalPositiveInteger(body, "memoryPlanMaxAgents") ??
      providerLoopOptions.memoryPlanMaxAgents,
    model: readOptionalString(body, "model") ?? providerLoopOptions.model,
    now: requestNow,
    savedAt: readOptionalString(body, "savedAt") ?? requestNow,
    worldMemoryBaseUrl: baseUrl,
  });
  const summary = providerLoopSummary({
    apiKeyProvided: apiKey !== undefined && apiKey.length > 0,
    loopResult,
    memoryFilePath: options.filePath,
    worldMemoryBaseUrl: baseUrl,
  });
  const result: WorldMemoryProviderLoopHttpResult = {
    events: loopResult.providerResult.events,
    memoryPlanEvents: loopResult.memoryPlanResult.events,
    quarantinedEvents: loopResult.quarantinedEvents,
    recallEvents: loopResult.recallResult.events,
    summary,
    warnings: loopResult.warnings,
  };

  ok(response, result);
}

export function createWorldMemoryHttpServer(
  options: WorldMemoryHttpServerOptions,
): Server {
  const activeOptions: ActiveWorldMemoryHttpServerOptions = options;

  return createServer((request, response) => {
    void (async () => {
      applyCorsHeaders(request, response);

      const url = requestUrl(request);
      const method = request.method ?? "GET";

      if (method === "OPTIONS") {
        okNoContent(response);
        return;
      }

      if (method === "GET" && url.pathname === "/health") {
        ok(response, {
          filePath: options.filePath,
          service: "agent-town-world-memory",
        });
        return;
      }

      if (method === "POST" && url.pathname === "/memory/ingest") {
        await handleIngest(request, response, options);
        return;
      }

      if (method === "GET" && url.pathname === "/memory/recall") {
        await handleRecall(request, response, options);
        return;
      }

      if (method === "POST" && url.pathname === "/memory/plan") {
        await handlePlan(request, response, options);
        return;
      }

      if (method === "POST" && url.pathname === "/provider-loop") {
        await handleProviderLoop(request, response, activeOptions);
        return;
      }

      fail(
        response,
        404,
        "world_memory_route_not_found",
        `${method} ${url.pathname} is not a world-memory server route.`,
      );
    })().catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }

      if (error instanceof WorldMemoryHttpError) {
        fail(response, error.statusCode, error.code, error.message);
        return;
      }

      fail(
        response,
        500,
        "world_memory_server_error",
        errorMessage(error),
      );
    });
  });
}

function listenUrl(server: Server, host: string): string {
  const address = server.address();

  if (typeof address === "object" && address !== null) {
    const addressInfo: AddressInfo = address;
    const hostname =
      addressInfo.address === "::" || addressInfo.address === "0.0.0.0"
        ? host
        : addressInfo.address;

    return `http://${hostname}:${addressInfo.port}`;
  }

  return `http://${host}:${DEFAULT_PORT}`;
}

export async function startWorldMemoryHttpServer(
  options: WorldMemoryHttpServerListenOptions,
): Promise<StartedWorldMemoryHttpServer> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  let serverUrl: string | undefined;
  const activeOptions: ActiveWorldMemoryHttpServerOptions = {
    ...options,
    selfBaseUrl: () => serverUrl,
  };
  const server = createWorldMemoryHttpServer(activeOptions);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      reject(error);
    };

    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolve();
    });
  });

  serverUrl = listenUrl(server, host);

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    server,
    url: serverUrl,
  };
}
