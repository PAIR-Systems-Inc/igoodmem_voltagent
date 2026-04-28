/**
 * Unit tests for createGoodMemTools and createGoodMemToolkit factory functions.
 * Validates that the factories produce proper VoltAgent Tool instances and Toolkit shape.
 */

import { describe, expect, it } from "vitest";
import { createGoodMemToolkit, createGoodMemTools } from "../index";

const TEST_CONFIG = {
  baseUrl: "https://api.goodmem.ai",
  apiKey: "gm_test_key",
};

// ============================================================================
// createGoodMemTools
// ============================================================================

describe("createGoodMemTools", () => {
  it("should return 11 tools", () => {
    const tools = createGoodMemTools(TEST_CONFIG);
    expect(tools).toHaveLength(11);
  });

  it("should return proper Tool instances with type discriminator", () => {
    const tools = createGoodMemTools(TEST_CONFIG);
    for (const tool of tools) {
      expect(tool.type).toBe("user-defined");
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("should contain all expected tool names", () => {
    const tools = createGoodMemTools(TEST_CONFIG);
    const names = tools.map((t) => t.name);

    expect(names).toContain("goodmem_create_space");
    expect(names).toContain("goodmem_create_memory");
    expect(names).toContain("goodmem_retrieve_memories");
    expect(names).toContain("goodmem_get_memory");
    expect(names).toContain("goodmem_delete_memory");
    expect(names).toContain("goodmem_list_spaces");
    expect(names).toContain("goodmem_list_embedders");
    expect(names).toContain("goodmem_get_space");
    expect(names).toContain("goodmem_update_space");
    expect(names).toContain("goodmem_delete_space");
    expect(names).toContain("goodmem_list_memories");
  });

  it("should create independent tool sets per call", () => {
    const tools1 = createGoodMemTools(TEST_CONFIG);
    const tools2 = createGoodMemTools({ ...TEST_CONFIG, apiKey: "different" });
    expect(tools1).not.toBe(tools2);
    expect(tools1[0]).not.toBe(tools2[0]);
  });

  it("should throw when baseUrl is missing", () => {
    expect(() => createGoodMemTools({ baseUrl: "", apiKey: "key" })).toThrow(
      "GoodMem baseUrl is required",
    );
  });

  it("should throw when apiKey is missing", () => {
    expect(() => createGoodMemTools({ baseUrl: "https://api.test", apiKey: "" })).toThrow(
      "GoodMem apiKey is required",
    );
  });
});

// ============================================================================
// createGoodMemToolkit
// ============================================================================

describe("createGoodMemToolkit", () => {
  it("should return a valid Toolkit shape", () => {
    const toolkit = createGoodMemToolkit(TEST_CONFIG);

    expect(toolkit.name).toBe("goodmem");
    expect(toolkit.description).toBeDefined();
    expect(typeof toolkit.description).toBe("string");
    expect(toolkit.instructions).toBeDefined();
    expect(typeof toolkit.instructions).toBe("string");
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.tools).toHaveLength(11);
  });

  it("should contain Tool instances in tools array", () => {
    const toolkit = createGoodMemToolkit(TEST_CONFIG);

    for (const tool of toolkit.tools) {
      // Verify they are proper Tool instances with the discriminator
      expect((tool as any).type).toBe("user-defined");
      expect((tool as any).name).toBeDefined();
    }
  });

  it("should include instructions about workflow", () => {
    const toolkit = createGoodMemToolkit(TEST_CONFIG);

    expect(toolkit.instructions).toContain("goodmem_list_embedders");
    expect(toolkit.instructions).toContain("goodmem_create_space");
    expect(toolkit.instructions).toContain("goodmem_create_memory");
    expect(toolkit.instructions).toContain("goodmem_retrieve_memories");
  });
});
