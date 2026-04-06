import { safeStringify } from "@voltagent/internal";
import type { GoodMemConfig } from "./types";

/**
 * Lightweight HTTP client for the GoodMem API.
 * Centralizes base URL normalization, header construction, and error handling.
 */
export class GoodMemClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: GoodMemConfig) {
    if (!config.baseUrl) {
      throw new Error("GoodMem baseUrl is required");
    }
    if (!config.apiKey) {
      throw new Error("GoodMem apiKey is required");
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extra,
    };
  }

  /**
   * Send a JSON request to the GoodMem API.
   */
  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers(extraHeaders),
    };

    if (body !== undefined) {
      options.body = typeof body === "string" ? body : safeStringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      const message =
        errorBody?.message || errorBody?.error || `HTTP ${response.status}: ${response.statusText}`;
      const error: any = new Error(message);
      error.status = response.status;
      error.responseBody = errorBody;
      throw error;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json() as Promise<T>;
    }

    // Return raw text for NDJSON / SSE responses
    return (await response.text()) as unknown as T;
  }

  /**
   * Send a request and return the raw text response (for NDJSON / SSE streaming).
   */
  async requestText(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.headers({ Accept: "application/x-ndjson", ...extraHeaders }),
    };

    if (body !== undefined) {
      options.body = typeof body === "string" ? body : safeStringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      const message =
        errorBody?.message || errorBody?.error || `HTTP ${response.status}: ${response.statusText}`;
      const error: any = new Error(message);
      error.status = response.status;
      error.responseBody = errorBody;
      throw error;
    }

    return response.text();
  }
}
