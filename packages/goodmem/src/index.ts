import { type Tool, type Toolkit, createTool } from "@voltagent/core";
import { GoodMemClient } from "./client";
import { createMemorySchema, executeCreateMemory } from "./tools/create-memory";
import { createSpaceSchema, executeCreateSpace } from "./tools/create-space";
import { deleteMemorySchema, executeDeleteMemory } from "./tools/delete-memory";
import { deleteSpaceSchema, executeDeleteSpace } from "./tools/delete-space";
import { executeGetMemory, getMemorySchema } from "./tools/get-memory";
import { executeGetSpace, getSpaceSchema } from "./tools/get-space";
import { executeListEmbedders, listEmbeddersSchema } from "./tools/list-embedders";
import { executeListMemories, listMemoriesSchema } from "./tools/list-memories";
import { executeListSpaces, listSpacesSchema } from "./tools/list-spaces";
import { executeRetrieveMemories, retrieveMemoriesSchema } from "./tools/retrieve-memories";
import { executeUpdateSpace, updateSpaceSchema } from "./tools/update-space";
import type { GoodMemConfig } from "./types";

// Re-export types for consumers
export type { GoodMemConfig } from "./types";
export { GoodMemClient } from "./client";

// Re-export schemas for advanced usage
export { createSpaceSchema } from "./tools/create-space";
export { createMemorySchema } from "./tools/create-memory";
export { retrieveMemoriesSchema } from "./tools/retrieve-memories";
export { getMemorySchema } from "./tools/get-memory";
export { deleteMemorySchema } from "./tools/delete-memory";
export { listSpacesSchema } from "./tools/list-spaces";
export { listEmbeddersSchema } from "./tools/list-embedders";
export { getSpaceSchema } from "./tools/get-space";
export { updateSpaceSchema } from "./tools/update-space";
export { deleteSpaceSchema } from "./tools/delete-space";
export { listMemoriesSchema } from "./tools/list-memories";

/**
 * Create the full set of GoodMem tools bound to a specific API configuration.
 *
 * Returns an array of VoltAgent `Tool` instances that can be passed directly
 * to an Agent's `tools` option or used inside a Toolkit.
 *
 * @example
 * ```ts
 * import { Agent } from "@voltagent/core";
 * import { createGoodMemTools } from "@voltagent/goodmem";
 *
 * const goodmemTools = createGoodMemTools({
 *   baseUrl: "https://api.goodmem.ai",
 *   apiKey: "gm_...",
 * });
 *
 * const agent = new Agent({
 *   name: "memory-agent",
 *   tools: goodmemTools,
 *   // ...
 * });
 * ```
 */
export function createGoodMemTools(config: GoodMemConfig): Tool<any, any>[] {
  const client = new GoodMemClient(config);

  return [
    createTool({
      name: "goodmem_create_space",
      description:
        "Create a new GoodMem space or reuse an existing one. A space is a logical container for organizing related memories, configured with embedders that convert text to vector embeddings.",
      parameters: createSpaceSchema,
      execute: (args) => executeCreateSpace(client, args),
    }),
    createTool({
      name: "goodmem_create_memory",
      description:
        "Store a document as a new memory in a GoodMem space. The memory is processed asynchronously - chunked into searchable pieces and embedded into vectors. Accepts base64 file content or plain text.",
      parameters: createMemorySchema,
      execute: (args) => executeCreateMemory(client, args),
    }),
    createTool({
      name: "goodmem_retrieve_memories",
      description:
        "Perform similarity-based semantic retrieval across one or more GoodMem spaces. Returns matching chunks ranked by relevance, with optional full memory definitions.",
      parameters: retrieveMemoriesSchema,
      execute: (args) => executeRetrieveMemories(client, args),
    }),
    createTool({
      name: "goodmem_get_memory",
      description:
        "Fetch a specific GoodMem memory record by its ID, including metadata, processing status, and optionally the original content.",
      parameters: getMemorySchema,
      execute: (args) => executeGetMemory(client, args),
    }),
    createTool({
      name: "goodmem_delete_memory",
      description:
        "Permanently delete a GoodMem memory and its associated chunks and vector embeddings.",
      parameters: deleteMemorySchema,
      execute: (args) => executeDeleteMemory(client, args),
    }),
    createTool({
      name: "goodmem_list_spaces",
      description:
        "List all available GoodMem spaces. Use this to discover existing spaces and their IDs before creating memories or performing retrieval.",
      parameters: listSpacesSchema,
      execute: (_args) => executeListSpaces(client, _args),
    }),
    createTool({
      name: "goodmem_list_embedders",
      description:
        "List all available GoodMem embedder models. Use this to discover which embedders can be used when creating a new space.",
      parameters: listEmbeddersSchema,
      execute: (_args) => executeListEmbedders(client, _args),
    }),
    createTool({
      name: "goodmem_get_space",
      description:
        "Fetch a specific GoodMem space by its ID, including embedders, chunking config, labels, and metadata.",
      parameters: getSpaceSchema,
      execute: (args) => executeGetSpace(client, args),
    }),
    createTool({
      name: "goodmem_update_space",
      description:
        "Update a GoodMem space's name, public-read flag, or labels. Only the provided fields are changed.",
      parameters: updateSpaceSchema,
      execute: (args) => executeUpdateSpace(client, args),
    }),
    createTool({
      name: "goodmem_delete_space",
      description:
        "Permanently delete a GoodMem space and all of its memories, chunks, and vector embeddings.",
      parameters: deleteSpaceSchema,
      execute: (args) => executeDeleteSpace(client, args),
    }),
    createTool({
      name: "goodmem_list_memories",
      description:
        "List all memories within a specific GoodMem space, including their IDs, processing status, and metadata.",
      parameters: listMemoriesSchema,
      execute: (args) => executeListMemories(client, args),
    }),
  ];
}

/**
 * Create a GoodMem toolkit for VoltAgent.
 *
 * Returns an object matching the VoltAgent `Toolkit` shape with name, description,
 * instructions, and tools array containing proper `Tool` instances.
 *
 * @example
 * ```ts
 * import { Agent } from "@voltagent/core";
 * import { createGoodMemToolkit } from "@voltagent/goodmem";
 *
 * const goodmemToolkit = createGoodMemToolkit({
 *   baseUrl: "https://api.goodmem.ai",
 *   apiKey: "gm_...",
 * });
 *
 * const agent = new Agent({
 *   name: "memory-agent",
 *   toolkits: [goodmemToolkit],
 *   // ...
 * });
 * ```
 */
export function createGoodMemToolkit(config: GoodMemConfig): Toolkit {
  const tools = createGoodMemTools(config);

  return {
    name: "goodmem",
    description:
      "GoodMem memory layer for AI agents - provides semantic storage, retrieval, and summarization of documents and text.",
    instructions: [
      "GoodMem tools allow you to store documents and text as memories, then retrieve them using semantic similarity search.",
      "Workflow: 1) Use goodmem_list_embedders to see available embedders. 2) Use goodmem_create_space to create a space with an embedder. 3) Use goodmem_create_memory to store content. 4) Use goodmem_retrieve_memories to search. 5) Use goodmem_get_memory to fetch details. 6) Use goodmem_delete_memory to remove.",
      "When creating a space, always pick an embedder from goodmem_list_embedders first.",
      "Memories are processed asynchronously. After creating a memory, use waitForIndexing: true when retrieving to wait for processing to complete.",
    ].join("\n"),
    addInstructions: true,
    tools,
  };
}
