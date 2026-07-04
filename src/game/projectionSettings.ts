export type ProjectionDensity = "compact" | "balanced" | "expanded";

export type TownProjectionSettings = {
  density: ProjectionDensity;
  showBubbles: boolean;
  showEdges: boolean;
  townZoom: number;
};

export const MIN_TOWN_ZOOM = 0.85;
export const MAX_TOWN_ZOOM = 1.25;

export const DEFAULT_TOWN_PROJECTION_SETTINGS: TownProjectionSettings = {
  density: "balanced",
  showBubbles: true,
  showEdges: true,
  townZoom: 1,
};

export function clampTownZoom(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_TOWN_PROJECTION_SETTINGS.townZoom;
  }

  return Math.min(MAX_TOWN_ZOOM, Math.max(MIN_TOWN_ZOOM, value));
}

export function normalizeTownProjectionSettings(
  settings: TownProjectionSettings,
): TownProjectionSettings {
  return {
    ...settings,
    townZoom: clampTownZoom(settings.townZoom),
  };
}
