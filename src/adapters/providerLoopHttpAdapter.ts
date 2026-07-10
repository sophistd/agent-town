import { validateEventStream } from "../events/validators";
import type { AgentEvent } from "../events/types";
import type {
  AdapterQuarantinedEvent,
  AdapterResult,
  AdapterWarning,
} from "./types";

const PROVIDER_LOOP_HTTP_SOURCE = "custom";

export type ProviderLoopHttpFetchResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
};

export type ProviderLoopHttpFetch = (
  input: string | URL,
  init?: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
  },
) => Promise<ProviderLoopHttpFetchResponse>;

export type ProviderLoopHttpInput = {
  events: readonly AgentEvent[];
  fetchImpl?: ProviderLoopHttpFetch;
  maxAgents?: number;
  maxMemoryRecords?: number;
  maxOutputTokens?: number;
  maxRecords?: number;
  memoriesPerAgent?: number;
  memoryPlanMaxAgents?: number;
  model?: string;
  now?: string;
  savedAt?: string;
  url: string;
};

type ProviderLoopHttpEnvelope =
  | {
      data: ProviderLoopHttpResponseData;
      ok: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      ok: false;
    };

type ProviderLoopHttpResponseData = {
  events?: unknown[];
  memoryPlanEvents?: unknown[];
  quarantinedEvents?: AdapterQuarantinedEvent[];
  recallEvents?: unknown[];
  summary?: {
    providerResult?: {
      eventCount?: number;
      warningCodes?: string[];
    };
    source?: string;
  };
  warnings?: AdapterWarning[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function globalFetch(): ProviderLoopHttpFetch | undefined {
  return typeof globalThis.fetch === "function"
    ? (globalThis.fetch as unknown as ProviderLoopHttpFetch)
    : undefined;
}

function warning(input: {
  code: string;
  message: string;
  eventId?: string;
  sequence?: number;
}): AdapterWarning {
  return {
    ...input,
    source: PROVIDER_LOOP_HTTP_SOURCE,
  };
}

function quarantineResponseEvent(input: {
  code: string;
  index: number;
  event: unknown;
  issues: AdapterQuarantinedEvent["issues"];
}): AdapterQuarantinedEvent {
  return {
    code: input.code,
    input: {
      event: input.event,
      responseIndex: input.index,
    },
    issues: input.issues,
    source: PROVIDER_LOOP_HTTP_SOURCE,
  };
}

function readEvents(data: ProviderLoopHttpResponseData, key: keyof ProviderLoopHttpResponseData): unknown[] {
  const value = data[key];

  return Array.isArray(value) ? value : [];
}

function candidateEvents(data: ProviderLoopHttpResponseData): unknown[] {
  return [
    ...readEvents(data, "recallEvents"),
    ...readEvents(data, "memoryPlanEvents"),
    ...readEvents(data, "events"),
  ];
}

async function readEnvelope(
  response: ProviderLoopHttpFetchResponse,
): Promise<ProviderLoopHttpEnvelope> {
  const raw = await response.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Provider-loop HTTP response must be JSON: ${error.message}.`
        : "Provider-loop HTTP response must be JSON.",
    );
  }

  if (!isRecord(parsed) || typeof parsed.ok !== "boolean") {
    throw new Error("Provider-loop HTTP response envelope is not supported.");
  }

  return parsed as ProviderLoopHttpEnvelope;
}

function requestBody(input: ProviderLoopHttpInput): Record<string, unknown> {
  return {
    events: input.events,
    maxAgents: input.maxAgents,
    maxMemoryRecords: input.maxMemoryRecords,
    maxOutputTokens: input.maxOutputTokens,
    maxRecords: input.maxRecords,
    memoriesPerAgent: input.memoriesPerAgent,
    memoryPlanMaxAgents: input.memoryPlanMaxAgents,
    model: input.model,
    now: input.now,
    savedAt: input.savedAt,
  };
}

export async function callProviderLoopHttp(
  input: ProviderLoopHttpInput,
): Promise<AdapterResult> {
  const fetchImpl = input.fetchImpl ?? globalFetch();

  if (fetchImpl === undefined) {
    return {
      events: [],
      quarantinedEvents: [],
      source: PROVIDER_LOOP_HTTP_SOURCE,
      warnings: [
        warning({
          code: "missing_provider_loop_http_fetch",
          message: "A fetch implementation is required for Provider HTTP.",
        }),
      ],
    };
  }

  try {
    const response = await fetchImpl(input.url, {
      body: JSON.stringify(requestBody(input)),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
    const envelope = await readEnvelope(response);

    if (!response.ok || !envelope.ok) {
      const code = envelope.ok
        ? "provider_loop_http_request_failed"
        : envelope.error.code;
      const message = envelope.ok
        ? `Provider-loop HTTP request failed with status ${response.status}.`
        : envelope.error.message;

      return {
        events: [],
        quarantinedEvents: [],
        source: PROVIDER_LOOP_HTTP_SOURCE,
        warnings: [warning({ code, message })],
      };
    }

    const candidates = candidateEvents(envelope.data);
    const validation = validateEventStream(candidates);
    const quarantinedEvents = [
      ...(envelope.data.quarantinedEvents ?? []),
      ...validation.quarantinedEvents.map((quarantinedEvent, index) =>
        quarantineResponseEvent({
          code: "invalid_provider_loop_http_response_event",
          event: quarantinedEvent.input,
          index,
          issues: quarantinedEvent.issues,
        }),
      ),
    ];

    return {
      events: validation.events,
      quarantinedEvents,
      source: PROVIDER_LOOP_HTTP_SOURCE,
      warnings: envelope.data.warnings ?? [],
    };
  } catch (error) {
    return {
      events: [],
      quarantinedEvents: [],
      source: PROVIDER_LOOP_HTTP_SOURCE,
      warnings: [
        warning({
          code: "provider_loop_http_request_failed",
          message:
            error instanceof Error
              ? error.message
              : "Provider-loop HTTP request failed.",
        }),
      ],
    };
  }
}
