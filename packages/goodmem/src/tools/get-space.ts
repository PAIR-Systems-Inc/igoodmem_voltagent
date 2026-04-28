import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Get Space tool parameters.
 */
export const getSpaceSchema = z.object({
  spaceId: z.string().describe("The UUID of the space to fetch"),
});

export type GetSpaceInput = z.infer<typeof getSpaceSchema>;

/**
 * Execute the Get Space action against the GoodMem API.
 */
export async function executeGetSpace(client: GoodMemClient, input: GetSpaceInput) {
  const { spaceId } = input;

  try {
    const space = await client.request<any>("GET", `/v1/spaces/${spaceId}`);
    return {
      success: true,
      space,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get space",
      details: error.responseBody || undefined,
    };
  }
}
