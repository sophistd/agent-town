import Phaser from "phaser";

import { LOCATION_COORDINATES } from "../events/routing";
import type { WorldState } from "../events/types";
import {
  DEFAULT_TOWN_PROJECTION_SETTINGS,
  normalizeTownProjectionSettings,
  type TownProjectionSettings,
} from "./projectionSettings";
import { renderAgents } from "./renderAgents";
import { renderBubbles } from "./renderBubbles";
import { renderEdges } from "./renderEdges";
import { renderLocations } from "./renderLocations";

export const AGENT_TOWN_SCENE_KEY = "AgentTownScene";
export const PROJECTION_SETTINGS_REGISTRY_KEY = "agent-town:projection-settings";
export const WORLD_STATE_REGISTRY_KEY = "agent-town:world-state";

export class AgentTownScene extends Phaser.Scene {
  private projectionSettings: TownProjectionSettings = DEFAULT_TOWN_PROJECTION_SETTINGS;
  private worldState?: WorldState;
  private townLayer?: Phaser.GameObjects.Container;

  constructor() {
    super(AGENT_TOWN_SCENE_KEY);
  }

  create(): void {
    this.worldState = this.game.registry.get(WORLD_STATE_REGISTRY_KEY) as
      | WorldState
      | undefined;
    this.projectionSettings = normalizeTownProjectionSettings(
      (this.game.registry.get(PROJECTION_SETTINGS_REGISTRY_KEY) as TownProjectionSettings | undefined) ??
        DEFAULT_TOWN_PROJECTION_SETTINGS,
    );

    this.cameras.main.setBackgroundColor("#dbe8d4");
    this.game.registry.events.on(
      `changedata-${WORLD_STATE_REGISTRY_KEY}`,
      this.handleRegistryWorldState,
      this,
    );
    this.game.registry.events.on(
      `changedata-${PROJECTION_SETTINGS_REGISTRY_KEY}`,
      this.handleRegistryProjectionSettings,
      this,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.registry.events.off(
        `changedata-${WORLD_STATE_REGISTRY_KEY}`,
        this.handleRegistryWorldState,
        this,
      );
      this.game.registry.events.off(
        `changedata-${PROJECTION_SETTINGS_REGISTRY_KEY}`,
        this.handleRegistryProjectionSettings,
        this,
      );
    });
    this.renderWorldState();
  }

  setWorldState(worldState: WorldState): void {
    this.worldState = worldState;
    this.renderWorldState();
  }

  setProjectionSettings(projectionSettings: TownProjectionSettings): void {
    this.projectionSettings = normalizeTownProjectionSettings(projectionSettings);
    this.renderWorldState();
  }

  private handleRegistryWorldState(
    _parent: Phaser.Data.DataManager,
    value: WorldState,
  ): void {
    this.setWorldState(value);
  }

  private handleRegistryProjectionSettings(
    _parent: Phaser.Data.DataManager,
    value: TownProjectionSettings,
  ): void {
    this.setProjectionSettings(value);
  }

  private renderGround(): void {
    const ground = this.add.graphics();
    ground.fillStyle(0xdbe8d4, 1);
    ground.fillRect(0, 0, this.scale.width, this.scale.height);

    for (let x = 34; x < this.scale.width; x += 78) {
      for (let y = 42; y < this.scale.height; y += 68) {
        ground.fillStyle((x + y) % 3 === 0 ? 0xcfe1c8 : 0xe3efdc, 0.34);
        ground.fillRect(x, y, 16, 10);
      }
    }

    ground.lineStyle(34, 0xc8b88e, 0.9);
    ground.beginPath();
    ground.moveTo(LOCATION_COORDINATES.dispatch_board.x, LOCATION_COORDINATES.dispatch_board.y);
    ground.lineTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.workshop.x, LOCATION_COORDINATES.workshop.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.town_hall.x, LOCATION_COORDINATES.town_hall.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.library.x, LOCATION_COORDINATES.library.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.archive.x, LOCATION_COORDINATES.archive.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.review_room.x, LOCATION_COORDINATES.review_room.y);
    ground.strokePath();

    ground.lineStyle(10, 0xe8dec2, 0.95);
    ground.beginPath();
    ground.moveTo(LOCATION_COORDINATES.dispatch_board.x, LOCATION_COORDINATES.dispatch_board.y);
    ground.lineTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.workshop.x, LOCATION_COORDINATES.workshop.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.town_hall.x, LOCATION_COORDINATES.town_hall.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.library.x, LOCATION_COORDINATES.library.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.archive.x, LOCATION_COORDINATES.archive.y);
    ground.moveTo(LOCATION_COORDINATES.square.x, LOCATION_COORDINATES.square.y);
    ground.lineTo(LOCATION_COORDINATES.review_room.x, LOCATION_COORDINATES.review_room.y);
    ground.strokePath();

    const square = LOCATION_COORDINATES.square;

    ground.fillStyle(0x7fb0bf, 0.9);
    ground.fillCircle(square.x, square.y - 58, 42);
    ground.lineStyle(5, 0xe6f2ee, 0.92);
    ground.strokeCircle(square.x, square.y - 58, 42);
    ground.fillStyle(0x466f79, 0.9);
    ground.fillCircle(square.x, square.y - 58, 12);

    ground.lineStyle(2, 0x91a87d, 0.7);
    ground.strokeRoundedRect(18, 18, this.scale.width - 36, this.scale.height - 36, 14);
    this.townLayer?.add(ground);

    const decor = this.add.graphics();
    const trees = [
      [92, 190],
      [122, 740],
      [172, 112],
      [198, 808],
      [328, 120],
      [358, 750],
      [438, 780],
      [726, 146],
      [770, 754],
      [902, 210],
      [922, 694],
      [968, 374],
      [84, 476],
    ] as const;

    for (const [x, y] of trees) {
      decor.fillStyle(0x6f8f58, 1);
      decor.fillCircle(x, y, 18);
      decor.fillStyle(0x88aa69, 1);
      decor.fillCircle(x - 10, y + 8, 13);
      decor.fillCircle(x + 11, y + 7, 13);
      decor.fillStyle(0x7a5633, 1);
      decor.fillRect(x - 4, y + 18, 8, 17);
    }

    const lamps = [
      [382, 348],
      [620, 392],
      [438, 590],
      [704, 574],
    ] as const;

    for (const [x, y] of lamps) {
      decor.fillStyle(0x384840, 1);
      decor.fillRect(x - 2, y - 12, 4, 24);
      decor.fillStyle(0xf7d36b, 0.95);
      decor.fillCircle(x, y - 16, 7);
    }

    this.townLayer?.add(decor);
  }

  private applyProjectionScale(): void {
    const zoom = this.projectionSettings.townZoom;
    const offsetX = (this.scale.width * (1 - zoom)) / 2;
    const offsetY = (this.scale.height * (1 - zoom)) / 2;

    this.townLayer?.setScale(zoom);
    this.townLayer?.setPosition(offsetX, offsetY);
  }

  private renderWorldState(): void {
    this.townLayer?.destroy(true);
    this.townLayer = this.add.container(0, 0);

    this.renderGround();

    const state = this.worldState;
    if (state === undefined) {
      const waiting = this.add.text(40, 40, "Waiting for WorldState...", {
        color: "#202124",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "18px",
      });
      this.townLayer.add(waiting);
      this.applyProjectionScale();
      return;
    }

    renderLocations(this, this.townLayer, this.projectionSettings);
    if (this.projectionSettings.showEdges) {
      renderEdges(this, this.townLayer, state, this.projectionSettings);
    }
    renderAgents(this, this.townLayer, state, this.projectionSettings);
    if (this.projectionSettings.showBubbles) {
      renderBubbles(this, this.townLayer, state, this.projectionSettings);
    }

    const footer = this.add.text(
      36,
      38,
      `WorldState / cursor ${state.cursor} / ${state.currentEventId ?? "none"}`,
      {
        backgroundColor: "#132225",
        color: "#e8efe9",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        padding: { x: 8, y: 5 },
      },
    );
    this.townLayer.add(footer);
    this.applyProjectionScale();
  }
}
