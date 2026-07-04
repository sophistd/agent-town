import { useEffect, useRef } from "react";

import {
  createPhaserGame,
  destroyPhaserGame,
  updatePhaserProjectionSettings,
  updatePhaserWorldState,
  type AgentTownPhaserGame,
} from "../game/createPhaserGame";
import type { AgentEvent, WorldState } from "../events/types";
import type { TownProjectionSettings } from "../game/projectionSettings";

type TownCanvasProps = {
  currentEvent?: AgentEvent;
  settings: TownProjectionSettings;
  totalEventCount: number;
  visibleEventCount: number;
  worldState: WorldState;
};

export function TownCanvas({
  currentEvent,
  settings,
  totalEventCount,
  visibleEventCount,
  worldState,
}: TownCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<AgentTownPhaserGame | null>(null);

  useEffect(() => {
    if (hostRef.current === null || gameRef.current !== null) {
      return undefined;
    }

    gameRef.current = createPhaserGame({
      parent: hostRef.current,
      projectionSettings: settings,
      initialWorldState: worldState,
    });

    return () => {
      if (gameRef.current !== null) {
        destroyPhaserGame(gameRef.current);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameRef.current === null) {
      return;
    }

    updatePhaserWorldState(gameRef.current, worldState);
  }, [worldState]);

  useEffect(() => {
    if (gameRef.current === null) {
      return;
    }

    updatePhaserProjectionSettings(gameRef.current, settings);
  }, [settings]);

  return (
    <div className="town-shell">
      <div className="town-toolbar">
        <p className="town-toolbar-title">
          {currentEvent === undefined
            ? "Waiting for AgentEvent"
            : `${currentEvent.agentName} / ${currentEvent.type} / ${currentEvent.summary ?? currentEvent.content}`}
        </p>
        <div className="town-toolbar-meta" aria-label="Town projection status">
          <span className="town-chip">cursor {worldState.cursor}</span>
          <span className="town-chip">
            visible {visibleEventCount}/{totalEventCount}
          </span>
          <span className="town-chip">{settings.density}</span>
          <span className="town-chip">{Math.round(settings.townZoom * 100)}%</span>
        </div>
      </div>
      <div ref={hostRef} data-testid="town-canvas-host" className="town-canvas-host" />
    </div>
  );
}
