import Phaser from "phaser";

import type { ProjectionEdge, WorldState } from "../events/types";
import { getAgentRenderPositions } from "./renderAgents";

function edgeColor(edge: ProjectionEdge): number {
  if (edge.kind === "handoff") {
    return 0xb8862d;
  }

  if (edge.kind === "review") {
    return 0xa65f57;
  }

  if (edge.kind === "dependency") {
    return 0x6d6d6d;
  }

  return 0x4d8873;
}

function drawArrowHead(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 10;
  const leftAngle = angle + Math.PI * 0.82;
  const rightAngle = angle - Math.PI * 0.82;

  graphics.fillTriangle(
    toX,
    toY,
    toX + Math.cos(leftAngle) * size,
    toY + Math.sin(leftAngle) * size,
    toX + Math.cos(rightAngle) * size,
    toY + Math.sin(rightAngle) * size,
  );
}

export function renderEdges(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  worldState: WorldState,
): void {
  const positions = getAgentRenderPositions(worldState);
  const edges = worldState.edges.slice(-12);

  for (const edge of edges) {
    const from = positions.get(edge.fromAgentId);
    const to = positions.get(edge.toAgentId);

    if (from === undefined || to === undefined) {
      continue;
    }

    const color = edgeColor(edge);
    const graphics = scene.add.graphics();
    graphics.lineStyle(edge.kind === "handoff" ? 4 : 2, color, edge.kind === "handoff" ? 0.82 : 0.45);
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);
    graphics.lineTo(to.x, to.y);
    graphics.strokePath();
    graphics.fillStyle(color, edge.kind === "handoff" ? 0.9 : 0.55);
    drawArrowHead(graphics, from.x, from.y, to.x, to.y);

    layer.add(graphics);

    if (edge.kind === "handoff") {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const label = scene.add
        .text(midX, midY - 10, "handoff", {
          color: "#7a5320",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "700",
          backgroundColor: "#fffdfa",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 0.5);
      layer.add(label);
    }
  }
}
