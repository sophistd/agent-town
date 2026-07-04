import Phaser from "phaser";

import type {
  TownDecorObject,
  TownMapDefinition,
  TownRouteObject,
  TownTerrainKind,
} from "./townMap";

const terrainPalette: Record<
  TownTerrainKind,
  { fill: number; alpha: number; stroke?: number; strokeAlpha?: number }
> = {
  grass: { fill: 0xdbe8d4, alpha: 1 },
  plaza: { fill: 0xd7c79f, alpha: 0.74, stroke: 0xbba66d, strokeAlpha: 0.58 },
  water: { fill: 0x7fb0bf, alpha: 0.92, stroke: 0xe6f2ee, strokeAlpha: 0.92 },
  district: { fill: 0xe7efd9, alpha: 0.38, stroke: 0xa5bb94, strokeAlpha: 0.3 },
};

function drawTerrain(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, map: TownMapDefinition) {
  const terrain = scene.add.graphics();

  for (const item of map.terrain) {
    const palette = terrainPalette[item.kind];

    terrain.fillStyle(palette.fill, palette.alpha);
    if (item.kind === "water") {
      terrain.fillRoundedRect(item.x, item.y, item.width, item.height, 28);
    } else {
      terrain.fillRoundedRect(item.x, item.y, item.width, item.height, item.kind === "grass" ? 0 : 16);
    }

    if (palette.stroke !== undefined) {
      terrain.lineStyle(2, palette.stroke, palette.strokeAlpha ?? 0.5);
      terrain.strokeRoundedRect(item.x, item.y, item.width, item.height, item.kind === "water" ? 28 : 16);
    }
  }

  for (let x = 34; x < scene.scale.width; x += 78) {
    for (let y = 42; y < scene.scale.height; y += 68) {
      terrain.fillStyle((x + y) % 3 === 0 ? 0xcfe1c8 : 0xe3efdc, 0.34);
      terrain.fillRect(x, y, 16, 10);
    }
  }

  layer.add(terrain);
}

function drawRoute(
  graphics: Phaser.GameObjects.Graphics,
  route: TownRouteObject,
  width: number,
  color: number,
  alpha: number,
): void {
  const [firstPoint, ...points] = route.points;

  if (firstPoint === undefined) {
    return;
  }

  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(firstPoint.x, firstPoint.y);

  for (const point of points) {
    graphics.lineTo(point.x, point.y);
  }

  graphics.strokePath();
}

function drawRoutes(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, map: TownMapDefinition) {
  const routeGraphics = scene.add.graphics();

  for (const route of map.routes) {
    drawRoute(routeGraphics, route, 34, 0xc8b88e, 0.9);
  }

  for (const route of map.routes) {
    drawRoute(routeGraphics, route, 10, 0xe8dec2, 0.95);
  }

  layer.add(routeGraphics);
}

function drawTree(graphics: Phaser.GameObjects.Graphics, decor: TownDecorObject): void {
  graphics.fillStyle(0x6f8f58, 1);
  graphics.fillCircle(decor.x, decor.y, 18);
  graphics.fillStyle(0x88aa69, 1);
  graphics.fillCircle(decor.x - 10, decor.y + 8, 13);
  graphics.fillCircle(decor.x + 11, decor.y + 7, 13);
  graphics.fillStyle(0x7a5633, 1);
  graphics.fillRect(decor.x - 4, decor.y + 18, 8, 17);
}

function drawLamp(graphics: Phaser.GameObjects.Graphics, decor: TownDecorObject): void {
  graphics.fillStyle(0x384840, 1);
  graphics.fillRect(decor.x - 2, decor.y - 12, 4, 24);
  graphics.fillStyle(0xf7d36b, 0.95);
  graphics.fillCircle(decor.x, decor.y - 16, 7);
}

function drawBench(graphics: Phaser.GameObjects.Graphics, decor: TownDecorObject): void {
  graphics.fillStyle(0x7a5633, 1);
  graphics.fillRoundedRect(decor.x - 18, decor.y - 5, 36, 8, 2);
  graphics.fillStyle(0x4c3524, 1);
  graphics.fillRect(decor.x - 14, decor.y + 3, 4, 10);
  graphics.fillRect(decor.x + 10, decor.y + 3, 4, 10);
}

function drawSign(graphics: Phaser.GameObjects.Graphics, decor: TownDecorObject): void {
  graphics.fillStyle(0x4c3524, 1);
  graphics.fillRect(decor.x - 3, decor.y - 2, 6, 28);
  graphics.fillStyle(0xd5c17e, 1);
  graphics.fillRoundedRect(decor.x - 28, decor.y - 20, 56, 22, 3);
  graphics.lineStyle(2, 0x958254, 1);
  graphics.strokeRoundedRect(decor.x - 28, decor.y - 20, 56, 22, 3);
}

function drawDecor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, map: TownMapDefinition) {
  const decorGraphics = scene.add.graphics();

  for (const decor of map.decor) {
    if (decor.kind === "tree") {
      drawTree(decorGraphics, decor);
    } else if (decor.kind === "lamp") {
      drawLamp(decorGraphics, decor);
    } else if (decor.kind === "bench") {
      drawBench(decorGraphics, decor);
    } else {
      drawSign(decorGraphics, decor);
    }
  }

  layer.add(decorGraphics);
}

export function renderTownMap(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  map: TownMapDefinition,
): void {
  drawTerrain(scene, layer, map);
  drawRoutes(scene, layer, map);

  const border = scene.add.graphics();
  border.lineStyle(2, 0x91a87d, 0.7);
  border.strokeRoundedRect(18, 18, scene.scale.width - 36, scene.scale.height - 36, 14);
  layer.add(border);

  drawDecor(scene, layer, map);
}
