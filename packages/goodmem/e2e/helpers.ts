/**
 * E2E test helpers — loads config from .env.test written by setup-goodmem.sh
 * and provides a pre-configured GoodMemClient + utility functions.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GoodMemClient } from "../src/client";

// ── Load .env.test ───────────────────────────────────────────────────────────

function loadEnvTest(): Record<string, string> {
  const envPath = resolve(__dirname, ".env.test");
  let content: string;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    throw new Error(`Missing ${envPath} — run 'bash e2e/scripts/setup-goodmem.sh' first`);
  }

  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  }
  return env;
}

const env = loadEnvTest();

// ── Exports ──────────────────────────────────────────────────────────────────

/** The CLI profile name for this test environment. */
export const PROFILE_NAME = env.GOODMEM_PROFILE || "e2e-test";

/** REST base URL (e.g. http://localhost:8080). */
export const BASE_URL = env.GOODMEM_BASE_URL || "http://localhost:8080";

/** GoodMem API key from the e2e profile. */
export const API_KEY = env.GOODMEM_API_KEY || "";

/** The OpenAI embedder ID created during setup. */
export const EMBEDDER_ID = env.GOODMEM_EMBEDDER_ID || "";

/** Pre-configured client for all e2e tests. */
export const client = new GoodMemClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
});

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Poll GET /v1/memories/{id} until processingStatus is COMPLETED or timeout.
 * Returns the final memory object.
 */
export async function waitForProcessing(
  memoryId: string,
  timeoutMs = 30000,
  pollIntervalMs = 2000,
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const memory = await client.request<any>("GET", `/v1/memories/${memoryId}`);
    const status = memory.processingStatus || memory.status;
    if (status === "COMPLETED" || status === "COMPLETE") {
      return memory;
    }
    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`Memory ${memoryId} processing failed: ${status}`);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Memory ${memoryId} did not complete processing within ${timeoutMs}ms`);
}

/**
 * Delete a space by ID via direct REST call (no tool wrapper exists for this).
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  try {
    await client.request("DELETE", `/v1/spaces/${spaceId}`);
  } catch {
    // Ignore — space may already be deleted
  }
}
