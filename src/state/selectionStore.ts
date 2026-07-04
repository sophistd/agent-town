import { useSyncExternalStore } from "react";

export type SelectionState = {
  selectedAgentId?: string;
  selectedEventId?: string;
};

type SelectionListener = () => void;

let selectionState: SelectionState = {};
const listeners = new Set<SelectionListener>();

function emitSelectionChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getSelectionSnapshot(): SelectionState {
  return selectionState;
}

export function subscribeToSelection(listener: SelectionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function selectAgent(agentId: string): void {
  selectionState = {
    ...selectionState,
    selectedAgentId: agentId,
  };
  emitSelectionChange();
}

export function selectEvent(eventId: string, agentId?: string): void {
  selectionState = {
    selectedEventId: eventId,
    selectedAgentId: agentId ?? selectionState.selectedAgentId,
  };
  emitSelectionChange();
}

export function useSelection(): SelectionState {
  return useSyncExternalStore(
    subscribeToSelection,
    getSelectionSnapshot,
    getSelectionSnapshot,
  );
}
