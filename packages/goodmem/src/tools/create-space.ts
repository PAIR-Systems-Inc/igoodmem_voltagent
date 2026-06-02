import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Create Space tool parameters.
 */
export const createSpaceSchema = z.object({
  name: z
    .string()
    .describe(
      "A unique name for the space. If a space with this name already exists, its ID will be returned instead of creating a duplicate",
    ),
  embedderId: z
    .string()
    .describe(
      "The ID of the embedder model that converts text into vector representations for similarity search. Use the list_embedders tool to see available embedders.",
    ),
  chunkSize: z
    .number()
    .optional()
    .default(256)
    .describe("Number of characters per chunk when splitting documents"),
  chunkOverlap: z
    .number()
    .optional()
    .default(25)
    .describe("Number of overlapping characters between consecutive chunks"),
  keepStrategy: z
    .enum(["KEEP_END", "KEEP_START", "DISCARD"])
    .optional()
    .default("KEEP_END")
    .describe("Where to attach the separator when splitting"),
  lengthMeasurement: z
    .enum(["CHARACTER_COUNT", "TOKEN_COUNT"])
    .optional()
    .default("CHARACTER_COUNT")
    .describe("How chunk size is measured"),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

/**
 * Execute the Create Space action against the GoodMem API.
 * If a space with the same name already exists, returns the existing space ID.
 */
export async function executeCreateSpace(client: GoodMemClient, input: CreateSpaceInput) {
  const { name, embedderId, chunkSize, chunkOverlap, keepStrategy, lengthMeasurement } = input;

  // Check if a space with the same name already exists
  try {
    const listBody = await client.request<any>("GET", "/v1/spaces");
    const spaces = Array.isArray(listBody) ? listBody : listBody?.spaces || [];
    const existing = spaces.find((s: any) => s.name === name);
    if (existing) {
      return {
        success: true,
        spaceId: existing.spaceId,
        name: existing.name,
        embedderId,
        message: "Space already exists, reusing existing space",
        reused: true,
      };
    }
  } catch {
    // If listing fails, proceed to create
  }

  const requestBody = {
    name,
    spaceEmbedders: [{ embedderId, defaultRetrievalWeight: 1.0 }],
    defaultChunkingConfig: {
      recursive: {
        chunkSize,
        chunkOverlap,
        separators: ["\n\n", "\n", ". ", " ", ""],
        keepStrategy,
        separatorIsRegex: false,
        lengthMeasurement,
      },
    },
  };

  try {
    const response = await client.request<any>("POST", "/v1/spaces", requestBody);
    return {
      success: true,
      spaceId: response.spaceId,
      name: response.name,
      embedderId,
      chunkingConfig: requestBody.defaultChunkingConfig,
      message: "Space created successfully",
      reused: false,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create space",
      details: error.responseBody || undefined,
    };
  }
}
