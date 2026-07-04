import Phaser from "phaser";

import { LOCATION_COORDINATES } from "../events/routing";
import type { AgentLocation } from "../events/types";
import { LOCATION_VISUALS } from "./visualMapping";

const RENDERED_LOCATIONS: Array<Exclude<AgentLocation, "unknown">> = [
  "dispatch_board",
  "town_hall",
  "library",
  "archive",
  "square",
  "workshop",
  "review_room",
];

export function renderLocations(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
): void {
  for (const location of RENDERED_LOCATIONS) {
    const coordinates = LOCATION_COORDINATES[location];
    const visual = LOCATION_VISUALS[location];
    const width = location === "dispatch_board" ? 152 : 168;
    const height = location === "dispatch_board" ? 62 : 92;
    const x = coordinates.x - width / 2;
    const y = coordinates.y - height / 2;

    const building = scene.add.graphics();
    building.fillStyle(visual.fill, 1);
    building.fillRoundedRect(x, y, width, height, 10);
    building.lineStyle(3, visual.stroke, 1);
    building.strokeRoundedRect(x, y, width, height, 10);
    building.lineStyle(1, 0xffffff, 0.7);
    building.strokeRoundedRect(x + 7, y + 7, width - 14, height - 14, 7);

    const label = scene.add
      .text(coordinates.x, y + 20, visual.label, {
        color: "#202124",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    const shortLabel = scene.add
      .text(coordinates.x, y + height - 22, visual.shortLabel, {
        color: "#4d514b",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
      })
      .setOrigin(0.5, 0.5);

    layer.add([building, label, shortLabel]);
  }
}
