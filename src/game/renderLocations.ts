import Phaser from "phaser";

import type { TownProjectionSettings } from "./projectionSettings";
import type { TownMapDefinition } from "./townMap";
import { LOCATION_VISUALS } from "./visualMapping";

export function renderLocations(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  settings: TownProjectionSettings,
  townMap: TownMapDefinition,
): void {
  for (const location of townMap.locations) {
    const visual = LOCATION_VISUALS[location.locationId];
    const isCompact = settings.density === "compact";
    const width = location.width;
    const height = location.height;
    const x = location.x;
    const y = location.y;
    const centerX = location.anchorX;
    const centerY = location.anchorY;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x17211b, 0.22);
    shadow.fillRoundedRect(x + 8, y + 9, width, height, 8);

    const building = scene.add.graphics();
    building.fillStyle(visual.fill, 1);
    building.fillRoundedRect(x, y, width, height, 8);
    building.fillStyle(visual.roof, 1);
    building.fillRoundedRect(x + 10, y + 10, width - 20, Math.max(18, height * 0.33), 5);
    building.lineStyle(3, visual.stroke, 1);
    building.strokeRoundedRect(x, y, width, height, 8);
    building.lineStyle(1, 0xffffff, 0.58);
    building.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 5);

    for (let column = 0; column < 3; column += 1) {
      const windowX = x + 24 + column * 38;
      if (windowX > x + width - 28) {
        continue;
      }
      building.fillStyle(0xf8f1ce, 0.95);
      building.fillRect(windowX, y + height - 36, 15, 18);
      building.lineStyle(1, visual.stroke, 0.7);
      building.strokeRect(windowX, y + height - 36, 15, 18);
    }

    const label = scene.add
      .text(centerX, y - 14, isCompact ? visual.shortLabel : location.label, {
        backgroundColor: "#142024",
        color: "#f3f4ef",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: isCompact ? "13px" : "15px",
        fontStyle: "700",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0.5);

    layer.add([shadow, building, label]);

    if (!isCompact) {
      const shortLabel = scene.add
        .text(centerX, y + height + 16, visual.shortLabel, {
          color: "#35443a",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "700",
        })
        .setOrigin(0.5, 0.5);
      layer.add(shortLabel);
    }

    if (!isCompact && townMap.source === "asset") {
      const idLabel = scene.add
        .text(centerX, centerY + height / 2 - 14, location.projectionRole, {
          color: "#536057",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "700",
        })
        .setOrigin(0.5, 0.5);
      layer.add(idLabel);
    }
  }
}
