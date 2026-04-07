/**
 * E2E: Semantic retrieval — the most important test.
 * Validates the full pipeline: store → chunk → embed → retrieve via similarity.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeRetrieveMemories } from "../../src/tools/retrieve-memories";
import { EMBEDDER_ID, client, deleteSpace, waitForProcessing } from "../helpers";

describe("Semantic Retrieval", () => {
  const spaceName = `e2e-semantic-retrieval-${Date.now()}`;
  let spaceId: string;
  const memoryIds: string[] = [];

  const documents = [
    "The capital of France is Paris. The Eiffel Tower is a famous landmark in Paris, built in 1889.",
    "Python is a programming language created by Guido van Rossum. It emphasizes code readability.",
    "The mitochondria is the powerhouse of the cell. It generates most of the cell's supply of ATP.",
  ];

  beforeAll(async () => {
    // Create space
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

    // Store all documents
    for (const text of documents) {
      const result = await executeCreateMemory(client, {
        spaceId,
        textContent: text,
      });
      expect(result.success).toBe(true);
      memoryIds.push(result.memoryId);
    }

    // Wait for all memories to finish processing (chunking + embedding)
    for (const id of memoryIds) {
      await waitForProcessing(id, 45000);
    }
  }, 90000); // generous timeout for setup

  afterAll(async () => {
    for (const id of memoryIds) {
      await executeDeleteMemory(client, { memoryId: id }).catch(() => {});
    }
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  it("should retrieve results for a geography query", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "What is the capital of France?",
      spaceIds: [spaceId],
      maxResults: 5,
      includeMemoryDefinition: true,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    // Top result should reference France/Paris
    const topChunk = result.results[0];
    expect(topChunk).toBeDefined();
    expect(topChunk.chunkText).toBeTruthy();

    const text = topChunk.chunkText.toLowerCase();
    expect(text.includes("france") || text.includes("paris")).toBe(true);
  });

  it("should retrieve results for a programming query", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "programming language",
      spaceIds: [spaceId],
      maxResults: 5,
      includeMemoryDefinition: true,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    const topChunk = result.results[0];
    expect(topChunk.chunkText).toBeTruthy();

    const text = topChunk.chunkText.toLowerCase();
    expect(text.includes("python") || text.includes("programming")).toBe(true);
  });

  it("should retrieve results for a biology query", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "What produces energy in a cell?",
      spaceIds: [spaceId],
      maxResults: 5,
      includeMemoryDefinition: true,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    const topChunk = result.results[0];
    expect(topChunk.chunkText).toBeTruthy();

    const text = topChunk.chunkText.toLowerCase();
    expect(text.includes("mitochondria") || text.includes("cell") || text.includes("atp")).toBe(
      true,
    );
  });

  it("should include memory definitions when requested", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "France",
      spaceIds: [spaceId],
      maxResults: 3,
      includeMemoryDefinition: true,
      waitForIndexing: false,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    // When includeMemoryDefinition is true, memories array should be populated
    if (result.totalResults > 0) {
      expect(result.memories).toBeDefined();
    }
  });

  it("should return relevance scores with results", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "Paris Eiffel Tower",
      spaceIds: [spaceId],
      maxResults: 3,
      includeMemoryDefinition: false,
      waitForIndexing: false,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    if (result.totalResults > 0) {
      for (const item of result.results) {
        expect(item.relevanceScore).toBeDefined();
        expect(typeof item.relevanceScore).toBe("number");
      }
    }
  });
});
