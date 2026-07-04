import { useSyncExternalStore } from "react";

import type { AgentEvent } from "../events/types";

export type PlaybackSnapshot = {
  cursor: number;
  isPlaying: boolean;
  intervalMs: number;
};

type PlaybackListener = () => void;

const DEFAULT_INTERVAL_MS = 900;
const MIN_INTERVAL_MS = 250;
const MAX_INTERVAL_MS = 2400;

let playbackSnapshot: PlaybackSnapshot = {
  cursor: 0,
  isPlaying: false,
  intervalMs: DEFAULT_INTERVAL_MS,
};

const listeners = new Set<PlaybackListener>();

function emitPlaybackChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function commitPlayback(nextSnapshot: PlaybackSnapshot): void {
  if (
    nextSnapshot.cursor === playbackSnapshot.cursor &&
    nextSnapshot.isPlaying === playbackSnapshot.isPlaying &&
    nextSnapshot.intervalMs === playbackSnapshot.intervalMs
  ) {
    return;
  }

  playbackSnapshot = nextSnapshot;
  emitPlaybackChange();
}

export function clampCursor(cursor: number, eventCount: number): number {
  if (eventCount <= 0) {
    return -1;
  }

  return Math.min(Math.max(cursor, 0), eventCount - 1);
}

export function getPlaybackSnapshot(): PlaybackSnapshot {
  return playbackSnapshot;
}

export function subscribeToPlayback(listener: PlaybackListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePlayback(): PlaybackSnapshot {
  return useSyncExternalStore(
    subscribeToPlayback,
    getPlaybackSnapshot,
    getPlaybackSnapshot,
  );
}

export function setPlaybackCursor(cursor: number, eventCount: number): void {
  commitPlayback({
    ...playbackSnapshot,
    cursor: clampCursor(cursor, eventCount),
    isPlaying: false,
  });
}

export function playPlayback(eventCount: number): void {
  if (eventCount <= 0) {
    commitPlayback({ ...playbackSnapshot, cursor: -1, isPlaying: false });
    return;
  }

  const cursor =
    playbackSnapshot.cursor >= eventCount - 1
      ? 0
      : clampCursor(playbackSnapshot.cursor, eventCount);

  commitPlayback({ ...playbackSnapshot, cursor, isPlaying: true });
}

export function pausePlayback(): void {
  commitPlayback({ ...playbackSnapshot, isPlaying: false });
}

export function setPlaybackInterval(intervalMs: number): void {
  const clampedIntervalMs = Math.min(
    MAX_INTERVAL_MS,
    Math.max(MIN_INTERVAL_MS, intervalMs),
  );

  commitPlayback({ ...playbackSnapshot, intervalMs: clampedIntervalMs });
}

export function stepPrevious(eventCount: number): void {
  commitPlayback({
    ...playbackSnapshot,
    cursor: clampCursor(playbackSnapshot.cursor - 1, eventCount),
    isPlaying: false,
  });
}

export function stepNext(eventCount: number): void {
  commitPlayback({
    ...playbackSnapshot,
    cursor: clampCursor(playbackSnapshot.cursor + 1, eventCount),
    isPlaying: false,
  });
}

export function advancePlayback(eventCount: number): void {
  if (eventCount <= 0) {
    commitPlayback({ ...playbackSnapshot, cursor: -1, isPlaying: false });
    return;
  }

  const nextCursor = clampCursor(playbackSnapshot.cursor + 1, eventCount);

  commitPlayback({
    ...playbackSnapshot,
    cursor: nextCursor,
    isPlaying: nextCursor < eventCount - 1,
  });
}

export function getPlaybackEvent(
  events: readonly AgentEvent[],
  cursor = playbackSnapshot.cursor,
): AgentEvent | undefined {
  return events[clampCursor(cursor, events.length)];
}
