import Phaser from "phaser";

import type { AgentRole, AgentState, AgentStateStatus, WorldState } from "../events/types";
import { selectAgent } from "../state/selectionStore";
import type { TownProjectionSettings } from "./projectionSettings";
import { AGENT_SPRITESHEET_KEY, type TownMapDefinition } from "./townMap";
import {
  ROLE_VISUALS,
  STATUS_LEGEND_ORDER,
  STATUS_VISUALS,
} from "./visualMapping";

export type RenderPosition = {
  x: number;
  y: number;
};

const AGENT_ROLE_FRAME_COLUMN: Record<AgentRole, number> = {
  planner: 0,
  researcher: 1,
  coder: 2,
  reviewer: 3,
  memory: 4,
  critic: 5,
  orchestrator: 6,
  custom: 7,
};

const AGENT_STATUS_FRAME_ROW: Record<AgentStateStatus, number> = {
  idle: 0,
  thinking: 1,
  walking: 1,
  talking: 1,
  working: 1,
  waiting: 0,
  blocked: 2,
  error: 2,
  done: 3,
};

function getAgentSpriteFrame(agent: AgentState): number {
  return AGENT_STATUS_FRAME_ROW[agent.status] * 8 + AGENT_ROLE_FRAME_COLUMN[agent.role];
}

function getAgentOffsets(agents: AgentState[]): Map<string, RenderPosition> {
  const byLocation = new Map<string, AgentState[]>();

  for (const agent of agents) {
    const locationAgents = byLocation.get(agent.location) ?? [];
    locationAgents.push(agent);
    byLocation.set(agent.location, locationAgents);
  }

  const offsets = new Map<string, { x: number; y: number }>();

  for (const locationAgents of byLocation.values()) {
    locationAgents
      .sort((left, right) => left.agentId.localeCompare(right.agentId))
      .forEach((agent, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        offsets.set(agent.agentId, {
          x: (column - 1) * 42,
          y: 44 + row * 34,
        });
      });
  }

  return offsets;
}

function resolveInteriorPosition(
  agent: AgentState,
  townMap?: TownMapDefinition,
): RenderPosition | undefined {
  if (agent.subLocationId === undefined || townMap === undefined) {
    return undefined;
  }

  const interior = townMap.interiors.find(
    (candidate) =>
      candidate.interiorId === agent.subLocationId &&
      candidate.locationId === agent.location,
  );

  if (interior === undefined) {
    return undefined;
  }

  return { x: interior.anchorX, y: interior.anchorY };
}

export function getAgentRenderPositions(
  worldState: WorldState,
  townMap?: TownMapDefinition,
): Map<string, RenderPosition> {
  const agents = Object.values(worldState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const offsets = getAgentOffsets(agents);
  const positions = new Map<string, RenderPosition>();

  for (const agent of agents) {
    const offset = offsets.get(agent.agentId) ?? { x: 0, y: 0 };
    const basePosition = resolveInteriorPosition(agent, townMap) ?? { x: agent.x, y: agent.y };
    positions.set(agent.agentId, {
      x: basePosition.x + offset.x,
      y: basePosition.y + offset.y,
    });
  }

  return positions;
}

function renderMovementTrail(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  agent: AgentState,
  x: number,
  y: number,
): void {
  if (agent.previousX === undefined || agent.previousY === undefined) {
    return;
  }

  const distance = Phaser.Math.Distance.Between(agent.previousX, agent.previousY, x, y);

  if (distance < 18) {
    return;
  }

  const trail = scene.add.graphics();
  trail.lineStyle(3, 0x37584f, 0.26);
  const steps = Math.max(4, Math.floor(distance / 42));

  for (let index = 0; index < steps; index += 1) {
    const t0 = index / steps;
    const t1 = Math.min(1, t0 + 0.42 / steps);
    trail.beginPath();
    trail.moveTo(
      Phaser.Math.Linear(agent.previousX, x, t0),
      Phaser.Math.Linear(agent.previousY, y, t0),
    );
    trail.lineTo(
      Phaser.Math.Linear(agent.previousX, x, t1),
      Phaser.Math.Linear(agent.previousY, y, t1),
    );
    trail.strokePath();
  }

  layer.add(trail);
}

function renderStatusBadge(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  agent: AgentState,
  x: number,
  y: number,
): void {
  const statusVisual = STATUS_VISUALS[agent.status];
  const badge = scene.add.graphics();

  badge.fillStyle(statusVisual.fill, 1);
  badge.fillCircle(x + 20, y - 18, 10);
  badge.lineStyle(2, statusVisual.stroke, 1);
  badge.strokeCircle(x + 20, y - 18, 10);

  const marker = scene.add
    .text(x + 20, y - 18, statusVisual.marker.slice(0, 1).toUpperCase(), {
      color: "#ffffff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "700",
    })
    .setOrigin(0.5, 0.5);

  layer.add([badge, marker]);
}

function renderAgent(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  agent: AgentState,
  isSelected: boolean,
  offset: { x: number; y: number },
  settings: TownProjectionSettings,
): void {
  const roleVisual = ROLE_VISUALS[agent.role];
  const statusVisual = STATUS_VISUALS[agent.status];
  const x = agent.x + offset.x;
  const y = agent.y + offset.y;
  const isCompact = settings.density === "compact";
  const isExpanded = settings.density === "expanded";

  renderMovementTrail(scene, layer, agent, x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.16);
  shadow.fillEllipse(x + 2, y + 25, 44, 10);

  if (scene.textures.exists(AGENT_SPRITESHEET_KEY)) {
    const selectionRing = scene.add.graphics();
    if (isSelected) {
      selectionRing.lineStyle(4, 0xf4f7ef, 0.95);
      selectionRing.strokeRoundedRect(x - 21, y - 34, 42, 62, 8);
      selectionRing.lineStyle(2, roleVisual.stroke, 0.88);
      selectionRing.strokeRoundedRect(x - 17, y - 30, 34, 54, 6);
    }

    const sprite = scene.add
      .sprite(x, y + 10, AGENT_SPRITESHEET_KEY, getAgentSpriteFrame(agent))
      .setOrigin(0.5, 0.88)
      .setScale(isExpanded ? 1.7 : 1.55);

    layer.add(isSelected ? [shadow, selectionRing, sprite] : [shadow, sprite]);
  } else {
    const body = scene.add.graphics();
    body.fillStyle(0x1b2224, 0.14);
    body.fillRoundedRect(x - 13, y - 7, 28, 38, 5);
    body.fillStyle(roleVisual.fill, 1);
    body.fillRoundedRect(x - 11, y - 4, 22, 28, 5);
    body.fillStyle(0xf3d5a7, 1);
    body.fillRoundedRect(x - 9, y - 22, 18, 18, 5);
    body.fillStyle(roleVisual.stroke, 1);
    body.fillRect(x - 10, y - 24, 20, 7);
    body.lineStyle(isSelected ? 4 : 2, isSelected ? 0xf4f7ef : roleVisual.stroke, 1);
    body.strokeRoundedRect(x - 13, y - 24, 26, 50, 6);

    layer.add([shadow, body]);
  }
  renderStatusBadge(scene, layer, agent, x, y);

  if (!isCompact) {
    const labelBackground = scene.add.graphics();
    labelBackground.fillStyle(0x132225, isExpanded ? 0.92 : 0.82);
    labelBackground.fillRoundedRect(x - 58, y + 32, 116, isExpanded ? 40 : 24, 6);
    labelBackground.lineStyle(1, statusVisual.stroke, 0.58);
    labelBackground.strokeRoundedRect(x - 58, y + 32, 116, isExpanded ? 40 : 24, 6);

    const nameLabel = scene.add
      .text(x, y + 43, agent.agentName, {
        color: "#f2f6ef",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    layer.add([labelBackground, nameLabel]);

    if (isExpanded) {
      const statusLabel = scene.add
        .text(x, y + 59, agent.activity ?? statusVisual.label, {
          color: "#b8c8be",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "10px",
        })
        .setOrigin(0.5, 0.5);
      layer.add(statusLabel);
    }
  }

  const hitZone = scene.add
    .zone(x, y + 12, 76, 108)
    .setOrigin(0.5, 0.5)
    .setInteractive();
  hitZone.on("pointerdown", () => selectAgent(agent.agentId));

  layer.add(hitZone);
}

function renderStatusLegend(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  settings: TownProjectionSettings,
): void {
  if (settings.density === "compact") {
    return;
  }

  const x = 36;
  const y = scene.scale.height - 56;

  const title = scene.add.text(x, y - 26, "Status markers", {
    color: "#202124",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "13px",
    fontStyle: "700",
  });

  layer.add(title);

  STATUS_LEGEND_ORDER.forEach((status, index) => {
    const visual = STATUS_VISUALS[status];
    const itemX = x + index * 142;
    const marker = scene.add.graphics();
    marker.fillStyle(visual.fill, 1);
    marker.fillCircle(itemX + 9, y + 12, 8);
    marker.lineStyle(2, visual.stroke, 1);
    marker.strokeCircle(itemX + 9, y + 12, 8);

    const label = scene.add.text(itemX + 24, y + 4, visual.label, {
      color: "#343832",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px",
    });

    layer.add([marker, label]);
  });
}

export function renderAgents(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  worldState: WorldState,
  settings: TownProjectionSettings,
  townMap?: TownMapDefinition,
): void {
  const agents = Object.values(worldState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const positions = getAgentRenderPositions(worldState, townMap);

  for (const agent of agents) {
    const position = positions.get(agent.agentId) ?? { x: agent.x, y: agent.y };
    renderAgent(
      scene,
      layer,
      agent,
      agent.agentId === worldState.selectedAgentId,
      { x: position.x - agent.x, y: position.y - agent.y },
      settings,
    );
  }

  renderStatusLegend(scene, layer, settings);
}
