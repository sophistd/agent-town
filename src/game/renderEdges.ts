import Phaser from "phaser";

import type { ProjectionEdge, WorldState } from "../events/types";
import type { TownProjectionSettings } from "./projectionSettings";
import { getAgentRenderPositions } from "./renderAgents";
import type { TownMapDefinition } from "./townMap";

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

function drawDashedLine(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  const totalDistance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);
  const dash = 12;
  const gap = 8;
  const segment = dash + gap;

  if (totalDistance <= 0) {
    graphics.fillCircle(fromX, fromY, 4);
    return;
  }

  const steps = Math.max(1, Math.floor(totalDistance / segment));

  for (let index = 0; index <= steps; index += 1) {
    const startDistance = index * segment;
    const endDistance = Math.min(startDistance + dash, totalDistance);
    const startT = startDistance / totalDistance;
    const endT = endDistance / totalDistance;

    graphics.beginPath();
    graphics.moveTo(
      Phaser.Math.Linear(fromX, toX, startT),
      Phaser.Math.Linear(fromY, toY, startT),
    );
    graphics.lineTo(
      Phaser.Math.Linear(fromX, toX, endT),
      Phaser.Math.Linear(fromY, toY, endT),
    );
    graphics.strokePath();
  }
}

export function renderEdges(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  worldState: WorldState,
  settings: TownProjectionSettings,
  townMap?: TownMapDefinition,
): void {
  const positions = getAgentRenderPositions(worldState, townMap);
  const edgeLimit =
    settings.density === "compact" ? 5 : settings.density === "expanded" ? 18 : 12;
  const edges = worldState.edges.slice(-edgeLimit);

  for (const edge of edges) {
    const from = positions.get(edge.fromAgentId);
    const to = positions.get(edge.toAgentId);

    if (from === undefined || to === undefined) {
      continue;
    }

    const color = edgeColor(edge);
    const graphics = scene.add.graphics();
    graphics.lineStyle(
      edge.kind === "handoff" ? 4 : 3,
      color,
      edge.kind === "handoff" ? 0.86 : 0.58,
    );
    drawDashedLine(graphics, from.x, from.y, to.x, to.y);
    graphics.fillStyle(color, edge.kind === "handoff" ? 0.9 : 0.55);
    drawArrowHead(graphics, from.x, from.y, to.x, to.y);

    layer.add(graphics);

    if (edge.kind === "handoff" && settings.density !== "compact") {
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
