import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Delete Space tool parameters.
 */
export const deleteSpaceSchema = z.object({
  spaceId: z.string().describe("The UUID of the space to delete"),
});

export type DeleteSpaceInput = z.infer<typeof deleteSpaceSchema>;

/**
 * Execute the Delete Space action against the GoodMem API.
 * Permanently removes the space and all of its memories.
 */
export async function executeDeleteSpace(client: GoodMemClient, input: DeleteSpaceInput) {
  const { spaceId } = input;

  try {
    await client.request("DELETE", `/v1/spaces/${spaceId}`);
    return {
      success: true,
      spaceId,
      message: "Space deleted successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete space",
      details: error.responseBody || undefined,
    };
  }
}
