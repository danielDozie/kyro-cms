import type { z } from 'zod';
import type { KyroConfig, CollectionConfig, GlobalConfig } from '@kyro-cms/core';

// ============================================================================
// JSON-RPC 2.0 Types
// ============================================================================

export interface JsonRpcRequest<T = any> {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: T;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export enum McpErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ResourceNotFound = -32001,
  ToolExecutionError = -32002,
}

// ============================================================================
// Model Context Protocol (MCP) Types
// ============================================================================

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version?: string;
  };
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpServerCapabilities;
  serverInfo: McpServerInfo;
}

// ============================================================================
// MCP Tools Types
// ============================================================================

export interface McpToolTextContent {
  type: 'text';
  text: string;
}

export interface McpToolImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface McpToolResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
}

export type McpToolContent = McpToolTextContent | McpToolImageContent | McpToolResourceContent;

export interface McpToolResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpToolSchema {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

export interface McpToolDefinition<TParams = any> {
  name: string;
  description: string;
  inputSchema: McpToolSchema;
  zodSchema?: z.ZodType<TParams>;
  handler: (args: TParams, context: McpExecutionContext) => Promise<McpToolResult> | McpToolResult;
}

// ============================================================================
// MCP Resources Types
// ============================================================================

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface McpResourceReadResult {
  contents: McpResourceContent[];
}

export type McpResourceReader = (
  uri: string,
  context: McpExecutionContext
) => Promise<McpResourceReadResult> | McpResourceReadResult;

// ============================================================================
// MCP Prompts Types
// ============================================================================

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPromptDefinition {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: McpToolContent;
}

export interface McpPromptResult {
  description?: string;
  messages: McpPromptMessage[];
}

export type McpPromptGetter = (
  args: Record<string, string>,
  context: McpExecutionContext
) => Promise<McpPromptResult> | McpPromptResult;

// ============================================================================
// Execution Context & Server Options
// ============================================================================

export interface McpExecutionContext {
  config: KyroConfig;
  getKyroInstance?: () => any;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) => void;
}

export interface KyroMcpServerOptions {
  config: KyroConfig;
  kyroInstance?: any;
  serverInfo?: Partial<McpServerInfo>;
  enableDataMutations?: boolean;
}
