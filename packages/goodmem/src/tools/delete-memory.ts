import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Delete Memory tool parameters.
 */
export const deleteMemorySchema = z.object({
  memoryId: z.string().describe("The UUID of the memory to delete (returned by create_memory)"),
});

export type DeleteMemoryInput = z.infer<typeof deleteMemorySchema>;

/**
 * Execute the Delete Memory action against the GoodMem API.
 */
export async function executeDeleteMemory(client: GoodMemClient, input: DeleteMemoryInput) {
  const { memoryId } = input;

  try {
    await client.request("DELETE", `/v1/memories/${memoryId}`);
    return {
      success: true,
      memoryId,
      message: "Memory deleted successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete memory",
      details: error.responseBody || undefined,
    };
  }
}
