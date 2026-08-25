import type { McpToolDefinition } from '../types.js';
import { getSchemaTool, listCollectionsTool } from './schema-tools.js';
import { queryCollectionTool, mutateDocumentTool } from './data-tools.js';
import { scaffoldAstroComponentTool, scaffoldSchemaTool } from './codegen-tools.js';
import { validateConfigTool } from './validation-tools.js';

export const standardKyroMcpTools: McpToolDefinition[] = [
  getSchemaTool,
  listCollectionsTool,
  queryCollectionTool,
  mutateDocumentTool,
  scaffoldAstroComponentTool,
  scaffoldSchemaTool,
  validateConfigTool,
];

export {
  getSchemaTool,
  listCollectionsTool,
  queryCollectionTool,
  mutateDocumentTool,
  scaffoldAstroComponentTool,
  scaffoldSchemaTool,
  validateConfigTool,
};
