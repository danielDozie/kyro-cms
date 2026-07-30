import { coreGlobalSettings } from "./settings/index.js";
import { postsCollections } from "./posts.js";
import type { CollectionConfig } from "../registry/types.js";

export const blogCollections: Record<string, any> = {
  ...postsCollections,
};

export { coreGlobalSettings };
