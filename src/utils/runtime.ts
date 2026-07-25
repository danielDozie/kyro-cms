/**
 * Edge Runtime detection utility for Kyro CMS.
 * Detects V8 Isolate runtimes (Vercel Edge, Cloudflare Workers, Deno Deploy, Netlify Edge).
 */
export function isEdgeRuntime(): boolean {
  if (typeof globalThis === 'undefined') return false;

  return (
    // @ts-ignore
    typeof globalThis.EdgeRuntime === 'string' ||
    // @ts-ignore
    typeof globalThis.WebSocketPair !== 'undefined' ||
    // @ts-ignore
    typeof globalThis.Deno !== 'undefined' ||
    (typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge')
  );
}
