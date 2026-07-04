import { useEffect, useRef, type CSSProperties } from "react";

import {
  createPhaserGame,
  destroyPhaserGame,
  updatePhaserWorldState,
  type AgentTownPhaserGame,
} from "../game/createPhaserGame";
import type { WorldState } from "../events/types";

const hostStyle = {
  position: "relative",
  width: "100%",
  height: "clamp(420px, 56vh, 560px)",
  minHeight: "420px",
  overflow: "hidden",
  background: "#e9eee8",
} satisfies CSSProperties;

type TownCanvasProps = {
  worldState: WorldState;
};

export function TownCanvas({ worldState }: TownCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<AgentTownPhaserGame | null>(null);

  useEffect(() => {
    if (hostRef.current === null || gameRef.current !== null) {
      return undefined;
    }

    gameRef.current = createPhaserGame({
      parent: hostRef.current,
      initialWorldState: worldState,
    });

    return () => {
      if (gameRef.current !== null) {
        destroyPhaserGame(gameRef.current);
        gameRef.current = null;
      }
    };
  }, [worldState]);

  useEffect(() => {
    if (gameRef.current === null) {
      return;
    }

    updatePhaserWorldState(gameRef.current, worldState);
  }, [worldState]);

  return <div ref={hostRef} data-testid="town-canvas-host" style={hostStyle} />;
}
