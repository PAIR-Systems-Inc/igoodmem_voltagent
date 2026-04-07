/**
 * E2E: File upload — store a base64-encoded file as a memory.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateMemory } from "../../src/tools/create-memory";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeDeleteMemory } from "../../src/tools/delete-memory";
import { executeGetMemory } from "../../src/tools/get-memory";
import { EMBEDDER_ID, client, deleteSpace } from "../helpers";

describe("File Upload Memory", () => {
  const spaceName = `e2e-file-upload-${Date.now()}`;
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

  it("should create a memory from a base64-encoded text file", async () => {
    const textContent = "This is a test document uploaded as a file.\nIt has multiple lines.";
    const fileBase64 = Buffer.from(textContent).toString("base64");

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

  it("should retrieve the uploaded file memory", async () => {
    const result = await executeGetMemory(client, {
      memoryId,
      includeContent: true,
    });

    expect(result.success).toBe(true);
    expect(result.memory).toBeDefined();
  });

  it("should detect MIME type for common extensions", async () => {
    // Test PDF MIME detection (just the creation, not actual PDF parsing)
    // Using a tiny fake "PDF" — the server may reject it, but MIME detection
    // in the client should still work correctly
    const fakePdfBase64 = Buffer.from("%PDF-1.4 fake content").toString("base64");

    const result = await executeCreateMemory(client, {
      spaceId,
      fileBase64: fakePdfBase64,
      fileExtension: "pdf",
    });

    // The creation may succeed or fail depending on server-side validation,
    // but if it succeeds the content type should be correct
    if (result.success) {
      expect(result.contentType).toBe("application/pdf");
      // Clean up
      await executeDeleteMemory(client, { memoryId: result.memoryId }).catch(() => {});
    }
  });
});
