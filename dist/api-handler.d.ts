import { APIRoute } from 'astro';

declare let kyroInstance: any;
declare function warmKyroInstance(context?: any): Promise<void>;
declare const ALL: APIRoute;
declare const createKyroHandler: APIRoute;

export { ALL, createKyroHandler, kyroInstance, warmKyroInstance };
