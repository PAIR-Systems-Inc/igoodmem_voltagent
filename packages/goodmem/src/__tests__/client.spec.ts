/**
 * Unit tests for GoodMemClient
 * Tests HTTP client behavior with mocked fetch
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoodMemClient } from "../client";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GoodMemClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe("Constructor", () => {
    it("should create client with valid config", () => {
      const client = new GoodMemClient({
        baseUrl: "https://api.goodmem.ai",
        apiKey: "gm_test_key",
      });
      expect(client).toBeDefined();
    });

    it("should strip trailing slash from baseUrl", () => {
      const client = new GoodMemClient({
        baseUrl: "https://api.goodmem.ai/",
        apiKey: "gm_test_key",
      });
      // Verify by making a request and checking the URL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });
      client.request("GET", "/v1/test");
      expect(mockFetch).toHaveBeenCalledWith("https://api.goodmem.ai/v1/test", expect.any(Object));
    });

    it("should throw if baseUrl is missing", () => {
      expect(() => new GoodMemClient({ baseUrl: "", apiKey: "key" })).toThrow(
        "GoodMem baseUrl is required",
      );
    });

    it("should throw if apiKey is missing", () => {
      expect(() => new GoodMemClient({ baseUrl: "https://api.goodmem.ai", apiKey: "" })).toThrow(
        "GoodMem apiKey is required",
      );
    });
  });

  // ============================================================================
  // request() Tests
  // ============================================================================

  describe("request()", () => {
    let client: GoodMemClient;

    beforeEach(() => {
      client = new GoodMemClient({
        baseUrl: "https://api.goodmem.ai",
        apiKey: "gm_test_key",
      });
    });

    it("should send GET request with correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ data: "test" }),
      });

      const result = await client.request("GET", "/v1/spaces");

      expect(mockFetch).toHaveBeenCalledWith("https://api.goodmem.ai/v1/spaces", {
        method: "GET",
        headers: {
          "X-API-Key": "gm_test_key",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      expect(result).toEqual({ data: "test" });
    });

    it("should send POST request with JSON body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ spaceId: "sp_123" }),
      });

      const body = { name: "test-space" };
      await client.request("POST", "/v1/spaces", body);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBeDefined();
      // Body should be serialized string
      expect(typeof callArgs[1].body).toBe("string");
    });

    it("should pass string body directly without re-serializing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await client.request("POST", "/v1/test", "raw-string-body");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe("raw-string-body");
    });

    it("should not include body for undefined", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await client.request("GET", "/v1/test");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBeUndefined();
    });

    it("should return text for non-JSON content types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "text/plain" }),
        text: () => Promise.resolve("plain text response"),
      });

      const result = await client.request("GET", "/v1/test");
      expect(result).toBe("plain text response");
    });

    it("should throw on HTTP error with JSON error body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({ message: "Space not found" }),
      });

      try {
        await client.request("GET", "/v1/spaces/nonexistent");
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.message).toBe("Space not found");
        expect(error.status).toBe(404);
        expect(error.responseBody).toEqual({ message: "Space not found" });
      }
    });

    it("should throw on HTTP error with text fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
        text: () => Promise.resolve("server error details"),
      });

      try {
        await client.request("GET", "/v1/test");
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.status).toBe(500);
      }
    });

    it("should throw with status text when error body is unreadable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.reject(new Error("not json")),
        text: () => Promise.reject(new Error("not text")),
      });

      try {
        await client.request("GET", "/v1/test");
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.message).toBe("HTTP 502: Bad Gateway");
        expect(error.status).toBe(502);
      }
    });

    it("should merge extra headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await client.request("GET", "/v1/test", undefined, {
        "X-Custom": "custom-value",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Custom"]).toBe("custom-value");
    });
  });

  // ============================================================================
  // requestText() Tests
  // ============================================================================

  describe("requestText()", () => {
    let client: GoodMemClient;

    beforeEach(() => {
      client = new GoodMemClient({
        baseUrl: "https://api.goodmem.ai",
        apiKey: "gm_test_key",
      });
    });

    it("should send request with NDJSON accept header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("line1\nline2"),
      });

      const result = await client.requestText("POST", "/v1/memories:retrieve", {
        query: "test",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Accept).toBe("application/x-ndjson");
      expect(result).toBe("line1\nline2");
    });

    it("should throw on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: "Invalid query" }),
      });

      try {
        await client.requestText("POST", "/v1/memories:retrieve");
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.message).toBe("Invalid query");
        expect(error.status).toBe(400);
      }
    });
  });
});
