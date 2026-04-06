import { z } from "zod";
import type { GoodMemClient } from "../client";

/**
 * Zod schema for the Retrieve Memories tool parameters.
 */
export const retrieveMemoriesSchema = z.object({
  query: z
    .string()
    .describe("A natural language query used to find semantically similar memory chunks"),
  spaceIds: z.array(z.string()).min(1).describe("One or more space IDs to search across"),
  maxResults: z.number().optional().default(5).describe("Limit the number of returned memories"),
  includeMemoryDefinition: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Fetch the full memory metadata (source document info, processing status) alongside the matched chunks",
    ),
  waitForIndexing: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Retry for up to 10 seconds when no results are found. Enable when memories were just added and may still be undergoing chunking and embedding",
    ),
  rerankerId: z
    .string()
    .optional()
    .describe("Optional reranker model ID to improve result ordering"),
  llmId: z
    .string()
    .optional()
    .describe("Optional LLM ID to generate contextual responses alongside retrieved chunks"),
  relevanceThreshold: z
    .number()
    .optional()
    .describe(
      "Minimum score (0-1) for including results. Only used when rerankerId or llmId is set",
    ),
  llmTemperature: z
    .number()
    .optional()
    .describe("Creativity setting for LLM generation (0-2). Only used when llmId is set"),
  chronologicalResort: z
    .boolean()
    .optional()
    .default(false)
    .describe("Reorder results by creation time instead of relevance score"),
});

export type RetrieveMemoriesInput = z.infer<typeof retrieveMemoriesSchema>;

/**
 * Execute the Retrieve Memories action against the GoodMem API.
 * Supports polling for indexing completion.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Function handles polling, NDJSON parsing, and SSE - complexity is inherent to the feature
export async function executeRetrieveMemories(client: GoodMemClient, input: RetrieveMemoriesInput) {
  const {
    query,
    spaceIds,
    maxResults,
    includeMemoryDefinition,
    waitForIndexing,
    rerankerId,
    llmId,
    relevanceThreshold,
    llmTemperature,
    chronologicalResort,
  } = input;

  const spaceKeys = spaceIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((spaceId) => ({ spaceId }));

  if (spaceKeys.length === 0) {
    return {
      success: false,
      error: "At least one space must be selected.",
    };
  }

  const requestBody: any = {
    message: query,
    spaceKeys,
    requestedSize: maxResults || 5,
    fetchMemory: includeMemoryDefinition !== false,
  };

  // Add post-processor config if reranker or LLM is specified
  if (rerankerId || llmId) {
    const config: any = {};
    if (rerankerId) config.reranker_id = rerankerId;
    if (llmId) config.llm_id = llmId;
    if (relevanceThreshold !== undefined && relevanceThreshold !== null) {
      config.relevance_threshold = relevanceThreshold;
    }
    if (llmTemperature !== undefined && llmTemperature !== null) {
      config.llm_temp = llmTemperature;
    }
    if (maxResults) config.max_results = maxResults;
    if (chronologicalResort === true) config.chronological_resort = true;

    requestBody.postProcessor = {
      name: "com.goodmem.retrieval.postprocess.ChatPostProcessorFactory",
      config,
    };
  }

  const maxWaitMs = 10000;
  const pollIntervalMs = 2000;
  const shouldWait = waitForIndexing !== false;
  const startTime = Date.now();
  let lastResult: any = null;

  try {
    do {
      const responseText = await client.requestText("POST", "/v1/memories:retrieve", requestBody);

      const results: any[] = [];
      const memories: any[] = [];
      let resultSetId = "";
      let abstractReply: any = null;

      const lines = responseText.trim().split("\n");

      for (const line of lines) {
        let jsonStr = line.trim();
        if (!jsonStr) continue;

        // Handle SSE format: extract JSON from "data: {...}" lines
        if (jsonStr.startsWith("data:")) {
          jsonStr = jsonStr.substring(5).trim();
        }
        // Skip SSE event type lines and close events
        if (jsonStr.startsWith("event:") || jsonStr === "") continue;

        try {
          const item = JSON.parse(jsonStr);

          if (item.resultSetBoundary) {
            resultSetId = item.resultSetBoundary.resultSetId;
          } else if (item.memoryDefinition) {
            memories.push(item.memoryDefinition);
          } else if (item.abstractReply) {
            abstractReply = item.abstractReply;
          } else if (item.retrievedItem) {
            results.push({
              chunkId: item.retrievedItem.chunk?.chunk?.chunkId,
              chunkText: item.retrievedItem.chunk?.chunk?.chunkText,
              memoryId: item.retrievedItem.chunk?.chunk?.memoryId,
              relevanceScore: item.retrievedItem.chunk?.relevanceScore,
              memoryIndex: item.retrievedItem.chunk?.memoryIndex,
            });
          }
        } catch {
          // Skip non-JSON lines (e.g., SSE event types, close events)
        }
      }

      lastResult = {
        success: true,
        resultSetId,
        results,
        memories,
        totalResults: results.length,
        query,
        ...(abstractReply ? { abstractReply } : {}),
      };

      if (results.length > 0 || !shouldWait) {
        return lastResult;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        return {
          ...lastResult,
          message: "No results found after waiting for indexing. Memories may still be processing.",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      // biome-ignore lint/correctness/noConstantCondition: Intentional polling loop with internal break conditions
    } while (true);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to retrieve memories",
      details: error.responseBody || undefined,
    };
  }
}
