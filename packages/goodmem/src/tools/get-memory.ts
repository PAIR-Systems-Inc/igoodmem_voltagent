import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Get Memory tool parameters.
 */
export const getMemorySchema = z.object({
  memoryId: z.string().describe("The UUID of the memory to fetch (returned by create_memory)"),
  includeContent: z
    .boolean()
    .optional()
    .default(true)
    .describe("Fetch the original document content of the memory in addition to its metadata"),
});

export type GetMemoryInput = z.infer<typeof getMemorySchema>;

/**
 * Execute the Get Memory action against the GoodMem API.
 */
export async function executeGetMemory(client: GoodMemClient, input: GetMemoryInput) {
  const { memoryId, includeContent } = input;

  try {
    const memory = await client.request<any>("GET", `/v1/memories/${memoryId}`);

    const result: any = {
      success: true,
      memory,
    };

    if (includeContent) {
      try {
        const content = await client.request<any>("GET", `/v1/memories/${memoryId}/content`);
        result.content = content;
      } catch (contentError: any) {
        result.contentError = `Failed to fetch content: ${contentError.message || "Unknown error"}`;
      }
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get memory",
      details: error.responseBody || undefined,
    };
  }
}
