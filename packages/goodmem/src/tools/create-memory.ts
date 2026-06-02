import { z } from "zod";
import type { GoodMemClient } from "../client";
import { getMimeType } from "../types";

/**
 * Zod schema for the Create Memory tool parameters.
 */
export const createMemorySchema = z.object({
  spaceId: z.string().describe("The ID of the space to store the memory in"),
  fileBase64: z
    .string()
    .optional()
    .describe(
      "Base64-encoded file content to store as memory (PDF, DOCX, image, etc.). Content type is auto-detected from the fileExtension.",
    ),
  fileExtension: z
    .string()
    .optional()
    .describe(
      'File extension for MIME type detection when providing fileBase64 (e.g., "pdf", "png", "txt")',
    ),
  textContent: z
    .string()
    .optional()
    .describe(
      "Plain text content to store as memory (sent as text/plain). If both fileBase64 and textContent are provided, the file takes priority.",
    ),
  source: z
    .string()
    .optional()
    .describe(
      'Where this memory came from (e.g., "google-drive", "gmail", "manual upload"). Stored in metadata.source',
    ),
  author: z
    .string()
    .optional()
    .describe("The author or creator of the content. Stored in metadata.author"),
  tags: z
    .string()
    .optional()
    .describe(
      'Comma-separated tags for categorization (e.g., "legal,research,important"). Stored in metadata.tags as an array',
    ),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe("Extra key-value metadata as JSON. Merged with source, author, and tags fields"),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

/**
 * Execute the Create Memory action against the GoodMem API.
 */
export async function executeCreateMemory(client: GoodMemClient, input: CreateMemoryInput) {
  const { spaceId, fileBase64, fileExtension, textContent, source, author, tags, metadata } = input;

  const requestBody: any = { spaceId };

  if (fileBase64) {
    const detectedMimeType = fileExtension ? getMimeType(fileExtension) : null;
    const mimeType = detectedMimeType || "application/octet-stream";

    if (mimeType.startsWith("text/")) {
      const decoded = Buffer.from(fileBase64, "base64").toString("utf-8");
      requestBody.contentType = mimeType;
      requestBody.originalContent = decoded;
    } else {
      requestBody.contentType = mimeType;
      requestBody.originalContentB64 = fileBase64;
    }
  } else if (textContent) {
    requestBody.contentType = "text/plain";
    requestBody.originalContent = textContent;
  } else {
    return {
      success: false,
      error: "No content provided. Please provide fileBase64 or textContent.",
    };
  }

  // Merge metadata fields
  const mergedMetadata: Record<string, unknown> = {};
  if (metadata && typeof metadata === "object") {
    Object.assign(mergedMetadata, metadata);
  }
  if (source) {
    mergedMetadata.source = source;
  }
  if (author) {
    mergedMetadata.author = author;
  }
  if (tags) {
    mergedMetadata.tags = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  if (Object.keys(mergedMetadata).length > 0) {
    requestBody.metadata = mergedMetadata;
  }

  try {
    const response = await client.request<any>("POST", "/v1/memories", requestBody);
    return {
      success: true,
      memoryId: response.memoryId,
      spaceId: response.spaceId,
      status: response.processingStatus || "PENDING",
      contentType: requestBody.contentType,
      message: "Memory created successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create memory",
      details: error.responseBody || undefined,
    };
  }
}
