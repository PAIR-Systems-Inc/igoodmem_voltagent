/**
 * E2E: Space lifecycle — create, list, idempotent re-create, cleanup.
 */

import { afterAll, describe, expect, it } from "vitest";
import { executeCreateSpace } from "../../src/tools/create-space";
import { executeListSpaces } from "../../src/tools/list-spaces";
import { EMBEDDER_ID, client, deleteSpace } from "../helpers";

describe("Space Lifecycle", () => {
  const spaceName = `e2e-space-lifecycle-${Date.now()}`;
  let spaceId: string;

  afterAll(async () => {
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  it("should create a new space", async () => {
    const result = await executeCreateSpace(client, {
      name: spaceName,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });

    expect(result.success).toBe(true);
    expect(result.spaceId).toBeTruthy();
    expect(result.name).toBe(spaceName);
    expect(result.reused).toBe(false);

    spaceId = result.spaceId;
  });

  it("should show the new space in list", async () => {
    const result = await executeListSpaces(client, {});

    expect(result.success).toBe(true);
    const found = result.spaces.find((s: any) => s.spaceId === spaceId);
    expect(found).toBeDefined();
    expect(found.name).toBe(spaceName);
  });

  it("should reuse existing space when name matches (idempotent)", async () => {
    const result = await executeCreateSpace(client, {
      name: spaceName,
      embedderId: EMBEDDER_ID,
      chunkSize: 256,
      chunkOverlap: 25,
      keepStrategy: "KEEP_END",
      lengthMeasurement: "CHARACTER_COUNT",
    });

    expect(result.success).toBe(true);
    expect(result.spaceId).toBe(spaceId);
    expect(result.reused).toBe(true);
  });
});
