/**
 * E2E: Memory CRUD — create, get, delete against a live GoodMem server.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeGetMemory } from "../../src/tools/get-memory";
import { EMBEDDER_ID, client, deleteSpace } from "../helpers";

describe("Memory CRUD", () => {
  const spaceName = `e2e-memory-crud-${Date.now()}`;
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
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  it("should create a text memory", async () => {
    const result = await executeCreateMemory(client, {
      spaceId,
      textContent: "The capital of France is Paris.",
    });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBeTruthy();
    expect(result.spaceId).toBe(spaceId);
    expect(result.contentType).toBe("text/plain");

    memoryId = result.memoryId;
  });

  it("should get the memory by ID", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: false,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
    expect(result.memory.memoryId || result.memory.id).toBe(memoryId);
  });

  it("should get the memory with content", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: true,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
    // Content may or may not be immediately available depending on processing
    // but the request itself should succeed
  });

  it("should delete the memory", async () => {
    const result = await executeDeleteMemory(client, { memoryId });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBe(memoryId);
  });

  it("should fail to get a deleted memory", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: false,
    });

    expect(result.success).toBe(false);
  });
});
