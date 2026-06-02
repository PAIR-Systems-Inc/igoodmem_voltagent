import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Update Space tool parameters.
 */
export const updateSpaceSchema = z.object({
  spaceId: z.string().describe("The UUID of the space to update"),
  name: z.string().optional().describe("New name for the space"),
  publicRead: z.boolean().optional().describe("Whether the space should be publicly readable"),
  replaceLabels: z
    .record(z.string())
    .optional()
    .describe("Key-value labels that fully replace any existing labels on the space"),
  mergeLabels: z
    .record(z.string())
    .optional()
    .describe("Key-value labels merged into the existing labels (existing keys are overwritten)"),
});

export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;

/**
 * Execute the Update Space action against the GoodMem API.
 */
export async function executeUpdateSpace(client: GoodMemClient, input: UpdateSpaceInput) {
  const { spaceId, name, publicRead, replaceLabels, mergeLabels } = input;

  const requestBody: Record<string, unknown> = {};
  if (name !== undefined) requestBody.name = name;
  if (publicRead !== undefined) requestBody.publicRead = publicRead;
  if (replaceLabels !== undefined) requestBody.replaceLabels = replaceLabels;
  if (mergeLabels !== undefined) requestBody.mergeLabels = mergeLabels;

  if (Object.keys(requestBody).length === 0) {
    return {
      success: false,
      error:
        "No fields provided to update. Provide at least one of: name, publicRead, replaceLabels, mergeLabels.",
    };
  }

  try {
    const space = await client.request<any>("PUT", `/v1/spaces/${spaceId}`, requestBody);
    return {
      success: true,
      space,
      message: "Space updated successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update space",
      details: error.responseBody || undefined,
    };
  }
}
