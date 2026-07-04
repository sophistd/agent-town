import Phaser from "phaser";

import type { WorldState } from "../events/types";
import { renderAgents } from "./renderAgents";
import { renderBubbles } from "./renderBubbles";
import { renderEdges } from "./renderEdges";
import { renderLocations } from "./renderLocations";

export const AGENT_TOWN_SCENE_KEY = "AgentTownScene";
export const WORLD_STATE_REGISTRY_KEY = "agent-town:world-state";

export class AgentTownScene extends Phaser.Scene {
  private worldState?: WorldState;
  private townLayer?: Phaser.GameObjects.Container;

  constructor() {
    super(AGENT_TOWN_SCENE_KEY);
  }

  create(): void {
    this.worldState = this.game.registry.get(WORLD_STATE_REGISTRY_KEY) as
      | WorldState
      | undefined;

    this.cameras.main.setBackgroundColor("#e9eee8");
    this.game.registry.events.on(
      `changedata-${WORLD_STATE_REGISTRY_KEY}`,
      this.handleRegistryWorldState,
      this,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.registry.events.off(
        `changedata-${WORLD_STATE_REGISTRY_KEY}`,
        this.handleRegistryWorldState,
        this,
      );
    });
    this.renderWorldState();
  }

  setWorldState(worldState: WorldState): void {
    this.worldState = worldState;
    this.renderWorldState();
  }

  private handleRegistryWorldState(
    _parent: Phaser.Data.DataManager,
    value: WorldState,
  ): void {
    this.setWorldState(value);
  }

  private renderWorldState(): void {
    this.townLayer?.destroy(true);
    this.townLayer = this.add.container(0, 0);

    const background = this.add.graphics();
    background.fillStyle(0xe9eee8, 1);
    background.fillRect(0, 0, this.scale.width, this.scale.height);
    background.lineStyle(2, 0xb9c3b2, 1);
    background.strokeRoundedRect(18, 18, this.scale.width - 36, this.scale.height - 36, 14);
    this.townLayer.add(background);

    const state = this.worldState;
    if (state === undefined) {
      const waiting = this.add.text(40, 40, "Waiting for WorldState...", {
        color: "#202124",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "18px",
      });
      this.townLayer.add(waiting);
      return;
    }

    renderLocations(this, this.townLayer);
    renderEdges(this, this.townLayer, state);
    renderAgents(this, this.townLayer, state);
    renderBubbles(this, this.townLayer, state);

    const footer = this.add.text(
      36,
      32,
      `WorldState projection · cursor ${state.cursor} · ${state.currentEventId ?? "none"}`,
      {
        color: "#3f4d46",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px",
      },
    );
    this.townLayer.add(footer);
  }
}
