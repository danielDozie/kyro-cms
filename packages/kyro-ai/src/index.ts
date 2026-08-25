export { AiAutoSeoPlugin, type AiAutoSeoPluginOptions } from './plugins/auto-seo.js';
export { AiAssistantPlugin, type AiAssistantPluginOptions } from './plugins/assistant.js';
export { AiVectorPlugin, type AiVectorPluginOptions, cosineSimilarity } from './plugins/vector-embeddings.js';
export {
  generateKyroSchemaFromPrompt,
  type GenerateSchemaOptions,
  KyroFieldSchema,
  KyroCollectionSchema,
  KyroSchemaSynthesisResult,
} from './plugins/prompt-to-schema.js';
export {
  generateImageAltText,
  type VisionAltTextOptions,
  type AltTextResult,
} from './plugins/vision-alt-text.js';
