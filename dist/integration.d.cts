import { AstroIntegration } from 'astro';

interface KyroIntegrationOptions {
    configPath?: string;
    apiPath?: string;
    adminPath?: string;
    admin?: boolean;
    enableGraphQL?: boolean;
    enableTRPC?: boolean;
    enableWebSocket?: boolean;
}
declare function kyro(options?: KyroIntegrationOptions): AstroIntegration;

export { type KyroIntegrationOptions, kyro as default };
