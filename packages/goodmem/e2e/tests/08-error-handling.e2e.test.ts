/**
 * E2E: Error handling — verify that tools return structured errors
 * for invalid inputs and non-existent resources.
 */

import { describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeGetMemory } from "../../src/tools/get-memory";
import { executeRetrieveMemories } from "../../src/tools/retrieve-memories";
import { client } from "../helpers";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

describe("Error Handling", () => {
  it("should fail to get a non-existent memory", async () => {
    const result = await executeGetMemory(client, {
      memoryId: FAKE_UUID,
      includeContent: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("should fail to delete a non-existent memory", async () => {
    const result = await executeDeleteMemory(client, {
      memoryId: FAKE_UUID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("should fail to retrieve with empty spaceIds", async () => {
    const result = await executeRetrieveMemories(client, {
      query: "test",
      spaceIds: ["", "  "],
      maxResults: 5,
      includeMemoryDefinition: false,
      waitForIndexing: false,
      chronologicalResort: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("At least one space");
  });

  it("should fail to create memory with no content", async () => {
    const result = await executeCreateMemory(client, {
      spaceId: FAKE_UUID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No content provided");
  });

  it("should fail to create a space with an invalid embedder ID", async () => {
    const result = await executeCreateSpace(client, {
      name: `e2e-invalid-embedder-${Date.now()}`,
      embedderId: FAKE_UUID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
