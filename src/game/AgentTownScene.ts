import Phaser from "phaser";

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
import { renderTownMap } from "./renderTownMap";
import {
  AGENT_SPRITESHEET_KEY,
  AGENT_SPRITESHEET_URL,
  AGENT_SPRITE_HEIGHT,
  AGENT_SPRITE_WIDTH,
  BUILDING_SPRITESHEET_KEY,
  BUILDING_SPRITESHEET_URL,
  BUILDING_SPRITE_HEIGHT,
  BUILDING_SPRITE_WIDTH,
  DEFAULT_TOWN_MAP,
  loadTownMap,
  TOWN_MAP_BACKGROUND_KEY,
  TOWN_MAP_BACKGROUND_URL,
  TOWN_MAP_TILESET_KEY,
  TOWN_MAP_TILESET_URL,
  type TownMapDefinition,
} from "./townMap";

export const AGENT_TOWN_SCENE_KEY = "AgentTownScene";
export const PROJECTION_SETTINGS_REGISTRY_KEY = "agent-town:projection-settings";
export const WORLD_STATE_REGISTRY_KEY = "agent-town:world-state";

export class AgentTownScene extends Phaser.Scene {
  private projectionSettings: TownProjectionSettings = DEFAULT_TOWN_PROJECTION_SETTINGS;
  private worldState?: WorldState;
  private townLayer?: Phaser.GameObjects.Container;
  private townMap: TownMapDefinition = DEFAULT_TOWN_MAP;
  private isShutdown = false;
  private mapLoadRequestId = 0;

  constructor() {
    super(AGENT_TOWN_SCENE_KEY);
  }

  preload(): void {
    this.load.image(TOWN_MAP_BACKGROUND_KEY, TOWN_MAP_BACKGROUND_URL);
    this.load.spritesheet(TOWN_MAP_TILESET_KEY, TOWN_MAP_TILESET_URL, {
      frameWidth: DEFAULT_TOWN_MAP.tileWidth,
      frameHeight: DEFAULT_TOWN_MAP.tileHeight,
    });
    this.load.spritesheet(AGENT_SPRITESHEET_KEY, AGENT_SPRITESHEET_URL, {
      frameWidth: AGENT_SPRITE_WIDTH,
      frameHeight: AGENT_SPRITE_HEIGHT,
    });
    this.load.spritesheet(BUILDING_SPRITESHEET_KEY, BUILDING_SPRITESHEET_URL, {
      frameWidth: BUILDING_SPRITE_WIDTH,
      frameHeight: BUILDING_SPRITE_HEIGHT,
    });
  }

  create(): void {
    this.isShutdown = false;
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneExit, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneExit, this);
    this.renderWorldState();
    const mapLoadRequestId = ++this.mapLoadRequestId;
    void this.loadProjectionMap(mapLoadRequestId);
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

  private handleSceneExit(): void {
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
    this.isShutdown = true;
    this.mapLoadRequestId += 1;
    this.townLayer = undefined;
  }

  private async loadProjectionMap(requestId: number): Promise<void> {
    const townMap = await loadTownMap();

    if (requestId !== this.mapLoadRequestId || !this.canRender()) {
      return;
    }

    this.townMap = townMap;
    this.renderWorldState();
  }

  private canRender(): boolean {
    const sceneSystems = this.sys as Phaser.Scenes.Systems & {
      displayList?: { add?: unknown } | null;
      updateList?: unknown;
    };
    const gameObjectFactory = this.add as Phaser.GameObjects.GameObjectFactory & {
      displayList?: { add?: unknown } | null;
      updateList?: unknown;
    };
    const game = this.game as Phaser.Game & { isDestroyed?: boolean };
    const displayList = gameObjectFactory.displayList ?? sceneSystems.displayList;
    const updateList = gameObjectFactory.updateList ?? sceneSystems.updateList;

    return (
      !this.isShutdown &&
      game.isDestroyed !== true &&
      this.sys.isActive() &&
      displayList !== undefined &&
      displayList !== null &&
      typeof displayList.add === "function" &&
      updateList !== undefined &&
      updateList !== null
    );
  }

  private applyProjectionScale(): void {
    const zoom = this.projectionSettings.townZoom;
    const offsetX = (this.scale.width * (1 - zoom)) / 2;
    const offsetY = (this.scale.height * (1 - zoom)) / 2;

    this.townLayer?.setScale(zoom);
    this.townLayer?.setPosition(offsetX, offsetY);
  }

  private renderWorldState(): void {
    if (!this.canRender()) {
      return;
    }

    this.townLayer?.destroy(true);
    this.townLayer = undefined;
    if (!this.canRender()) {
      return;
    }
    this.townLayer = this.add.container(0, 0);

    renderTownMap(this, this.townLayer, this.townMap);

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

    renderLocations(this, this.townLayer, this.projectionSettings, this.townMap);
    if (this.projectionSettings.showEdges) {
      renderEdges(this, this.townLayer, state, this.projectionSettings, this.townMap);
    }
    renderAgents(this, this.townLayer, state, this.projectionSettings, this.townMap);
    if (this.projectionSettings.showBubbles) {
      renderBubbles(this, this.townLayer, state, this.projectionSettings, this.townMap);
    }

    const footer = this.add.text(
      36,
      38,
      `WorldState / cursor ${state.cursor} / ${state.currentEventId ?? "none"} / map ${this.townMap.id}`,
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
