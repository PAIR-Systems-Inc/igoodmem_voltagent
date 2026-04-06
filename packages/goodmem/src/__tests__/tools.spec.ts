/**
 * Unit tests for all GoodMem tool execute functions.
 * Uses a mocked GoodMemClient to test tool logic without a live API.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoodMemClient } from "../client";
import { executeCreateMemory } from "../tools/create-memory";
import { executeCreateSpace } from "../tools/create-space";
import { executeDeleteMemory } from "../tools/delete-memory";
import { executeGetMemory } from "../tools/get-memory";
import { executeListEmbedders } from "../tools/list-embedders";
import { executeListSpaces } from "../tools/list-spaces";
import { executeRetrieveMemories } from "../tools/retrieve-memories";

// ============================================================================
// Mock Client Factory
// ============================================================================

function createMockClient() {
  return {
    request: vi.fn(),
    requestText: vi.fn(),
  } as unknown as GoodMemClient & {
    request: ReturnType<typeof vi.fn>;
    requestText: ReturnType<typeof vi.fn>;
  };
}

// ============================================================================
// List Embedders
// ============================================================================

describe("executeListEmbedders", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should return embedders from array response", async () => {
    client.request.mockResolvedValueOnce([
      { embedderId: "emb-1", displayName: "Model A", modelIdentifier: "model-a" },
      { embedderId: "emb-2", displayName: "Model B", modelIdentifier: "model-b" },
    ]);

    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(true);
    expect(result.embedders).toHaveLength(2);
    expect(result.embedders[0].embedderId).toBe("emb-1");
    expect(result.totalEmbedders).toBe(2);
    expect(client.request).toHaveBeenCalledWith("GET", "/v1/embedders");
  });

  it("should handle wrapped response with embedders key", async () => {
    client.request.mockResolvedValueOnce({
      embedders: [{ embedderId: "emb-1", displayName: "Model A", modelIdentifier: "model-a" }],
    });

    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(true);
    expect(result.embedders).toHaveLength(1);
  });

  it("should fallback to id/name/model fields", async () => {
    client.request.mockResolvedValueOnce([{ id: "emb-1", name: "Model A", model: "model-a" }]);

    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(true);
    expect(result.embedders[0].embedderId).toBe("emb-1");
    expect(result.embedders[0].displayName).toBe("Model A");
    expect(result.embedders[0].modelIdentifier).toBe("model-a");
  });

  it("should return error on API failure", async () => {
    client.request.mockRejectedValueOnce(new Error("Network error"));

    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
  });
});

// ============================================================================
// List Spaces
// ============================================================================

describe("executeListSpaces", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should return spaces from array response", async () => {
    client.request.mockResolvedValueOnce([
      { spaceId: "sp-1", name: "Space One" },
      { spaceId: "sp-2", name: "Space Two" },
    ]);

    const result = await executeListSpaces(client, {});

    expect(result.success).toBe(true);
    expect(result.spaces).toHaveLength(2);
    expect(result.spaces[0].spaceId).toBe("sp-1");
    expect(result.totalSpaces).toBe(2);
  });

  it("should handle wrapped response with spaces key", async () => {
    client.request.mockResolvedValueOnce({
      spaces: [{ spaceId: "sp-1", name: "Space One" }],
    });

    const result = await executeListSpaces(client, {});

    expect(result.success).toBe(true);
    expect(result.spaces).toHaveLength(1);
  });

  it("should fallback to id field", async () => {
    client.request.mockResolvedValueOnce([{ id: "sp-1" }]);

    const result = await executeListSpaces(client, {});

    expect(result.success).toBe(true);
    expect(result.spaces[0].spaceId).toBe("sp-1");
    expect(result.spaces[0].name).toBe("Unnamed");
  });

  it("should return error on API failure", async () => {
    const error: any = new Error("Forbidden");
    error.status = 403;
    error.responseBody = { message: "Invalid API key" };
    client.request.mockRejectedValueOnce(error);

    const result = await executeListSpaces(client, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
    expect(result.details).toEqual({ message: "Invalid API key" });
  });
});

// ============================================================================
// Create Space
// ============================================================================

describe("executeCreateSpace", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  const defaultInput = {
    name: "test-space",
    embedderId: "emb-1",
    chunkSize: 256,
    chunkOverlap: 25,
    keepStrategy: "KEEP_END" as const,
    lengthMeasurement: "CHARACTER_COUNT" as const,
  };

  it("should create a new space when name does not exist", async () => {
    // List returns no matching space
    client.request.mockResolvedValueOnce({ spaces: [] });
    // Create succeeds
    client.request.mockResolvedValueOnce({
      spaceId: "sp-new",
      name: "test-space",
    });

    const result = await executeCreateSpace(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.spaceId).toBe("sp-new");
    expect(result.reused).toBe(false);
    expect(result.message).toContain("created successfully");
  });

  it("should reuse existing space when name matches", async () => {
    client.request.mockResolvedValueOnce({
      spaces: [{ spaceId: "sp-existing", name: "test-space" }],
    });

    const result = await executeCreateSpace(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.spaceId).toBe("sp-existing");
    expect(result.reused).toBe(true);
    expect(result.message).toContain("reusing");
    // Should only call list, not create
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("should proceed to create when list fails", async () => {
    // List fails
    client.request.mockRejectedValueOnce(new Error("list error"));
    // Create succeeds
    client.request.mockResolvedValueOnce({
      spaceId: "sp-new",
      name: "test-space",
    });

    const result = await executeCreateSpace(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.spaceId).toBe("sp-new");
  });

  it("should return error when create fails", async () => {
    // List returns empty
    client.request.mockResolvedValueOnce({ spaces: [] });
    // Create fails
    const error: any = new Error("Validation error");
    error.responseBody = { details: "Invalid embedder" };
    client.request.mockRejectedValueOnce(error);

    const result = await executeCreateSpace(client, defaultInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Validation error");
    expect(result.details).toEqual({ details: "Invalid embedder" });
  });

  it("should send correct chunking config in request body", async () => {
    client.request.mockResolvedValueOnce({ spaces: [] });
    client.request.mockResolvedValueOnce({ spaceId: "sp-1", name: "test" });

    await executeCreateSpace(client, defaultInput);

    const createCall = client.request.mock.calls[1];
    expect(createCall[0]).toBe("POST");
    expect(createCall[1]).toBe("/v1/spaces");
    const body = createCall[2];
    expect(body.name).toBe("test-space");
    expect(body.spaceEmbedders[0].embedderId).toBe("emb-1");
    expect(body.defaultChunkingConfig.recursive.chunkSize).toBe(256);
    expect(body.defaultChunkingConfig.recursive.chunkOverlap).toBe(25);
  });
});

// ============================================================================
// Create Memory
// ============================================================================

describe("executeCreateMemory", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should create text memory", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-1",
      spaceId: "sp-1",
      processingStatus: "PENDING",
    });

    const result = await executeCreateMemory(client, {
      spaceId: "sp-1",
      textContent: "Hello world",
    });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBe("mem-1");
    expect(result.contentType).toBe("text/plain");

    const body = client.request.mock.calls[0][2];
    expect(body.spaceId).toBe("sp-1");
    expect(body.contentType).toBe("text/plain");
    expect(body.originalContent).toBe("Hello world");
  });

  it("should create binary file memory with base64", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-2",
      spaceId: "sp-1",
    });

    const result = await executeCreateMemory(client, {
      spaceId: "sp-1",
      fileBase64: "dGVzdA==",
      fileExtension: "pdf",
    });

    expect(result.success).toBe(true);
    expect(result.contentType).toBe("application/pdf");

    const body = client.request.mock.calls[0][2];
    expect(body.originalContentB64).toBe("dGVzdA==");
  });

  it("should decode text-type base64 files to plain text", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-3",
      spaceId: "sp-1",
    });

    const textBase64 = Buffer.from("Hello text file").toString("base64");
    const result = await executeCreateMemory(client, {
      spaceId: "sp-1",
      fileBase64: textBase64,
      fileExtension: "txt",
    });

    expect(result.success).toBe(true);
    expect(result.contentType).toBe("text/plain");

    const body = client.request.mock.calls[0][2];
    expect(body.originalContent).toBe("Hello text file");
    expect(body.originalContentB64).toBeUndefined();
  });

  it("should fallback to octet-stream for unknown extensions", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-4",
      spaceId: "sp-1",
    });

    await executeCreateMemory(client, {
      spaceId: "sp-1",
      fileBase64: "dGVzdA==",
      fileExtension: "xyz",
    });

    const body = client.request.mock.calls[0][2];
    expect(body.contentType).toBe("application/octet-stream");
  });

  it("should reject when no content is provided", async () => {
    const result = await executeCreateMemory(client, {
      spaceId: "sp-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No content provided");
    // Should never call the API
    expect(client.request).not.toHaveBeenCalled();
  });

  it("should prioritize fileBase64 over textContent", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-5",
      spaceId: "sp-1",
    });

    await executeCreateMemory(client, {
      spaceId: "sp-1",
      fileBase64: "dGVzdA==",
      fileExtension: "pdf",
      textContent: "This should be ignored",
    });

    const body = client.request.mock.calls[0][2];
    expect(body.contentType).toBe("application/pdf");
    expect(body.originalContentB64).toBe("dGVzdA==");
    expect(body.originalContent).toBeUndefined();
  });

  it("should merge metadata fields", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-6",
      spaceId: "sp-1",
    });

    await executeCreateMemory(client, {
      spaceId: "sp-1",
      textContent: "test",
      source: "email",
      author: "john",
      tags: "a, b, c",
      metadata: { custom: "value" },
    });

    const body = client.request.mock.calls[0][2];
    expect(body.metadata).toEqual({
      custom: "value",
      source: "email",
      author: "john",
      tags: ["a", "b", "c"],
    });
  });

  it("should filter empty tags", async () => {
    client.request.mockResolvedValueOnce({
      memoryId: "mem-7",
      spaceId: "sp-1",
    });

    await executeCreateMemory(client, {
      spaceId: "sp-1",
      textContent: "test",
      tags: "a,,  , b",
    });

    const body = client.request.mock.calls[0][2];
    expect(body.metadata.tags).toEqual(["a", "b"]);
  });

  it("should return error on API failure", async () => {
    const error: any = new Error("Quota exceeded");
    error.responseBody = { code: "QUOTA_EXCEEDED" };
    client.request.mockRejectedValueOnce(error);

    const result = await executeCreateMemory(client, {
      spaceId: "sp-1",
      textContent: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Quota exceeded");
    expect(result.details).toEqual({ code: "QUOTA_EXCEEDED" });
  });
});

// ============================================================================
// Get Memory
// ============================================================================

describe("executeGetMemory", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should fetch memory with content", async () => {
    client.request
      .mockResolvedValueOnce({ memoryId: "mem-1", status: "COMPLETED" })
      .mockResolvedValueOnce({ text: "Original content" });

    const result = await executeGetMemory(client, {
      memoryId: "mem-1",
      includeContent: true,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toEqual({ memoryId: "mem-1", status: "COMPLETED" });
    expect(result.content).toEqual({ text: "Original content" });
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(client.request).toHaveBeenCalledWith("GET", "/v1/memories/mem-1");
    expect(client.request).toHaveBeenCalledWith("GET", "/v1/memories/mem-1/content");
  });

  it("should fetch memory without content when includeContent is false", async () => {
    client.request.mockResolvedValueOnce({ memoryId: "mem-1" });

    const result = await executeGetMemory(client, {
      memoryId: "mem-1",
      includeContent: false,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toEqual({ memoryId: "mem-1" });
    expect(result.content).toBeUndefined();
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("should handle content fetch failure gracefully", async () => {
    client.request
      .mockResolvedValueOnce({ memoryId: "mem-1" })
      .mockRejectedValueOnce(new Error("Content not available"));

    const result = await executeGetMemory(client, {
      memoryId: "mem-1",
      includeContent: true,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
    expect(result.contentError).toContain("Content not available");
  });

  it("should return error when memory fetch fails", async () => {
    client.request.mockRejectedValueOnce(new Error("Not found"));

    const result = await executeGetMemory(client, {
      memoryId: "nonexistent",
      includeContent: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not found");
  });
});

// ============================================================================
// Delete Memory
// ============================================================================

describe("executeDeleteMemory", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it("should delete memory successfully", async () => {
    client.request.mockResolvedValueOnce(undefined);

    const result = await executeDeleteMemory(client, { memoryId: "mem-1" });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBe("mem-1");
    expect(client.request).toHaveBeenCalledWith("DELETE", "/v1/memories/mem-1");
  });

  it("should return error when delete fails", async () => {
    client.request.mockRejectedValueOnce(new Error("Memory not found"));

    const result = await executeDeleteMemory(client, { memoryId: "nonexistent" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Memory not found");
  });
});

// ============================================================================
// Retrieve Memories
// ============================================================================

describe("executeRetrieveMemories", () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  const defaultInput = {
    query: "What is VoltAgent?",
    spaceIds: ["sp-1"],
    maxResults: 5,
    includeMemoryDefinition: true,
    waitForIndexing: false,
    chronologicalResort: false,
  };

  it("should parse NDJSON response with results", async () => {
    const ndjson = [
      '{"resultSetBoundary":{"resultSetId":"rs-1"}}',
      '{"retrievedItem":{"chunk":{"chunk":{"chunkId":"c-1","chunkText":"VoltAgent is a framework","memoryId":"mem-1"},"relevanceScore":0.95,"memoryIndex":0}}}',
      '{"memoryDefinition":{"memoryId":"mem-1","status":"COMPLETED"}}',
    ].join("\n");

    client.requestText.mockResolvedValueOnce(ndjson);

    const result = await executeRetrieveMemories(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.resultSetId).toBe("rs-1");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].chunkText).toBe("VoltAgent is a framework");
    expect(result.results[0].relevanceScore).toBe(0.95);
    expect(result.memories).toHaveLength(1);
    expect(result.totalResults).toBe(1);
  });

  it("should handle SSE format responses", async () => {
    const sse = [
      "event: result",
      'data: {"resultSetBoundary":{"resultSetId":"rs-2"}}',
      "",
      "event: result",
      'data: {"retrievedItem":{"chunk":{"chunk":{"chunkId":"c-1","chunkText":"test chunk","memoryId":"mem-1"},"relevanceScore":0.8}}}',
      "",
    ].join("\n");

    client.requestText.mockResolvedValueOnce(sse);

    const result = await executeRetrieveMemories(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].chunkText).toBe("test chunk");
  });

  it("should handle abstractReply in response", async () => {
    const ndjson = [
      '{"resultSetBoundary":{"resultSetId":"rs-1"}}',
      '{"retrievedItem":{"chunk":{"chunk":{"chunkId":"c-1","chunkText":"test","memoryId":"mem-1"},"relevanceScore":0.9}}}',
      '{"abstractReply":{"text":"VoltAgent is an AI framework."}}',
    ].join("\n");

    client.requestText.mockResolvedValueOnce(ndjson);

    const result = await executeRetrieveMemories(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.abstractReply).toEqual({ text: "VoltAgent is an AI framework." });
  });

  it("should reject when no spaces provided (empty after filter)", async () => {
    const result = await executeRetrieveMemories(client, {
      ...defaultInput,
      spaceIds: ["", "  "],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("At least one space");
    expect(client.requestText).not.toHaveBeenCalled();
  });

  it("should filter empty spaceIds", async () => {
    client.requestText.mockResolvedValueOnce('{"resultSetBoundary":{"resultSetId":"rs-1"}}');

    await executeRetrieveMemories(client, {
      ...defaultInput,
      spaceIds: ["sp-1", "", "sp-2"],
    });

    const body = client.requestText.mock.calls[0][2];
    expect(body.spaceKeys).toEqual([{ spaceId: "sp-1" }, { spaceId: "sp-2" }]);
  });

  it("should include post-processor config when rerankerId is set", async () => {
    client.requestText.mockResolvedValueOnce('{"resultSetBoundary":{"resultSetId":"rs-1"}}');

    await executeRetrieveMemories(client, {
      ...defaultInput,
      rerankerId: "reranker-1",
      relevanceThreshold: 0.7,
    });

    const body = client.requestText.mock.calls[0][2];
    expect(body.postProcessor).toBeDefined();
    expect(body.postProcessor.config.reranker_id).toBe("reranker-1");
    expect(body.postProcessor.config.relevance_threshold).toBe(0.7);
  });

  it("should include post-processor config when llmId is set", async () => {
    client.requestText.mockResolvedValueOnce('{"resultSetBoundary":{"resultSetId":"rs-1"}}');

    await executeRetrieveMemories(client, {
      ...defaultInput,
      llmId: "llm-1",
      llmTemperature: 0.5,
    });

    const body = client.requestText.mock.calls[0][2];
    expect(body.postProcessor.config.llm_id).toBe("llm-1");
    expect(body.postProcessor.config.llm_temp).toBe(0.5);
  });

  it("should not include post-processor when no reranker or llm", async () => {
    client.requestText.mockResolvedValueOnce('{"resultSetBoundary":{"resultSetId":"rs-1"}}');

    await executeRetrieveMemories(client, defaultInput);

    const body = client.requestText.mock.calls[0][2];
    expect(body.postProcessor).toBeUndefined();
  });

  it("should return empty results without polling when waitForIndexing is false", async () => {
    client.requestText.mockResolvedValueOnce('{"resultSetBoundary":{"resultSetId":"rs-1"}}');

    const result = await executeRetrieveMemories(client, {
      ...defaultInput,
      waitForIndexing: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBe(0);
    // Should only call once (no polling)
    expect(client.requestText).toHaveBeenCalledTimes(1);
  });

  it("should return error on API failure", async () => {
    client.requestText.mockRejectedValueOnce(new Error("Service unavailable"));

    const result = await executeRetrieveMemories(client, defaultInput);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Service unavailable");
  });

  it("should skip non-JSON lines gracefully", async () => {
    const mixed = [
      "not-json-line",
      '{"resultSetBoundary":{"resultSetId":"rs-1"}}',
      "another bad line",
      '{"retrievedItem":{"chunk":{"chunk":{"chunkId":"c-1","chunkText":"valid","memoryId":"mem-1"},"relevanceScore":0.9}}}',
    ].join("\n");

    client.requestText.mockResolvedValueOnce(mixed);

    const result = await executeRetrieveMemories(client, defaultInput);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].chunkText).toBe("valid");
  });
});
