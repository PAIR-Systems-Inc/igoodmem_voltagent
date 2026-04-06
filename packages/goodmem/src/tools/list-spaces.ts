import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the List Spaces tool parameters (no inputs required).
 */
export const listSpacesSchema = z.object({});

export type ListSpacesInput = z.infer<typeof listSpacesSchema>;

/**
 * Execute the List Spaces action against the GoodMem API.
 */
export async function executeListSpaces(client: GoodMemClient, _input: ListSpacesInput) {
  try {
    const body = await client.request<any>("GET", "/v1/spaces");
    const spaces = Array.isArray(body) ? body : body?.spaces || [];
    return {
      success: true,
      spaces: spaces.map((s: any) => ({
        spaceId: s.spaceId || s.id,
        name: s.name || "Unnamed",
      })),
      totalSpaces: spaces.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to list spaces",
      details: error.responseBody || undefined,
    };
  }
}
