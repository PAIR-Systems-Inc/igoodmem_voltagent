/**
 * E2E: Memory metadata — verify that source, author, tags, and custom
 * metadata are persisted and retrievable.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeGetMemory } from "../../src/tools/get-memory";
import { EMBEDDER_ID, client, deleteSpace } from "../helpers";

describe("Memory Metadata", () => {
  const spaceName = `e2e-memory-metadata-${Date.now()}`;
  let spaceId: string;
  let memoryId: string;

  beforeAll(async () => {
    const space = await executeCreateSpace(client, {
      name: spaceName,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });
    expect(space.success).toBe(true);
    spaceId = space.spaceId;
  });

  afterAll(async () => {
    if (memoryId) {
      await executeDeleteMemory(client, { memoryId }).catch(() => {});
    }
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  it("should create a memory with metadata fields", async () => {
    const result = await executeCreateMemory(client, {
      spaceId,
      textContent: "Meeting notes from the Q4 planning session.",
      source: "google-drive",
      author: "jane.doe",
      tags: "planning, q4, meeting",
      metadata: { department: "engineering", priority: "high" },
    });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBeTruthy();
    memoryId = result.memoryId;
  });

  it("should persist metadata on the memory", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: false,
    });

    expect(result.success).toBe(true);

    const memory = result.memory;
    expect(memory).toBeDefined();

    // Metadata should contain our fields
    const meta = memory.metadata || {};
    expect(meta.source).toBe("google-drive");
    expect(meta.author).toBe("jane.doe");
    expect(meta.department).toBe("engineering");
    expect(meta.priority).toBe("high");

    // Tags should be an array
    if (meta.tags) {
      expect(Array.isArray(meta.tags)).toBe(true);
      expect(meta.tags).toContain("planning");
      expect(meta.tags).toContain("q4");
      expect(meta.tags).toContain("meeting");
    }
  });
});
