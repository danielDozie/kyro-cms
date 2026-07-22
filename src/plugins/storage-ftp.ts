import { createFtpStorage } from "../storage/ftp.js";
import { KyroPlugin } from "./index.js";

export class FtpStoragePlugin extends KyroPlugin {
  constructor() {
    super("@kyro-cms/storage-ftp");
    this.version = "1.0.0";
    this.description = "FTP/SFTP storage provider";
  }

  async init(kyro: any) {
    const registry = kyro.registry?.storageProviders as import("../storage/registry.js").StorageProviderRegistry;
    if (!registry) return;

    registry.register({
      type: "ftp",
      displayName: "FTP",
      pluginName: this.name,
      configKey: "ftp",
      configFields: [
        { name: "host", type: "text", label: "Host", required: true, admin: { placeholder: "ftp.example.com" } },
        { name: "port", type: "number", label: "Port", defaultValue: 21, admin: { placeholder: "21 for FTP" } },
        { name: "user", type: "text", label: "Username", required: true },
        { name: "password", type: "password", label: "Password", required: true },
        { name: "secure", type: "checkbox", label: "Use TLS/SSL", defaultValue: false, admin: { description: "Enable TLS/SSL for secure connections (FTP only)" } },
        { name: "baseUrl", type: "text", label: "Base URL", required: true, admin: { placeholder: "https://files.example.com" } },
        { name: "prefix", type: "text", label: "Path Prefix", admin: { placeholder: "uploads" } },
      ],
      extractConfig: (sc: any) => ({
        host: sc.ftp?.host || "",
        port: sc.ftp?.port || 21,
        user: sc.ftp?.user || "",
        password: sc.ftp?.password || "",
        secure: sc.ftp?.secure || false,
        baseUrl: sc.ftp?.baseUrl || "",
        prefix: sc.ftp?.prefix,
        type: "ftp" as const,
      }),
      extractRawConfig: (c: any) => {
        const ftp = c?.ftp || c;
        return {
          host: ftp?.host || "",
          port: ftp?.port || 21,
          user: ftp?.user || "",
          password: ftp?.password || "",
          secure: ftp?.secure || false,
          baseUrl: ftp?.baseUrl || "",
          prefix: ftp?.prefix,
          type: "ftp" as const,
        };
      },
      factory: (c: any) => createFtpStorage(c),
    });
  }
}

export const ftpStoragePlugin = new FtpStoragePlugin();
