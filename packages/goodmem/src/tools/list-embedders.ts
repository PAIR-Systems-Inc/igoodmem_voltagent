import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the List Embedders tool parameters (no inputs required).
 */
export const listEmbeddersSchema = z.object({});

export type ListEmbeddersInput = z.infer<typeof listEmbeddersSchema>;

/**
 * Execute the List Embedders action against the GoodMem API.
 */
export async function executeListEmbedders(client: GoodMemClient, _input: ListEmbeddersInput) {
  try {
    const body = await client.request<any>("GET", "/v1/embedders");
    const embedders = Array.isArray(body) ? body : body?.embedders || [];
    return {
      success: true,
      embedders: embedders.map((e: any) => ({
        embedderId: e.embedderId || e.id,
        displayName: e.displayName || e.name || "Unnamed",
        modelIdentifier: e.modelIdentifier || e.model || "unknown",
      })),
      totalEmbedders: embedders.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to list embedders",
      details: error.responseBody || undefined,
    };
  }
}
