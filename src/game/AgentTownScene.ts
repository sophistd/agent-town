import Phaser from "phaser";

import type { WorldState } from "../events/types";

export const AGENT_TOWN_SCENE_KEY = "AgentTownScene";
export const WORLD_STATE_REGISTRY_KEY = "agent-town:world-state";

export class AgentTownScene extends Phaser.Scene {
  private worldState?: WorldState;
  private titleText?: Phaser.GameObjects.Text;
  private stateText?: Phaser.GameObjects.Text;
  private boundaryText?: Phaser.GameObjects.Text;

  constructor() {
    super(AGENT_TOWN_SCENE_KEY);
  }

  create(): void {
    this.worldState = this.game.registry.get(WORLD_STATE_REGISTRY_KEY) as
      | WorldState
      | undefined;

    this.cameras.main.setBackgroundColor("#e9eee8");
    this.drawPlaceholderTown();
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

  private drawPlaceholderTown(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();

    graphics.fillStyle(0xe9eee8, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0xb9c3b2, 1);
    graphics.strokeRoundedRect(24, 24, width - 48, height - 48, 14);
    graphics.fillStyle(0xffffff, 0.66);
    graphics.fillRoundedRect(56, 64, width - 112, height - 128, 12);
    graphics.lineStyle(1, 0xd0d8ca, 1);
    graphics.strokeRoundedRect(56, 64, width - 112, height - 128, 12);

    this.titleText = this.add.text(80, 88, "Town View mounted", {
      color: "#202124",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "600",
    });

    this.boundaryText = this.add.text(
      80,
      height - 126,
      "Phaser consumes WorldState; React/event layer owns facts.",
      {
        color: "#4e5f56",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px",
      },
    );

    this.stateText = this.add.text(80, 132, "", {
      color: "#2f3834",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: "14px",
      lineSpacing: 6,
    });
  }

  private renderWorldState(): void {
    if (this.stateText === undefined) {
      return;
    }

    const state = this.worldState;
    if (state === undefined) {
      this.stateText.setText("Waiting for WorldState...");
      return;
    }

    this.stateText.setText(
      [
        `runId: ${state.runId}`,
        `cursor: ${state.cursor}`,
        `currentEventId: ${state.currentEventId ?? "none"}`,
        `selectedEventId: ${state.selectedEventId ?? "none"}`,
        `selectedAgentId: ${state.selectedAgentId ?? "none"}`,
        `agentCount: ${Object.keys(state.agents).length}`,
      ].join("\n"),
    );
  }
}
