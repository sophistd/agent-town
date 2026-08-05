import type { AdapterWarning } from "../adapters/types";
import {
  isPersistentMemoryRecord,
  PERSISTENT_MEMORY_SCHEMA_VERSION,
  type PersistentMemoryRecord,
} from "../events/persistentMemory";

export const PERSISTENT_MEMORY_STORAGE_KEY = "agent-town:persistent-memory:v1";

const PERSISTENT_MEMORY_SOURCE = "memory";

export type StorageLike = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

export type PersistentMemorySnapshot = {
  schemaVersion: typeof PERSISTENT_MEMORY_SCHEMA_VERSION;
  savedAt: string;
  records: PersistentMemoryRecord[];
};

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function serializePersistentMemorySnapshot(
  records: readonly PersistentMemoryRecord[],
  savedAt: string,
): string {
  const snapshot: PersistentMemorySnapshot = {
    schemaVersion: PERSISTENT_MEMORY_SCHEMA_VERSION,
    savedAt,
    records: [...records],
  };

  return JSON.stringify(snapshot);
}

export function parsePersistentMemorySnapshot(raw: string): {
  records: PersistentMemoryRecord[];
  warnings: AdapterWarning[];
} {
  try {
    const snapshot = JSON.parse(raw);

    if (
      !isRecord(snapshot) ||
      snapshot.schemaVersion !== PERSISTENT_MEMORY_SCHEMA_VERSION ||
      !Array.isArray(snapshot.records)
    ) {
      return {
        records: [],
        warnings: [
          {
            code: "invalid_persistent_memory_snapshot",
            message: "Persistent memory snapshot has an unsupported shape.",
            source: PERSISTENT_MEMORY_SOURCE,
          },
        ],
      };
    }

    const records = snapshot.records.filter(isPersistentMemoryRecord);
    const droppedCount = snapshot.records.length - records.length;

    return {
      records,
      warnings:
        droppedCount > 0
          ? [
              {
                code: "invalid_persistent_memory_record",
                message: `${droppedCount} persistent memory records were ignored.`,
                source: PERSISTENT_MEMORY_SOURCE,
              },
            ]
          : [],
    };
  } catch {
    return {
      records: [],
      warnings: [
        {
          code: "invalid_persistent_memory_json",
          message: "Persistent memory snapshot is not valid JSON.",
          source: PERSISTENT_MEMORY_SOURCE,
        },
      ],
    };
  }
}

export function loadPersistentMemoryRecords(storage: StorageLike | undefined): {
  records: PersistentMemoryRecord[];
  warnings: AdapterWarning[];
} {
  if (storage === undefined) {
    return { records: [], warnings: [] };
  }

  const raw = storage.getItem(PERSISTENT_MEMORY_STORAGE_KEY);

  return raw === null ? { records: [], warnings: [] } : parsePersistentMemorySnapshot(raw);
}

export function savePersistentMemoryRecords(
  storage: StorageLike | undefined,
  records: readonly PersistentMemoryRecord[],
  savedAt: string,
): AdapterWarning[] {
  if (storage === undefined) {
    return [
      {
        code: "persistent_memory_storage_unavailable",
        message: "Browser storage is unavailable; memory records were not persisted.",
        source: PERSISTENT_MEMORY_SOURCE,
      },
    ];
  }

  try {
    storage.setItem(
      PERSISTENT_MEMORY_STORAGE_KEY,
      serializePersistentMemorySnapshot(records, savedAt),
    );
    return [];
  } catch {
    return [
      {
        code: "persistent_memory_save_failed",
        message: "Persistent memory records could not be written to browser storage.",
        source: PERSISTENT_MEMORY_SOURCE,
      },
    ];
  }
}
