import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { AdapterWarning } from "../adapters/types";
import {
  mergePersistentMemoryRecords,
  type PersistentMemoryRecord,
} from "../events/persistentMemory";
import {
  parsePersistentMemorySnapshot,
  serializePersistentMemorySnapshot,
} from "./persistentMemoryStore";

const PERSISTENT_MEMORY_SOURCE = "memory";

export type FilePersistentMemoryLoadResult = {
  records: PersistentMemoryRecord[];
  warnings: AdapterWarning[];
};

export type FilePersistentMemoryMergeInput = {
  filePath: string;
  incomingRecords: readonly PersistentMemoryRecord[];
  maxRecords?: number;
  savedAt: string;
};

export type FilePersistentMemoryMergeResult = {
  records: PersistentMemoryRecord[];
  warnings: AdapterWarning[];
};

function warning(input: { code: string; message: string }): AdapterWarning {
  return {
    code: input.code,
    message: input.message,
    source: PERSISTENT_MEMORY_SOURCE,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "unknown file-system error";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}

function temporaryFilePath(filePath: string): string {
  return `${filePath}.tmp-${process.pid}-${Date.now()}`;
}

export async function loadFilePersistentMemoryRecords(
  filePath: string,
): Promise<FilePersistentMemoryLoadResult> {
  try {
    const raw = await readFile(filePath, "utf8");

    return parsePersistentMemorySnapshot(raw);
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return {
        records: [],
        warnings: [
          warning({
            code: "persistent_memory_file_missing",
            message: `Persistent memory file does not exist at ${filePath}.`,
          }),
        ],
      };
    }

    return {
      records: [],
      warnings: [
        warning({
          code: "persistent_memory_file_read_failed",
          message: `Persistent memory file could not be read at ${filePath}: ${errorMessage(error)}.`,
        }),
      ],
    };
  }
}

export async function saveFilePersistentMemoryRecords(
  filePath: string,
  records: readonly PersistentMemoryRecord[],
  savedAt: string,
): Promise<AdapterWarning[]> {
  const raw = serializePersistentMemorySnapshot(records, savedAt);
  const tmpPath = temporaryFilePath(filePath);

  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tmpPath, raw, { encoding: "utf8", flag: "wx" });
    await rename(tmpPath, filePath);

    return [];
  } catch (error) {
    let cleanupMessage: string | undefined;

    try {
      await rm(tmpPath, { force: true });
    } catch (cleanupError) {
      cleanupMessage = errorMessage(cleanupError);
    }

    return [
      warning({
        code: "persistent_memory_file_save_failed",
        message:
          cleanupMessage === undefined
            ? `Persistent memory records could not be written to ${filePath}: ${errorMessage(error)}.`
            : `Persistent memory records could not be written to ${filePath}: ${errorMessage(error)}. Temporary file cleanup also failed: ${cleanupMessage}.`,
      }),
    ];
  }
}

export async function mergeFilePersistentMemoryRecords(
  input: FilePersistentMemoryMergeInput,
): Promise<FilePersistentMemoryMergeResult> {
  const existing = await loadFilePersistentMemoryRecords(input.filePath);
  const records = mergePersistentMemoryRecords(
    existing.records,
    input.incomingRecords,
    input.maxRecords,
  );
  const saveWarnings = await saveFilePersistentMemoryRecords(
    input.filePath,
    records,
    input.savedAt,
  );

  return {
    records,
    warnings: [...existing.warnings, ...saveWarnings],
  };
}
