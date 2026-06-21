/**
 * E2E: File upload via base64 — validates the fileBase64 upload path
 * with a text file encoded as base64, then verifies the full pipeline
 * from upload through processing to semantic retrieval.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeGetMemory } from "../../src/tools/get-memory";
import { executeRetrieveMemories } from "../../src/tools/retrieve-memories";
import { EMBEDDER_ID, client, deleteSpace, waitForProcessing } from "../helpers";

describe("File Upload via Base64", () => {
  const spaceName = `e2e-file-upload-b64-${Date.now()}`;
  let spaceId: string;
  let memoryId: string;

  const fileContent = [
    "Quantum computing uses quantum bits or qubits.",
    "Unlike classical bits, qubits can exist in superposition.",
    "This allows quantum computers to solve certain problems exponentially faster.",
    "Applications include cryptography, drug discovery, and optimization.",
  ].join("\n");

  const fileBase64 = Buffer.from(fileContent).toString("base64");

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

  it("should upload a multi-line text file as base64", async () => {
    const result = await executeCreateMemory(client, {
      spaceId,
      fileBase64,
      fileExtension: "txt",
    });

    expect(result.success).toBe(true);
    expect(result.memoryId).toBeTruthy();
    expect(result.contentType).toBe("text/plain");

    memoryId = result.memoryId;
  });

  it("should fetch the uploaded file memory with content", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: true,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
    expect(result.memory.memoryId || result.memory.id).toBe(memoryId);
  });

  it("should find the uploaded file via semantic retrieval", async () => {
    await waitForProcessing(memoryId, 30000);

    const result = await executeRetrieveMemories(client, {
      query: "What are qubits and superposition?",
      spaceIds: [spaceId],
      maxResults: 5,
      includeMemoryDefinition: false,
      waitForIndexing: true,
      chronologicalResort: false,
    });

    expect(result.success).toBe(true);
    expect(result.totalResults).toBeGreaterThan(0);

    const topText = result.results[0].chunkText.toLowerCase();
    expect(
      topText.includes("qubit") || topText.includes("quantum") || topText.includes("superposition"),
    ).toBe(true);
  });
});
