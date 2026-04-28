import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the List Memories tool parameters.
 */
export const listMemoriesSchema = z.object({
  spaceId: z.string().describe("The UUID of the space whose memories should be listed"),
});

export type ListMemoriesInput = z.infer<typeof listMemoriesSchema>;

/**
 * Execute the List Memories action against the GoodMem API.
 */
export async function executeListMemories(client: GoodMemClient, input: ListMemoriesInput) {
  const { spaceId } = input;

  try {
    const body = await client.request<any>("GET", `/v1/spaces/${spaceId}/memories`);
    const memories = Array.isArray(body) ? body : body?.memories || [];
    return {
      success: true,
      memories: memories.map((m: any) => ({
        memoryId: m.memoryId || m.id,
        spaceId: m.spaceId,
        contentType: m.contentType,
        processingStatus: m.processingStatus,
        originalContentLength: m.originalContentLength,
        metadata: m.metadata,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      totalMemories: memories.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to list memories",
      details: error.responseBody || undefined,
    };
  }
}
