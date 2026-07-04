import type {
  AgentLocation,
  AgentRole,
  AgentStateStatus,
  BubbleKind,
} from "../events/types";

export type LocationVisual = {
  label: string;
  shortLabel: string;
  fill: number;
  roof: number;
  stroke: number;
};

export type RoleVisual = {
  label: string;
  fill: number;
  stroke: number;
};

export type StatusVisual = {
  label: string;
  family: "idle" | "active" | "waiting" | "blocked" | "error" | "done";
  fill: number;
  stroke: number;
  marker: string;
};

export type BubbleVisual = {
  marker: string;
  fill: number;
  stroke: number;
  text: string;
};

export const LOCATION_VISUALS: Record<Exclude<AgentLocation, "unknown">, LocationVisual> = {
  town_hall: {
    label: "Town Hall",
    shortLabel: "Planning",
    fill: 0xf5ead5,
    roof: 0xdabf83,
    stroke: 0xb88a3d,
  },
  library: {
    label: "Library",
    shortLabel: "Research",
    fill: 0xe2eef7,
    roof: 0x9dbdd7,
    stroke: 0x527f9f,
  },
  workshop: {
    label: "Workshop",
    shortLabel: "Build",
    fill: 0xeee7f6,
    roof: 0xb7a3d6,
    stroke: 0x7a639d,
  },
  archive: {
    label: "Archive",
    shortLabel: "Memory",
    fill: 0xe5f0df,
    roof: 0xa8c99b,
    stroke: 0x6d8e5b,
  },
  review_room: {
    label: "Review Room",
    shortLabel: "Review",
    fill: 0xf6e2df,
    roof: 0xd89a90,
    stroke: 0xa65f57,
  },
  dispatch_board: {
    label: "Dispatch Board",
    shortLabel: "Queue",
    fill: 0xf1eddc,
    roof: 0xd5c17e,
    stroke: 0x958254,
  },
  square: {
    label: "Square",
    shortLabel: "Current / Done",
    fill: 0xe8f0ec,
    roof: 0x96c1af,
    stroke: 0x4d8873,
  },
};

export const ROLE_VISUALS: Record<AgentRole, RoleVisual> = {
  planner: { label: "Planner", fill: 0x2f6f73, stroke: 0x1d4f52 },
  researcher: { label: "Researcher", fill: 0x3b73a8, stroke: 0x244f78 },
  coder: { label: "Coder", fill: 0x7a5aa8, stroke: 0x59407d },
  reviewer: { label: "Reviewer", fill: 0xaa5f4f, stroke: 0x7c4236 },
  memory: { label: "Memory", fill: 0x6d8e5b, stroke: 0x4d6a3e },
  critic: { label: "Critic", fill: 0x9a6b38, stroke: 0x6f4c26 },
  orchestrator: { label: "Orchestrator", fill: 0x465f85, stroke: 0x2f4261 },
  custom: { label: "Custom", fill: 0x6d6d6d, stroke: 0x4f4f4f },
};

export const STATUS_VISUALS: Record<AgentStateStatus, StatusVisual> = {
  idle: {
    label: "Idle",
    family: "idle",
    fill: 0xd8d8d2,
    stroke: 0x9a9a91,
    marker: "idle",
  },
  thinking: {
    label: "Thinking",
    family: "active",
    fill: 0xf2cb56,
    stroke: 0x9c7622,
    marker: "think",
  },
  walking: {
    label: "Walking",
    family: "active",
    fill: 0x73a7d8,
    stroke: 0x44759e,
    marker: "move",
  },
  talking: {
    label: "Talking",
    family: "active",
    fill: 0x6fc4a5,
    stroke: 0x43806b,
    marker: "talk",
  },
  working: {
    label: "Working",
    family: "active",
    fill: 0x8d7bd3,
    stroke: 0x5f50a0,
    marker: "work",
  },
  waiting: {
    label: "Waiting",
    family: "waiting",
    fill: 0xd6c372,
    stroke: 0x8f7d35,
    marker: "wait",
  },
  blocked: {
    label: "Blocked",
    family: "blocked",
    fill: 0xf09a58,
    stroke: 0x9a5c2d,
    marker: "block",
  },
  error: {
    label: "Error",
    family: "error",
    fill: 0xdf5c53,
    stroke: 0x8f332f,
    marker: "error",
  },
  done: {
    label: "Done",
    family: "done",
    fill: 0x72b880,
    stroke: 0x47784f,
    marker: "done",
  },
};

export const STATUS_LEGEND_ORDER: AgentStateStatus[] = [
  "idle",
  "thinking",
  "waiting",
  "blocked",
  "error",
  "done",
];

export const BUBBLE_VISUALS: Record<BubbleKind, BubbleVisual> = {
  thought: {
    marker: "THOUGHT",
    fill: 0xfff6d8,
    stroke: 0xb88a3d,
    text: "#2f2a1d",
  },
  message: {
    marker: "MESSAGE",
    fill: 0xe9f4f2,
    stroke: 0x4d8873,
    text: "#1f3832",
  },
  tool: {
    marker: "TOOL / MEMORY",
    fill: 0xeee7f6,
    stroke: 0x7a639d,
    text: "#302942",
  },
  error: {
    marker: "BLOCKED / ERROR",
    fill: 0xf9e0d8,
    stroke: 0xa65f57,
    text: "#4b2420",
  },
  done: {
    marker: "DONE",
    fill: 0xe7f3e7,
    stroke: 0x47784f,
    text: "#233b27",
  },
};
