import Phaser from "phaser";

import {
  AgentTownScene,
  AGENT_TOWN_SCENE_KEY,
  WORLD_STATE_REGISTRY_KEY,
} from "./AgentTownScene";
import type { WorldState } from "../events/types";

export type AgentTownPhaserGame = Phaser.Game & {
  registry: Phaser.Data.DataManager;
};

type CreatePhaserGameOptions = {
  parent: HTMLElement;
  initialWorldState: WorldState;
};

export function createPhaserGame({
  parent,
  initialWorldState,
}: CreatePhaserGameOptions): AgentTownPhaserGame {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#e9eee8",
    width: 960,
    height: 540,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
    scene: [AgentTownScene],
  }) as AgentTownPhaserGame;

  game.registry.set(WORLD_STATE_REGISTRY_KEY, initialWorldState);

  return game;
}

export function updatePhaserWorldState(
  game: AgentTownPhaserGame,
  worldState: WorldState,
): void {
  game.registry.set(WORLD_STATE_REGISTRY_KEY, worldState);

  const scene = game.scene.getScene(AGENT_TOWN_SCENE_KEY);
  if (scene instanceof AgentTownScene) {
    scene.setWorldState(worldState);
  }
}

export function destroyPhaserGame(game: AgentTownPhaserGame): void {
  game.destroy(true);
}
