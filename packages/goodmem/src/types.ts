/**
 * Configuration for connecting to a GoodMem API instance.
 */
export interface GoodMemConfig {
  /** The base URL of your GoodMem API server (e.g., https://api.goodmem.ai or http://localhost:8080) */
  baseUrl: string;
  /** Your GoodMem API key for authentication (X-API-Key) */
  apiKey: string;
}

/**
 * Standard response shape returned by all GoodMem tools.
 */
export interface GoodMemToolResult {
  success: boolean;
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

/**
 * Supported MIME types for file uploads.
 */
export const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  html: "text/html",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * Resolve a file extension to a MIME type.
 */
export function getMimeType(extension: string): string | null {
  return MIME_TYPES[extension.toLowerCase().replace(".", "")] || null;
}
