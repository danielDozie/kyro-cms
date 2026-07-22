import { createCloudinaryStorage } from "../storage/cloudinary.js";
import { KyroPlugin } from "./index.js";

export class CloudinaryStoragePlugin extends KyroPlugin {
  constructor() {
    super("@kyro-cms/storage-cloudinary");
    this.version = "1.0.0";
    this.description = "Cloudinary image and video storage";
  }

  async init(kyro: any) {
    const registry = kyro.registry?.storageProviders as import("../storage/registry.js").StorageProviderRegistry;
    if (!registry) return;

    registry.register({
      type: "cloudinary",
      displayName: "Cloudinary",
      pluginName: this.name,
      configKey: "cloudinary",
      configFields: [
        { name: "cloudName", type: "text", label: "Cloud Name", required: true },
        { name: "apiKey", type: "text", label: "API Key", required: true },
        { name: "apiSecret", type: "password", label: "API Secret", required: true },
        { name: "folder", type: "text", label: "Folder", admin: { placeholder: "Optional folder path" } },
        {
          name: "uploadPreset", type: "text", label: "Upload Preset (optional)",
          admin: { placeholder: "Leave empty for signed uploads", description: "If not set, uploads will be signed with API Secret" },
        },
      ],
      extractConfig: (sc: any) => ({
        cloudName: sc.cloudinary?.cloudName || "",
        apiKey: sc.cloudinary?.apiKey || "",
        apiSecret: sc.cloudinary?.apiSecret || "",
        folder: sc.cloudinary?.folder,
        uploadPreset: sc.cloudinary?.uploadPreset,
      }),
      extractRawConfig: (c: any) => {
        const cl = c?.cloudinary || c;
        return {
          cloudName: cl?.cloudName || "",
          apiKey: cl?.apiKey || "",
          apiSecret: cl?.apiSecret || "",
          folder: cl?.folder,
          uploadPreset: cl?.uploadPreset,
        };
      },
      factory: (c: any) => createCloudinaryStorage(c),
    });
  }
}

export const cloudinaryStoragePlugin = new CloudinaryStoragePlugin();
