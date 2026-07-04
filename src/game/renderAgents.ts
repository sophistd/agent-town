import Phaser from "phaser";

import type { AgentState, WorldState } from "../events/types";
import {
  ROLE_VISUALS,
  STATUS_LEGEND_ORDER,
  STATUS_VISUALS,
} from "./visualMapping";

function getAgentOffsets(agents: AgentState[]): Map<string, { x: number; y: number }> {
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
): void {
  const roleVisual = ROLE_VISUALS[agent.role];
  const statusVisual = STATUS_VISUALS[agent.status];
  const x = agent.x + offset.x;
  const y = agent.y + offset.y;

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.12);
  shadow.fillEllipse(x + 2, y + 24, 52, 12);

  const body = scene.add.graphics();
  body.fillStyle(roleVisual.fill, 1);
  body.fillCircle(x, y, 22);
  body.lineStyle(isSelected ? 5 : 3, isSelected ? 0x202124 : roleVisual.stroke, 1);
  body.strokeCircle(x, y, isSelected ? 25 : 22);

  renderStatusBadge(scene, layer, agent, x, y);

  const labelBackground = scene.add.graphics();
  labelBackground.fillStyle(0xffffff, 0.9);
  labelBackground.fillRoundedRect(x - 54, y + 30, 108, 36, 7);
  labelBackground.lineStyle(1, statusVisual.stroke, 0.45);
  labelBackground.strokeRoundedRect(x - 54, y + 30, 108, 36, 7);

  const nameLabel = scene.add
    .text(x, y + 40, agent.agentName, {
      color: "#202124",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "12px",
      fontStyle: "700",
    })
    .setOrigin(0.5, 0.5);

  const statusLabel = scene.add
    .text(x, y + 56, statusVisual.label, {
      color: "#4d514b",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "10px",
    })
    .setOrigin(0.5, 0.5);

  layer.add([shadow, body, labelBackground, nameLabel, statusLabel]);
}

function renderStatusLegend(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
): void {
  const x = 36;
  const y = 494;

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
): void {
  const agents = Object.values(worldState.agents).sort((left, right) =>
    left.agentId.localeCompare(right.agentId),
  );
  const offsets = getAgentOffsets(agents);

  for (const agent of agents) {
    renderAgent(
      scene,
      layer,
      agent,
      agent.agentId === worldState.selectedAgentId,
      offsets.get(agent.agentId) ?? { x: 0, y: 0 },
    );
  }

  renderStatusLegend(scene, layer);
}
