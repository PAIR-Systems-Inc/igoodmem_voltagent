/**
 * E2E: Multi-space retrieval — validates that semantic search works
 * across multiple spaces simultaneously and that space isolation holds.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeRetrieveMemories } from "../../src/tools/retrieve-memories";
import { EMBEDDER_ID, client, deleteSpace, waitForProcessing } from "../helpers";

describe("Multi-Space Retrieval", () => {
  let spaceIdA: string;
  let spaceIdB: string;
  let memoryIdA: string;
  let memoryIdB: string;

  beforeAll(async () => {
    const ts = Date.now();

    // Create two separate spaces
    const spaceA = await executeCreateSpace(client, {
      name: `e2e-multispace-A-${ts}`,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });
    expect(spaceA.success).toBe(true);
    spaceIdA = spaceA.spaceId;

    const spaceB = await executeCreateSpace(client, {
      name: `e2e-multispace-B-${ts}`,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });
    expect(spaceB.success).toBe(true);
    spaceIdB = spaceB.spaceId;

    // Store a different document in each space
    const memA = await executeCreateMemory(client, {
      spaceId: spaceIdA,
      textContent:
        "The Great Wall of China is over 13,000 miles long. It was built over many centuries to protect against invasions.",
    });
    expect(memA.success).toBe(true);
    memoryIdA = memA.memoryId;

    const memB = await executeCreateMemory(client, {
      spaceId: spaceIdB,
      textContent:
        "The speed of light is approximately 299,792 kilometers per second. It is the fastest speed in the universe.",
    });
    expect(memB.success).toBe(true);
    memoryIdB = memB.memoryId;

    // Wait for both memories to finish processing
    await waitForProcessing(memoryIdA, 45000);
    await waitForProcessing(memoryIdB, 45000);
  }, 120000);

  afterAll(async () => {
    await executeDeleteMemory(client, { memoryId: memoryIdA }).catch(() => {});
    await executeDeleteMemory(client, { memoryId: memoryIdB }).catch(() => {});
    if (spaceIdA) await deleteSpace(spaceIdA);
    if (spaceIdB) await deleteSpace(spaceIdB);
  });

  it("should retrieve results when searching across both spaces", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "How long is the Great Wall?",
      spaceIds: [spaceIdA, spaceIdB],
      maxResults: 5,
      includeMemoryDefinition: true,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    const topText = result.results[0].chunkText.toLowerCase();
    expect(topText.includes("great wall") || topText.includes("china")).toBe(true);
  });

  it("should return results from both spaces with a broad query", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "famous facts about the world",
      spaceIds: [spaceIdA, spaceIdB],
      maxResults: 10,
      includeMemoryDefinition: false,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThanOrEqual(2);

    // Verify results reference memories from both spaces
    const memoryIdsInResults = result.results.map((r: any) => r.memoryId);
    expect(memoryIdsInResults).toContain(memoryIdA);
    expect(memoryIdsInResults).toContain(memoryIdB);
  });

  it("should not leak results from another space when querying a single space", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "speed of light kilometers per second",
      spaceIds: [spaceIdA], // Only space A (Great Wall content)
      maxResults: 5,
      includeMemoryDefinition: false,
      waitForIndexing: false,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);

    // No result should reference space B's memory
    for (const item of result.results) {
      expect(item.memoryId).not.toBe(memoryIdB);
    }
  });
});
