from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TILE = 16
MAP_W = 65
MAP_H = 56
PIXEL_W = MAP_W * TILE
PIXEL_H = MAP_H * TILE

TILESET_PATH = PUBLIC / "tilesets" / "agent-town-v1.png"
AGENT_SPRITES_PATH = PUBLIC / "sprites" / "agent-roles-v1.png"
BUILDING_SPRITES_PATH = PUBLIC / "sprites" / "buildings-v1.png"
BACKGROUND_PATH = PUBLIC / "maps" / "town-v1-preview.png"
MAP_PATH = PUBLIC / "maps" / "town-v1.tiled.json"


PALETTES = {
    "town_hall": {"wall": "#ead9ad", "roof": "#c89b46", "dark": "#7d622e", "trim": "#fff2bf"},
    "library": {"wall": "#d7e7ee", "roof": "#7fa6c7", "dark": "#466980", "trim": "#eff8f7"},
    "archive": {"wall": "#dbe8c8", "roof": "#91b67c", "dark": "#506c3d", "trim": "#f2f5dc"},
    "square": {"wall": "#d7e7da", "roof": "#7eb09a", "dark": "#3e6f5d", "trim": "#edf5ec"},
    "workshop": {"wall": "#e0d7ef", "roof": "#957dc2", "dark": "#5e4b86", "trim": "#f5efff"},
    "review_room": {"wall": "#efd3cc", "roof": "#c77972", "dark": "#7e4a45", "trim": "#fff0ea"},
    "dispatch_board": {"wall": "#eadfbf", "roof": "#bda25c", "dark": "#78643b", "trim": "#fff4cf"},
}

LOCATIONS = [
    ("dispatch_board", "Dispatch Board", "queue", 426, 87, 158, 66),
    ("town_hall", "Town Hall", "planning", 163, 231, 174, 98),
    ("library", "Library", "research", 473, 201, 174, 98),
    ("archive", "Archive", "memory", 173, 601, 174, 98),
    ("square", "Square", "final square", 418, 396, 174, 98),
    ("workshop", "Workshop", "production", 498, 631, 174, 98),
    ("review_room", "Review Room", "review", 753, 451, 174, 98),
]

ROUTES = [
    ("queue to square", "dispatch_board", "square", [(505, 120), (505, 445)]),
    ("square to workshop", "square", "workshop", [(505, 445), (585, 680)]),
    ("square to planning", "square", "town_hall", [(505, 445), (250, 280)]),
    ("square to research", "square", "library", [(505, 445), (560, 250)]),
    ("square to memory", "square", "archive", [(505, 445), (260, 650)]),
    ("square to review", "square", "review_room", [(505, 445), (840, 500)]),
]

TREES = [
    (92, 190), (122, 740), (172, 112), (198, 808), (328, 120), (358, 750),
    (438, 780), (726, 146), (770, 754), (902, 210), (922, 694), (968, 374),
    (84, 476), (706, 218), (810, 274), (116, 392), (608, 822), (968, 604),
    (402, 114), (670, 96), (780, 682), (300, 818), (64, 820), (980, 782),
]

LAMPS = [(382, 348), (620, 392), (438, 590), (704, 574), (556, 162), (836, 398), (350, 520)]
BENCHES = [(478, 522), (550, 522), (346, 432), (676, 468), (536, 358)]
SIGNS = [(622, 124), (314, 596), (738, 642)]


def ensure_dirs() -> None:
    for path in [TILESET_PATH, AGENT_SPRITES_PATH, BUILDING_SPRITES_PATH, BACKGROUND_PATH, MAP_PATH]:
        path.parent.mkdir(parents=True, exist_ok=True)


def rgb(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))


def lighten(color: str, amount: int) -> tuple[int, int, int]:
    r, g, b = rgb(color)
    return (min(255, r + amount), min(255, g + amount), min(255, b + amount))


def darken(color: str, amount: int) -> tuple[int, int, int]:
    r, g, b = rgb(color)
    return (max(0, r - amount), max(0, g - amount), max(0, b - amount))


def draw_tile(draw: ImageDraw.ImageDraw, index: int, fill: str, accents: list[tuple[str, tuple[int, int, int, int]]]) -> None:
    x = (index % 8) * TILE
    y = (index // 8) * TILE
    draw.rectangle([x, y, x + TILE - 1, y + TILE - 1], fill=fill)
    for color, rect in accents:
        rx, ry, rw, rh = rect
        draw.rectangle([x + rx, y + ry, x + rx + rw - 1, y + ry + rh - 1], fill=color)


def create_tileset() -> None:
    image = Image.new("RGBA", (8 * TILE, 8 * TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    random.seed(9)
    tiles = [
        ("#cfe2bd", [("#bdd2a9", (2, 4, 3, 2)), ("#e0efcf", (10, 9, 2, 2))]),
        ("#d8e8c4", [("#c3d6ad", (5, 11, 4, 1)), ("#edf5d8", (12, 3, 2, 2))]),
        ("#c8ddba", [("#aac894", (3, 12, 2, 2)), ("#e3f1cf", (9, 5, 4, 1))]),
        ("#cbb786", [("#a8905e", (0, 7, 16, 2)), ("#e6d5a7", (3, 3, 3, 2)), ("#b9a16e", (10, 11, 4, 2))]),
        ("#dfd2aa", [("#baa778", (1, 1, 3, 2)), ("#cbb98f", (8, 7, 6, 2)), ("#f0e7c5", (2, 13, 5, 1))]),
        ("#d8c58e", [("#bba56c", (0, 0, 16, 1)), ("#bba56c", (0, 15, 16, 1)), ("#eee0b5", (5, 5, 4, 3))]),
        ("#78adbd", [("#5d8e9f", (0, 12, 16, 2)), ("#a8d0d6", (2, 4, 6, 1)), ("#d4eef0", (9, 9, 4, 1))]),
        ("#93c4cb", [("#6fa0af", (0, 0, 16, 2)), ("#d2eff1", (4, 5, 6, 1))]),
        ("#a8c99b", [("#6f8f58", (1, 1, 14, 14)), ("#88aa69", (4, 9, 8, 4)), ("#5f7b4d", (7, 7, 2, 8))]),
        ("#6f8f58", [("#8fac71", (2, 2, 12, 12)), ("#496a3d", (7, 8, 3, 8))]),
        ("#e6d5a7", [("#f0e7c5", (2, 2, 4, 2)), ("#b9a16e", (11, 9, 3, 3))]),
        ("#b8a16a", [("#725a37", (7, 1, 3, 15)), ("#d5c17e", (2, 3, 12, 5))]),
        ("#dbe8d4", [("#f0d86b", (6, 6, 4, 4)), ("#cf6f62", (10, 9, 3, 3)), ("#7fb0bf", (3, 11, 2, 2))]),
        ("#a6b89d", [("#6f805f", (0, 0, 16, 3)), ("#6f805f", (0, 13, 16, 3))]),
        ("#7a5633", [("#4f371f", (0, 6, 16, 3)), ("#d1b06c", (2, 2, 12, 3))]),
        ("#3b4a42", [("#f7d36b", (5, 2, 6, 6)), ("#2a302b", (7, 8, 2, 8))]),
    ]
    for index, (fill, accents) in enumerate(tiles):
        draw_tile(draw, index, fill, accents)
    image.save(TILESET_PATH)


def draw_building_sprite(draw: ImageDraw.ImageDraw, origin: tuple[int, int], location_id: str, w: int = 160, h: int = 112) -> None:
    x, y = origin
    p = PALETTES[location_id]
    draw.rectangle([x + 8, y + h - 18, x + w - 2, y + h - 6], fill=(46, 55, 45, 70))
    draw.rectangle([x + 22, y + 40, x + w - 22, y + 92], fill=p["wall"], outline=p["dark"])
    draw.rectangle([x + 28, y + 47, x + w - 28, y + 84], fill=lighten(p["wall"], 12))
    roof = [(x + 12, y + 42), (x + w // 2, y + 14), (x + w - 12, y + 42), (x + w - 22, y + 52), (x + 22, y + 52)]
    draw.polygon(roof, fill=p["roof"], outline=p["dark"])
    draw.line([x + 24, y + 52, x + w - 24, y + 52], fill=darken(p["roof"], 22), width=3)
    for i in range(3):
        wx = x + 38 + i * 34
        draw.rectangle([wx, y + 62, wx + 12, y + 78], fill="#fff4c0", outline=p["dark"])
        draw.line([wx + 6, y + 62, wx + 6, y + 78], fill=darken(p["trim"], 30))
    door_x = x + w // 2 - 9
    draw.rectangle([door_x, y + 70, door_x + 18, y + 92], fill=darken(p["roof"], 30), outline=p["dark"])
    draw.rectangle([door_x + 12, y + 80, door_x + 14, y + 82], fill="#f5dd72")
    if location_id in {"town_hall", "library", "review_room"}:
        draw.rectangle([x + w // 2 - 20, y + 26, x + w // 2 + 20, y + 42], fill=lighten(p["roof"], 10), outline=p["dark"])
    if location_id == "workshop":
        draw.rectangle([x + w - 38, y + 24, x + w - 25, y + 44], fill="#6b5947", outline=p["dark"])
        draw.rectangle([x + w - 34, y + 15, x + w - 27, y + 24], fill="#4f4338")
    if location_id == "dispatch_board":
        for i in range(5):
            px = x + 34 + i * 18
            draw.rectangle([px, y + 56, px + 10, y + 68], fill="#fff6cf", outline="#a28a56")


def create_building_sprites() -> None:
    sprite_w = 160
    sprite_h = 112
    image = Image.new("RGBA", (sprite_w * len(LOCATIONS), sprite_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for index, (location_id, *_rest) in enumerate(LOCATIONS):
        draw_building_sprite(draw, (index * sprite_w, 0), location_id, sprite_w, sprite_h)
    image.save(BUILDING_SPRITES_PATH)


def create_agent_sprites() -> None:
    roles = ["planner", "researcher", "coder", "reviewer", "memory", "critic", "orchestrator", "custom"]
    role_colors = ["#2f6f73", "#3b73a8", "#7a5aa8", "#aa5f4f", "#6d8e5b", "#9a6b38", "#465f85", "#6d6d6d"]
    rows = ["idle", "active", "blocked", "done"]
    sprite_w = 24
    sprite_h = 32
    image = Image.new("RGBA", (sprite_w * len(roles), sprite_h * len(rows)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row, status in enumerate(rows):
        for col, color in enumerate(role_colors):
            x = col * sprite_w
            y = row * sprite_h
            body = rgb(color)
            if status == "idle":
                body = tuple(max(0, c - 35) for c in body)
            elif status == "blocked":
                body = rgb("#d06b4b")
            elif status == "done":
                body = rgb("#72b880")
            draw.ellipse([x + 5, y + 25, x + 19, y + 30], fill=(0, 0, 0, 64))
            draw.rectangle([x + 8, y + 13, x + 16, y + 25], fill=body, outline="#20292a")
            draw.rectangle([x + 6, y + 9, x + 18, y + 15], fill=tuple(min(255, c + 26) for c in body), outline="#20292a")
            draw.rectangle([x + 7, y + 4, x + 17, y + 12], fill="#e8c390", outline="#5a4632")
            draw.rectangle([x + 7, y + 3, x + 17, y + 6], fill="#2b2e31")
            if status == "active":
                draw.rectangle([x + 18, y + 8, x + 22, y + 12], fill="#f4d45f")
            elif status == "blocked":
                draw.rectangle([x + 18, y + 5, x + 21, y + 16], fill="#f4d45f")
            elif status == "done":
                draw.rectangle([x + 18, y + 7, x + 22, y + 11], fill="#eaf6df")
                draw.rectangle([x + 20, y + 5, x + 22, y + 7], fill="#eaf6df")
    image.save(AGENT_SPRITES_PATH)


def draw_path(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]]) -> None:
    draw.line(points, fill="#bda66f", width=40, joint="curve")
    draw.line(points, fill="#d8c58e", width=26, joint="curve")
    for start, end in zip(points, points[1:]):
        sx, sy = start
        ex, ey = end
        distance = max(1, math.dist(start, end))
        steps = int(distance // 24)
        for i in range(steps + 1):
            t = i / max(1, steps)
            x = int(sx + (ex - sx) * t)
            y = int(sy + (ey - sy) * t)
            draw.rectangle([x - 3, y - 2, x + 3, y + 2], fill="#eee1b7")


def draw_tree(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.rectangle([x - 4, y + 16, x + 4, y + 31], fill="#7a5633")
    draw.ellipse([x - 20, y - 10, x + 16, y + 24], fill="#6f8f58", outline="#516d43")
    draw.ellipse([x - 4, y - 18, x + 24, y + 15], fill="#88aa69", outline="#5f7d4e")
    draw.ellipse([x - 24, y + 5, x + 5, y + 30], fill="#7ca061", outline="#5f7d4e")
    draw.rectangle([x - 10, y + 22, x - 7, y + 25], fill="#cfe2bd")


def draw_lamp(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.rectangle([x - 2, y - 10, x + 2, y + 14], fill="#39483e")
    draw.rectangle([x - 7, y - 18, x + 7, y - 8], fill="#f7d36b", outline="#7d6b35")
    draw.rectangle([x - 4, y - 20, x + 4, y - 18], fill="#2f3834")


def draw_bench(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.rectangle([x - 20, y - 7, x + 20, y], fill="#8c6339", outline="#4f371f")
    draw.rectangle([x - 17, y + 2, x + 17, y + 8], fill="#a47846", outline="#4f371f")
    draw.rectangle([x - 14, y + 8, x - 10, y + 17], fill="#4f371f")
    draw.rectangle([x + 10, y + 8, x + 14, y + 17], fill="#4f371f")


def create_background() -> None:
    random.seed(42)
    image = Image.new("RGBA", (PIXEL_W, PIXEL_H), "#cfe2bd")
    draw = ImageDraw.Draw(image)
    for ty in range(MAP_H):
        for tx in range(MAP_W):
            shade = random.choice(["#cfe2bd", "#d8e8c4", "#c8ddba"])
            draw.rectangle([tx * TILE, ty * TILE, tx * TILE + 15, ty * TILE + 15], fill=shade)
            if random.random() < 0.18:
                px = tx * TILE + random.randint(2, 13)
                py = ty * TILE + random.randint(2, 13)
                draw.rectangle([px, py, px + 2, py + 1], fill="#e4f1d2")
    for x, y, w, h in [(118, 196, 264, 178), (432, 166, 262, 182), (710, 404, 246, 184), (126, 566, 270, 190), (454, 590, 282, 210)]:
        draw.rounded_rectangle([x, y, x + w, y + h], radius=20, fill=(231, 239, 217, 112), outline=(139, 164, 123, 105), width=2)
    for name, _src, _dst, points in ROUTES:
        draw_path(draw, points)
    draw.rounded_rectangle([392, 356, 618, 532], radius=18, fill="#d8c58e", outline="#bca56d", width=3)
    draw.rounded_rectangle([456, 344, 554, 408], radius=28, fill="#78adbd", outline="#e1f1ef", width=4)
    draw.ellipse([487, 364, 524, 391], fill="#5d8e9f")
    building_sheet = Image.open(BUILDING_SPRITES_PATH).convert("RGBA")
    sprite_w = 160
    sprite_h = 112
    for index, (location_id, _label, _role, x, y, w, h) in enumerate(LOCATIONS):
        sprite = building_sheet.crop((index * sprite_w, 0, (index + 1) * sprite_w, sprite_h))
        image.alpha_composite(sprite, (int(x + w / 2 - sprite_w / 2), int(y + h - sprite_h + 20)))
    for x, y in TREES:
        draw_tree(draw, x, y)
    for x, y in LAMPS:
        draw_lamp(draw, x, y)
    for x, y in BENCHES:
        draw_bench(draw, x, y)
    for x, y in SIGNS:
        draw.rectangle([x - 3, y - 2, x + 3, y + 28], fill="#4c3524")
        draw.rounded_rectangle([x - 28, y - 20, x + 28, y + 2], radius=3, fill="#d5c17e", outline="#958254", width=2)
    for _ in range(90):
        x = random.randint(35, PIXEL_W - 35)
        y = random.randint(60, PIXEL_H - 60)
        if 390 < x < 630 and 330 < y < 540:
            continue
        color = random.choice(["#f0d86b", "#e28c76", "#a8c99b", "#8fb5d6"])
        draw.rectangle([x, y, x + 3, y + 2], fill=color)
    image.save(BACKGROUND_PATH)


def tile_layers() -> tuple[list[int], list[int], list[int]]:
    random.seed(77)
    base = []
    path = [0] * (MAP_W * MAP_H)
    detail = [0] * (MAP_W * MAP_H)
    for ty in range(MAP_H):
        for tx in range(MAP_W):
            base.append(random.choice([1, 1, 1, 2, 3]))
    for _name, _src, _dst, points in ROUTES:
        for start, end in zip(points, points[1:]):
            sx, sy = start[0] // TILE, start[1] // TILE
            ex, ey = end[0] // TILE, end[1] // TILE
            steps = int(max(abs(ex - sx), abs(ey - sy), 1))
            for i in range(steps + 1):
                t = i / max(1, steps)
                cx = round(sx + (ex - sx) * t)
                cy = round(sy + (ey - sy) * t)
                for oy in range(-1, 2):
                    for ox in range(-1, 2):
                        tx, ty = cx + ox, cy + oy
                        if 0 <= tx < MAP_W and 0 <= ty < MAP_H:
                            path[ty * MAP_W + tx] = 4
    for tx in range(24, 39):
        for ty in range(22, 34):
            path[ty * MAP_W + tx] = 6
    for tx in range(29, 35):
        for ty in range(21, 26):
            detail[ty * MAP_W + tx] = 7
    for x, y in TREES:
        tx, ty = x // TILE, y // TILE
        if 0 <= tx < MAP_W and 0 <= ty < MAP_H:
            detail[ty * MAP_W + tx] = 9
    for x, y in LAMPS:
        tx, ty = x // TILE, y // TILE
        if 0 <= tx < MAP_W and 0 <= ty < MAP_H:
            detail[ty * MAP_W + tx] = 16
    return base, path, detail


def terrain_objects() -> list[dict]:
    specs = [
        ("base meadow", "grass", 0, 0, PIXEL_W, PIXEL_H),
        ("central square paving", "plaza", 392, 356, 226, 176),
        ("reflecting pond", "water", 456, 344, 98, 64),
        ("planning lawn", "district", 118, 196, 264, 178),
        ("research terrace", "district", 432, 166, 262, 182),
        ("review ridge", "district", 710, 404, 246, 184),
        ("memory grove", "district", 126, 566, 270, 190),
        ("workshop yard", "district", 454, 590, 282, 210),
    ]
    objects = []
    for idx, (name, kind, x, y, w, h) in enumerate(specs, start=1):
        objects.append({"id": idx, "name": name, "type": "terrain", "x": x, "y": y, "width": w, "height": h, "properties": [{"name": "kind", "type": "string", "value": kind}]})
    return objects


def route_objects(start_id: int) -> list[dict]:
    objects = []
    for offset, (name, src, dst, points) in enumerate(ROUTES):
        x0, y0 = points[0]
        objects.append({
            "id": start_id + offset,
            "name": name,
            "type": "route",
            "x": x0,
            "y": y0,
            "polyline": [{"x": x - x0, "y": y - y0} for x, y in points],
            "properties": [
                {"name": "fromLocationId", "type": "string", "value": src},
                {"name": "toLocationId", "type": "string", "value": dst},
            ],
        })
    return objects


def location_objects(start_id: int) -> list[dict]:
    objects = []
    for offset, (location_id, label, role, x, y, w, h) in enumerate(LOCATIONS):
        objects.append({
            "id": start_id + offset,
            "name": label,
            "type": "location",
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "properties": [
                {"name": "locationId", "type": "string", "value": location_id},
                {"name": "projectionRole", "type": "string", "value": role},
                {"name": "spriteKey", "type": "string", "value": location_id},
            ],
        })
    return objects


def decor_objects(start_id: int) -> list[dict]:
    objects = []
    next_id = start_id
    for kind, items in [("tree", TREES), ("lamp", LAMPS), ("bench", BENCHES), ("sign", SIGNS)]:
        for x, y in items:
            objects.append({"id": next_id, "name": kind, "type": kind, "x": x, "y": y})
            next_id += 1
    return objects


def create_map_json() -> None:
    base, path, detail = tile_layers()
    layers = [
        {"id": 1, "name": "base", "type": "tilelayer", "width": MAP_W, "height": MAP_H, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": base},
        {"id": 2, "name": "paths-and-plaza", "type": "tilelayer", "width": MAP_W, "height": MAP_H, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": path},
        {"id": 3, "name": "detail", "type": "tilelayer", "width": MAP_W, "height": MAP_H, "x": 0, "y": 0, "opacity": 1, "visible": True, "data": detail},
        {"id": 4, "name": "terrain", "type": "objectgroup", "visible": True, "opacity": 1, "objects": terrain_objects()},
        {"id": 5, "name": "routes", "type": "objectgroup", "visible": True, "opacity": 1, "objects": route_objects(20)},
        {"id": 6, "name": "locations", "type": "objectgroup", "visible": True, "opacity": 1, "objects": location_objects(40)},
        {"id": 7, "name": "decor", "type": "objectgroup", "visible": True, "opacity": 1, "objects": decor_objects(70)},
    ]
    data = {
        "type": "map",
        "version": "1.10",
        "tiledversion": "1.11.0",
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "width": MAP_W,
        "height": MAP_H,
        "tilewidth": TILE,
        "tileheight": TILE,
        "infinite": False,
        "nextlayerid": 8,
        "nextobjectid": 200,
        "properties": [
            {"name": "mapId", "type": "string", "value": "town-v1-original-pixel-town"},
            {"name": "assetPolicy", "type": "string", "value": "project-authored-pixel-assets-no-external-art"},
            {"name": "runtimeBoundary", "type": "string", "value": "locations are projection targets; AgentEvent remains source of truth"},
            {"name": "backgroundImage", "type": "string", "value": "/maps/town-v1-preview.png"},
            {"name": "agentSpritesheet", "type": "string", "value": "/sprites/agent-roles-v1.png"},
            {"name": "buildingSpritesheet", "type": "string", "value": "/sprites/buildings-v1.png"},
        ],
        "tilesets": [{
            "firstgid": 1,
            "name": "agent-town-v1",
            "tilewidth": TILE,
            "tileheight": TILE,
            "columns": 8,
            "tilecount": 64,
            "image": "../tilesets/agent-town-v1.png",
            "imagewidth": 128,
            "imageheight": 128,
        }],
        "layers": layers,
    }
    MAP_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> None:
    ensure_dirs()
    create_tileset()
    create_building_sprites()
    create_agent_sprites()
    create_background()
    create_map_json()


if __name__ == "__main__":
    main()
