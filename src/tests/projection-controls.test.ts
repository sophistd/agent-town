import { describe, expect, it } from "vitest";

import { AGENT_EVENT_TYPES } from "../events/constants";
import { mockFailureRun } from "../events/mockFailureRun";
import {
  DEFAULT_TOWN_PROJECTION_SETTINGS,
  MAX_TOWN_ZOOM,
  MIN_TOWN_ZOOM,
  clampTownZoom,
  normalizeTownProjectionSettings,
} from "../game/projectionSettings";
import {
  countEnabledEventTypes,
  createEventTypeFilters,
  matchesEventTypeFilter,
  setEventTypeFilter,
} from "../ui/projectionFilters";

describe("projection controls", () => {
  it("clamps town zoom to supported projection bounds", () => {
    expect(clampTownZoom(0)).toBe(MIN_TOWN_ZOOM);
    expect(clampTownZoom(9)).toBe(MAX_TOWN_ZOOM);
    expect(clampTownZoom(Number.NaN)).toBe(DEFAULT_TOWN_PROJECTION_SETTINGS.townZoom);
    expect(
      normalizeTownProjectionSettings({
        ...DEFAULT_TOWN_PROJECTION_SETTINGS,
        townZoom: 9,
      }).townZoom,
    ).toBe(MAX_TOWN_ZOOM);
  });

  it("filters visible timeline events without mutating the event stream", () => {
    const filters = setEventTypeFilter(createEventTypeFilters(false), "error", true);
    const visibleEvents = mockFailureRun.filter((event) =>
      matchesEventTypeFilter(event, filters),
    );

    expect(countEnabledEventTypes(filters)).toBe(1);
    expect(visibleEvents.map((event) => event.type)).toEqual(["error"]);
    expect(mockFailureRun.length).toBe(30);
    expect(AGENT_EVENT_TYPES).toContain("handoff");
  });
});
