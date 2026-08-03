import { APIRoute } from 'astro';

declare let kyroInstance: any;
declare function warmKyroInstance(context?: any): Promise<void>;
declare const ALL: APIRoute;

export { ALL, kyroInstance, warmKyroInstance };
