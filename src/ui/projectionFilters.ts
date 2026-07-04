import { AGENT_EVENT_TYPES } from "../events/constants";
import type { AgentEvent, AgentEventType } from "../events/types";

export type EventTypeFilterMap = Record<AgentEventType, boolean>;

export function createEventTypeFilters(enabled: boolean): EventTypeFilterMap {
  return AGENT_EVENT_TYPES.reduce<EventTypeFilterMap>((filters, eventType) => {
    filters[eventType] = enabled;
    return filters;
  }, {} as EventTypeFilterMap);
}

export const DEFAULT_EVENT_TYPE_FILTERS = createEventTypeFilters(true);

export function countEnabledEventTypes(filters: EventTypeFilterMap): number {
  return AGENT_EVENT_TYPES.filter((eventType) => filters[eventType]).length;
}

export function matchesEventTypeFilter(
  event: AgentEvent,
  filters: EventTypeFilterMap,
): boolean {
  return filters[event.type] === true;
}

export function setEventTypeFilter(
  filters: EventTypeFilterMap,
  eventType: AgentEventType,
  enabled: boolean,
): EventTypeFilterMap {
  return {
    ...filters,
    [eventType]: enabled,
  };
}
