/**
 * E2E: Embedder discovery.
 * Validates that the OpenAI embedder created during setup is visible.
 */

import { describe, expect, it } from "vitest";
import { executeListEmbedders } from "../../src/tools/list-embedders";
import { EMBEDDER_ID, client } from "../helpers";

describe("Embedder Discovery", () => {
  it("should have an EMBEDDER_ID configured from setup", () => {
    expect(EMBEDDER_ID).toBeTruthy();
    expect(EMBEDDER_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should list at least one embedder", async () => {
    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(true);
    expect(result.totalEmbedders).toBeGreaterThanOrEqual(1);
    expect(result.embedders.length).toBeGreaterThanOrEqual(1);
  });

  it("should include the e2e embedder in the list", async () => {
    const result = await executeListEmbedders(client, {});

    expect(result.success).toBe(true);
    const found = result.embedders.find((e: any) => e.embedderId === EMBEDDER_ID);
    expect(found).toBeDefined();
    expect(found.displayName).toBe("E2E OpenAI Ada");
    expect(found.modelIdentifier).toBe("text-embedding-3-small");
  });
});
