import type {
  StorageProvider,
  UploadedFile,
  UploadOptions,
  ImageTransforms,
} from "./index.js";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
  uploadPreset?: string;
}

export function createCloudinaryStorage(
  config: CloudinaryConfig,
): StorageProvider {
  const getBaseUrl = () =>
    `https://api.cloudinary.com/v1_1/${config.cloudName}/upload`;

  // Generate signature for signed uploads
  const generateSignature = async (
    params: Record<string, string>,
  ): Promise<string> => {
    const crypto = await import("crypto");

    // Cloudinary signs all parameters EXCEPT 'file', 'resource_type', and 'api_key'
    // Sort keys alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    // Sign with api_secret
    return crypto
      .createHash("sha256")
      .update(sortedParams + config.apiSecret)
      .digest("hex");
  };

  return {
    name: "cloudinary",
    displayName: "Cloudinary",
    supportsDynamicResize: true,

    async upload(file: File, options?: UploadOptions): Promise<UploadedFile> {
      const formData = new FormData();
      formData.append("file", file);

      // Use upload preset if provided, otherwise try signed upload
      if (config.uploadPreset) {
        formData.append("upload_preset", config.uploadPreset);
      } else {
        // Use signed upload with timestamp
        const timestamp = Math.round(Date.now() / 1000);

        // Build params for signature (excluding file and api_key)
        const signatureParams: Record<string, string> = {
          timestamp: String(timestamp),
        };
        if (options?.folder || config.folder) {
          signatureParams.folder = options?.folder || config.folder || "";
        }

        // Generate signature
        const signature = await generateSignature(signatureParams);

        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        formData.append("api_key", config.apiKey);
      }

      if (options?.folder || config.folder) {
        formData.append("folder", options?.folder || config.folder || "");
      }

      const response = await fetch(getBaseUrl(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          `Cloudinary upload failed: ${error.error?.message || response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        public_id: string;
        format: string;
        original_filename?: string;
        bytes: number;
        secure_url: string;
        width: number;
        height: number;
      };

      return {
        id: data.public_id,
        filename: `${data.public_id}.${data.format}`,
        originalName: data.original_filename || file.name,
        mimeType: file.type || `image/${data.format}`,
        size: data.bytes,
        url: data.secure_url,
        thumbnailUrl: this.getImageUrl(data.secure_url, {
          width: 200,
          height: 200,
          fit: "crop",
        }),
        width: data.width,
        height: data.height,
        folder: options?.folder || config.folder,
        provider: "cloudinary",
        createdAt: new Date().toISOString(),
      };
    },

    async uploadFromUrl(
      url: string,
      options?: UploadOptions,
    ): Promise<UploadedFile> {
      const formData = new FormData();
      formData.append("file", url);
      formData.append("upload_preset", "ml_default");
      if (options?.folder || config.folder) {
        formData.append("folder", options?.folder || config.folder || "");
      }

      const response = await fetch(getBaseUrl(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Cloudinary upload failed");
      const data = (await response.json()) as {
        public_id: string;
        format: string;
        original_filename?: string;
        bytes: number;
        secure_url: string;
        width: number;
        height: number;
      };

      return {
        id: data.public_id,
        filename: `${data.public_id}.${data.format}`,
        originalName: data.original_filename || url.split("/").pop() || "file",
        mimeType: `image/${data.format}`,
        size: data.bytes,
        url: data.secure_url,
        thumbnailUrl: this.getImageUrl(data.secure_url, {
          width: 200,
          height: 200,
          fit: "crop",
        }),
        width: data.width,
        height: data.height,
        provider: "cloudinary",
        createdAt: new Date().toISOString(),
      };
    },

    async delete(id: string): Promise<void> {
      try {
        // Extract public_id from URL (id is actually the full URL in our case)
        const parts = id.split("/image/upload/");
        if (parts.length !== 2) {
          console.warn("[Cloudinary delete] Could not parse URL:", id);
          return;
        }

        const publicId = parts[1]
          .replace(/^v\d+\//, "")
          .replace(/\.[^.]+$/, "");

        // Generate signature for deletion
        const timestamp = Math.round(Date.now() / 1000);
        const signatureParams: Record<string, string> = {
          timestamp: String(timestamp),
          public_id: publicId,
        };

        const sortedParams = Object.keys(signatureParams)
          .sort()
          .map((key) => `${key}=${signatureParams[key]}`)
          .join("&");

        const crypto = await import("crypto");
        const signature = crypto
          .createHash("sha256")
          .update(sortedParams + config.apiSecret)
          .digest("hex");

        // Delete using Cloudinary destroy API
        const deleteUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`;
        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        formData.append("api_key", config.apiKey);

        const response = await fetch(deleteUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.warn("[Cloudinary delete] Failed:", error);
        }
      } catch (e: any) {
        console.warn("[Cloudinary delete] Error:", e.message);
      }
    },

    async rename(oldUrl: string, newKey: string): Promise<string> {
      let version = "";
      let newPublicId = newKey.replace(/\.[^.]+$/, "");
      let folder = "";

      try {
        // Extract old public_id from URL
        const parts = oldUrl.split("/image/upload/");
        if (parts.length !== 2) {
          console.warn("[Cloudinary rename] Could not parse old URL:", oldUrl);
          return oldUrl;
        }

        // Extract folder path and filename from old public_id
        const urlPath = parts[1];

        // First remove version (e.g., v1776872613/) from the path
        const versionMatch = urlPath.match(/^(v\d+)\//);
        version = versionMatch ? versionMatch[1] : "";

        // Now remove version from urlPath to get clean public_id
        const publicIdWithoutVersion = urlPath
          .replace(/^v\d+\//, "")
          .replace(/\.[^.]+$/, "");

        // Extract folder path (everything before the last segment)
        const folderParts = publicIdWithoutVersion.split("/");
        folder =
          folderParts.length > 1 ? folderParts.slice(0, -1).join("/") : "";

        // Build new public_id: folder + new filename (without extension)
        const newFilename = newKey.replace(/\.[^.]+$/, "");
        newPublicId = folder ? `${folder}/${newFilename}` : newFilename;



        // Generate signature for rename operation
        const timestamp = Math.round(Date.now() / 1000);
        const signatureParams: Record<string, string> = {
          from_public_id: publicIdWithoutVersion,
          to_public_id: newPublicId,
          timestamp: String(timestamp),
        };

        const sortedParams = Object.keys(signatureParams)
          .sort()
          .map((key) => `${key}=${signatureParams[key]}`)
          .join("&");

        const crypto = await import("crypto");
        const signature = crypto
          .createHash("sha256")
          .update(sortedParams + config.apiSecret)
          .digest("hex");

        // Rename using Cloudinary rename API
        const formData = new FormData();
        formData.append("from_public_id", publicIdWithoutVersion);
        formData.append("to_public_id", newPublicId);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);
        formData.append("api_key", config.apiKey);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/image/rename`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (response.ok) {
          const data = (await response.json()) as { secure_url: string };

          return data.secure_url;
        } else {
          const error = await response.json();
          console.warn("[Cloudinary rename] Failed:", error);
          // Return new URL with version
          const versionStr = version ? `/${version}/` : "/";
          return `https://res.cloudinary.com/${config.cloudName}/image/upload${versionStr}${newPublicId}.${newKey.split(".").pop()}`;
        }
      } catch (e: any) {
        console.warn("[Cloudinary rename] Error:", e.message);
        // Return new URL on error with version
        const versionStr = version ? `/${version}/` : "/";
        return `https://res.cloudinary.com/${config.cloudName}/image/upload${versionStr}${newPublicId}.${newKey.split(".").pop()}`;
      }
    },

    getImageUrl(url: string, transforms?: ImageTransforms): string {
      if (!transforms) return url;

      // Cloudinary transformation URL structure:
      // res.cloudinary.com/cloud_name/image/upload/t_transform/v1/public_id.jpg
      const parts = url.split("/upload/");
      if (parts.length !== 2) return url;

      const transformationArr: string[] = [];
      if (transforms.width) transformationArr.push(`w_${transforms.width}`);
      if (transforms.height) transformationArr.push(`h_${transforms.height}`);
      if (transforms.fit) {
        const fitMap: Record<string, string> = {
          crop: "c_fill",
          clip: "c_fit",
          scale: "c_scale",
          fill: "c_fill",
        };
        transformationArr.push(fitMap[transforms.fit] || "c_limit");
      }
      if (transforms.quality) transformationArr.push(`q_${transforms.quality}`);
      if (transforms.format) transformationArr.push(`f_${transforms.format}`);

      const transformationStr = transformationArr.join(",");
      return `${parts[0]}/upload/${transformationStr}/${parts[1]}`;
    },

    async generateThumbnail(file: UploadedFile): Promise<string> {
      return this.getImageUrl(file.url, {
        width: 200,
        height: 200,
        fit: "crop",
      });
    },

    async list(): Promise<UploadedFile[]> {
      return []; // Requires Admin API
    },

    async exists(url: string): Promise<boolean> {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    },

    async createFolder(): Promise<void> {
      // Cloudinary creates folders implicitly on upload
    },

    async deleteFolder(): Promise<void> {
      // Requires Cloudinary Admin API (not available from frontend)
    },
  };
}
