import Phaser from "phaser";

import type { AgentBubble, AgentState, WorldState } from "../events/types";
import { selectEvent } from "../state/selectionStore";
import { getAgentRenderPositions } from "./renderAgents";
import { BUBBLE_VISUALS } from "./visualMapping";

function truncateBubbleText(text: string): string {
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function renderBubble(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  agent: AgentState,
  bubble: AgentBubble,
  x: number,
  y: number,
): void {
  const visual = BUBBLE_VISUALS[bubble.kind];
  const text = truncateBubbleText(bubble.text);
  const width = Math.min(210, Math.max(112, text.length * 7 + 34));
  const height = 44;
  const bubbleX = Math.max(24, Math.min(936 - width, x - width / 2));
  const bubbleY = Math.max(38, y - 96);

  const box = scene.add.graphics();
  box.fillStyle(visual.fill, 0.94);
  box.fillRoundedRect(bubbleX, bubbleY, width, height, 9);
  box.lineStyle(2, visual.stroke, 1);
  box.strokeRoundedRect(bubbleX, bubbleY, width, height, 9);
  box.fillStyle(visual.stroke, 1);
  box.fillTriangle(x - 8, bubbleY + height, x + 8, bubbleY + height, x, bubbleY + height + 10);
  box.setInteractive(
    new Phaser.Geom.Rectangle(bubbleX, bubbleY, width, height + 10),
    Phaser.Geom.Rectangle.Contains,
  );
  box.on("pointerdown", () => selectEvent(bubble.eventId, agent.agentId));

  const marker = scene.add.text(bubbleX + 10, bubbleY + 8, visual.marker, {
    color: visual.text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "10px",
    fontStyle: "700",
  });

  const label = scene.add.text(bubbleX + 10, bubbleY + 22, text, {
    color: visual.text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "11px",
  });

  marker.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  marker.on("pointerdown", () => selectEvent(bubble.eventId, agent.agentId));
  label.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  label.on("pointerdown", () => selectEvent(bubble.eventId, agent.agentId));

  layer.add([box, marker, label]);
}

export function renderBubbles(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  worldState: WorldState,
): void {
  const positions = getAgentRenderPositions(worldState);

  for (const agent of Object.values(worldState.agents)) {
    if (agent.bubble === undefined) {
      continue;
    }

    const position = positions.get(agent.agentId);
    if (position === undefined) {
      continue;
    }

    renderBubble(scene, layer, agent, agent.bubble, position.x, position.y);
  }
}
