import type {
  AgentEvent,
  AgentEventSource,
  QuarantinedEvent,
} from "../events/types";

export type AdapterWarning = {
  code: string;
  message: string;
  source: AgentEventSource;
  eventId?: string;
  line?: number;
  sequence?: number;
};

export type AdapterQuarantinedEvent = QuarantinedEvent & {
  code: string;
  source: AgentEventSource;
  line?: number;
  raw?: string;
};

export type AdapterResult = {
  events: AgentEvent[];
  quarantinedEvents: AdapterQuarantinedEvent[];
  source: AgentEventSource;
  warnings: AdapterWarning[];
};

export interface AgentEventAdapter<Input> {
  source: AgentEventSource;
  parse(input: Input): AdapterResult | Promise<AdapterResult>;
}
