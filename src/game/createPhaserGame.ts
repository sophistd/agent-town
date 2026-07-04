import Phaser from "phaser";

import {
  AgentTownScene,
  AGENT_TOWN_SCENE_KEY,
  PROJECTION_SETTINGS_REGISTRY_KEY,
  WORLD_STATE_REGISTRY_KEY,
} from "./AgentTownScene";
import type { WorldState } from "../events/types";
import type { TownProjectionSettings } from "./projectionSettings";

export type AgentTownPhaserGame = Phaser.Game & {
  registry: Phaser.Data.DataManager;
};

type CreatePhaserGameOptions = {
  initialWorldState: WorldState;
  parent: HTMLElement;
  projectionSettings: TownProjectionSettings;
};

export function createPhaserGame({
  initialWorldState,
  parent,
  projectionSettings,
}: CreatePhaserGameOptions): AgentTownPhaserGame {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#dbe8d4",
    width: 1040,
    height: 900,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    render: {
      antialias: false,
      pixelArt: true,
    },
    scene: [AgentTownScene],
  }) as AgentTownPhaserGame;

  game.registry.set(WORLD_STATE_REGISTRY_KEY, initialWorldState);
  game.registry.set(PROJECTION_SETTINGS_REGISTRY_KEY, projectionSettings);

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

export function updatePhaserProjectionSettings(
  game: AgentTownPhaserGame,
  projectionSettings: TownProjectionSettings,
): void {
  game.registry.set(PROJECTION_SETTINGS_REGISTRY_KEY, projectionSettings);

  const scene = game.scene.getScene(AGENT_TOWN_SCENE_KEY);
  if (scene instanceof AgentTownScene) {
    scene.setProjectionSettings(projectionSettings);
  }
}

export function destroyPhaserGame(game: AgentTownPhaserGame): void {
  game.destroy(true);
}
