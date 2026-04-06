# @voltagent/goodmem

GoodMem is a memory layer for AI agents with support for semantic storage, retrieval, and summarization. This package exposes GoodMem operations as VoltAgent tools that can be used with any VoltAgent agent.

## Installation

```bash
pnpm add @voltagent/goodmem
```

## Quick Start

```ts
import { Agent } from "@voltagent/core";
import { createGoodMemToolkit } from "@voltagent/goodmem";

const goodmemToolkit = createGoodMemToolkit({
  baseUrl: "https://api.goodmem.ai",
  apiKey: "gm_your_api_key_here",
});

const agent = new Agent({
  name: "memory-agent",
  instructions: "You are an agent that can store and retrieve memories.",
  toolkits: [goodmemToolkit],
  // ... provider config
});
```

Or use the tools directly without a toolkit:

```ts
import { createGoodMemTools } from "@voltagent/goodmem";
import { createTool } from "@voltagent/core";

const goodmemTools = createGoodMemTools({
  baseUrl: "https://api.goodmem.ai",
  apiKey: "gm_your_api_key_here",
});

// Convert to VoltAgent Tool instances
const tools = goodmemTools.map((t) => createTool(t));
```

## Available Tools

| Tool                        | Description                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `goodmem_create_space`      | Create a new space or reuse an existing one. A space is a logical container for organizing related memories with an embedder model. |
| `goodmem_create_memory`     | Store a document (text or file) as a new memory in a space. Supports PDF, DOCX, images, and plain text.                             |
| `goodmem_retrieve_memories` | Perform semantic similarity search across one or more spaces. Returns ranked chunks with optional reranking and LLM generation.     |
| `goodmem_get_memory`        | Fetch a specific memory by ID, including metadata and optionally the original content.                                              |
| `goodmem_delete_memory`     | Permanently delete a memory and its associated chunks and embeddings.                                                               |
| `goodmem_list_spaces`       | List all available spaces and their IDs.                                                                                            |
| `goodmem_list_embedders`    | List all available embedder models for use when creating spaces.                                                                    |

## Configuration

The `GoodMemConfig` object requires:

- **baseUrl** - The base URL of your GoodMem API server (e.g., `https://api.goodmem.ai` or `http://localhost:8080`)
- **apiKey** - Your GoodMem API key for authentication

## Tool Details

### Create Space

Creates a new space with an embedder model and chunking configuration. If a space with the same name already exists, returns the existing space instead of creating a duplicate.

Parameters:

- `name` (required) - Unique name for the space
- `embedderId` (required) - Embedder model ID (use `goodmem_list_embedders` to discover available embedders)
- `chunkSize` (optional, default: 256) - Characters per chunk
- `chunkOverlap` (optional, default: 25) - Overlapping characters between chunks
- `keepStrategy` (optional, default: "KEEP_END") - Separator attachment strategy
- `lengthMeasurement` (optional, default: "CHARACTER_COUNT") - How chunk size is measured

### Create Memory

Stores content as a memory in a space. Accepts either base64-encoded file content or plain text.

Parameters:

- `spaceId` (required) - Target space ID
- `fileBase64` (optional) - Base64-encoded file content
- `fileExtension` (optional) - File extension for MIME type detection
- `textContent` (optional) - Plain text content
- `source`, `author`, `tags` (optional) - Metadata fields
- `metadata` (optional) - Additional key-value metadata

### Retrieve Memories

Performs semantic search across spaces with optional reranking and LLM-powered responses.

Parameters:

- `query` (required) - Natural language search query
- `spaceIds` (required) - Array of space IDs to search
- `maxResults` (optional, default: 5) - Maximum results
- `waitForIndexing` (optional, default: true) - Wait up to 10 seconds for newly added memories to be indexed
- `rerankerId`, `llmId` (optional) - Post-processing model IDs
- `relevanceThreshold`, `llmTemperature`, `chronologicalResort` (optional) - Advanced options

### Get Memory

Fetches a specific memory by its ID.

Parameters:

- `memoryId` (required) - The memory UUID
- `includeContent` (optional, default: true) - Whether to fetch original content

### Delete Memory

Permanently removes a memory and all associated data.

Parameters:

- `memoryId` (required) - The memory UUID to delete

## License

MIT
