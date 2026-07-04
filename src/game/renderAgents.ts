import Phaser from "phaser";

import type { AgentState, WorldState } from "../events/types";
import { selectAgent } from "../state/selectionStore";
import type { TownProjectionSettings } from "./projectionSettings";
import {
  ROLE_VISUALS,
  STATUS_LEGEND_ORDER,
  STATUS_VISUALS,
} from "./visualMapping";

export type RenderPosition = {
  x: number;
  y: number;
};

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

export function getAgentRenderPositions(worldState: WorldState): Map<string, RenderPosition> {
  const agents = Object.values(worldState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const offsets = getAgentOffsets(agents);
  const positions = new Map<string, RenderPosition>();

  for (const agent of agents) {
    const offset = offsets.get(agent.agentId) ?? { x: 0, y: 0 };
    positions.set(agent.agentId, {
      x: agent.x + offset.x,
      y: agent.y + offset.y,
    });
  }

  return positions;
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

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.16);
  shadow.fillEllipse(x + 2, y + 25, 44, 10);

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
        .text(x, y + 59, statusVisual.label, {
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
): void {
  const agents = Object.values(worldState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const positions = getAgentRenderPositions(worldState);

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
