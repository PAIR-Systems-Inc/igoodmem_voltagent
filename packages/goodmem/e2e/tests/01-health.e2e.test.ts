/**
 * E2E: GoodMem server health and connectivity.
 * Validates that the server is reachable and the API key is valid.
 */

import { describe, expect, it } from "vitest";
import { API_KEY, BASE_URL, client } from "../helpers";

describe("GoodMem Server Health", () => {
  it("should have a non-empty BASE_URL configured", () => {
    expect(BASE_URL).toBeTruthy();
  });

  it("should have a non-empty API_KEY configured", () => {
    expect(API_KEY).toBeTruthy();
    expect(API_KEY).toMatch(/^gm_/);
  });

  it("should respond to /livez health check", async () => {
    const res = await fetch(`${BASE_URL}/livez`);
    expect(res.ok).toBe(true);
  });

  it("should respond to /readyz readiness check", async () => {
    const res = await fetch(`${BASE_URL}/readyz`);
    expect(res.ok).toBe(true);
  });

  it("should accept the API key (list spaces returns 200)", async () => {
    const result = await client.request("GET", "/v1/spaces");
    // Should not throw — a 403 would throw in the client
    expect(result).toBeDefined();
  });
});
