/**
 * E2E: VoltAgent integration — validates that createGoodMemTools and
 * createGoodMemToolkit produce proper VoltAgent objects, and that each
 * tool's execute method works end-to-end through the Tool wrapper.
 */

import { afterAll, describe, expect, it } from "vitest";
import { createGoodMemToolkit, createGoodMemTools } from "../../src/index";
import { API_KEY, BASE_URL, EMBEDDER_ID, deleteSpace, waitForProcessing } from "../helpers";

// ── Module-level setup ──────────────────────────────────────────────────────

const tools = createGoodMemTools({ baseUrl: BASE_URL, apiKey: API_KEY });

function findTool(name: string) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

// ============================================================================
// Block 1: Factory shape validation with real config
// ============================================================================

describe("VoltAgent createGoodMemTools / createGoodMemToolkit", () => {
  it("should return exactly 7 Tool instances", () => {
    expect(tools).toHaveLength(7);
  });

  it("should produce tools with type, name, description, parameters, and execute", () => {
    for (const tool of tools) {
      expect(tool.type).toBe("user-defined");
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("should contain all 7 expected tool names", () => {
    const names = tools.map((t) => t.name);

    expect(names).toContain("goodmem_create_space");
    expect(names).toContain("goodmem_create_memory");
    expect(names).toContain("goodmem_retrieve_memories");
    expect(names).toContain("goodmem_get_memory");
    expect(names).toContain("goodmem_delete_memory");
    expect(names).toContain("goodmem_list_spaces");
    expect(names).toContain("goodmem_list_embedders");
  });

  it("should return a valid Toolkit shape from createGoodMemToolkit", () => {
    const toolkit = createGoodMemToolkit({ baseUrl: BASE_URL, apiKey: API_KEY });

    expect(toolkit.name).toBe("goodmem");
    expect(toolkit.description).toBeTruthy();
    expect(typeof toolkit.description).toBe("string");
    expect(toolkit.instructions).toBeTruthy();
    expect(toolkit.instructions).toContain("goodmem_list_embedders");
    expect(toolkit.instructions).toContain("goodmem_create_space");
    expect(toolkit.instructions).toContain("goodmem_create_memory");
    expect(toolkit.instructions).toContain("goodmem_retrieve_memories");
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.tools).toHaveLength(7);
  });

  it("should have proper Tool instances inside the toolkit", () => {
    const toolkit = createGoodMemToolkit({ baseUrl: BASE_URL, apiKey: API_KEY });

    for (const tool of toolkit.tools) {
      expect((tool as any).type).toBe("user-defined");
      expect((tool as any).name).toBeTruthy();
    }
  });

  it("should return independent instances per call", () => {
    const tools2 = createGoodMemTools({ baseUrl: BASE_URL, apiKey: API_KEY });
    expect(tools).not.toBe(tools2);
    expect(tools[0]).not.toBe(tools2[0]);
  });
});

// ============================================================================
// Block 2: Per-tool execute methods via VoltAgent wrappers
// ============================================================================

describe("Tool Execute Methods via VoltAgent wrappers", () => {
  let spaceId: string;
  let memoryId: string;
  const memoryIds: string[] = [];

  afterAll(async () => {
    for (const id of memoryIds) {
      try {
        const deleteTool = findTool("goodmem_delete_memory");
        await deleteTool.execute?.({ memoryId: id });
      } catch {
        // May already be deleted by the delete test
      }
    }
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  it("goodmem_list_embedders — lists available embedders", async () => {
    const tool = findTool("goodmem_list_embedders");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({});

    expect(result.success).toBe(true);
    expect(Array.isArray(result.embedders)).toBe(true);
    expect(result.totalEmbedders).toBeGreaterThanOrEqual(1);
  });

  it("goodmem_list_spaces — lists available spaces", async () => {
    const tool = findTool("goodmem_list_spaces");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({});

    expect(result.success).toBe(true);
    expect(Array.isArray(result.spaces)).toBe(true);
    expect(typeof result.totalSpaces).toBe("number");
  });

  it("goodmem_create_space — creates a new space", async () => {
    const tool = findTool("goodmem_create_space");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({
      name: `e2e-voltagent-${Date.now()}`,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });

    expect(result.success).toBe(true);
    expect(result.spaceId).toBeTruthy();

    spaceId = result.spaceId;
  });

  it("goodmem_create_memory — stores text content", async () => {
    const tool = findTool("goodmem_create_memory");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({
      spaceId,
      textContent: "VoltAgent integration test: The Eiffel Tower is located in Paris, France.",
    });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBeTruthy();
    expect(result.spaceId).toBe(spaceId);
    expect(result.contentType).toBe("text/plain");

    memoryId = result.memoryId;
    memoryIds.push(memoryId);
  });

  it("goodmem_get_memory — fetches memory by ID", async () => {
    const tool = findTool("goodmem_get_memory");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({
      memoryId,
      includeContent: false,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
    expect(result.memory.memoryId || result.memory.id).toBe(memoryId);
  });

  it("goodmem_retrieve_memories — performs semantic search", async () => {
    // Ensure memory is fully indexed before retrieval
    await waitForProcessing(memoryId, 30000);

    const tool = findTool("goodmem_retrieve_memories");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({
      query: "Where is the Eiffel Tower?",
      spaceIds: [spaceId],
      maxResults: 5,
      includeMemoryDefinition: true,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].chunkText).toBeTruthy();

    const text = result.results[0].chunkText.toLowerCase();
    expect(text.includes("eiffel") || text.includes("paris")).toBe(true);
  });

  it("goodmem_delete_memory — deletes a memory", async () => {
    const tool = findTool("goodmem_delete_memory");
    expect(tool.execute).toBeDefined();

    const result = await tool.execute?.({ memoryId });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBe(memoryId);
  });
});
