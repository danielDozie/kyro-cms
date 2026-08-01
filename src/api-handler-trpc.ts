import type { APIRoute } from "astro";
import { warmKyroInstance, kyroInstance } from "./api-handler.js";

function disabledResponse() {
  return new Response(JSON.stringify({ error: "tRPC is disabled" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

const ACCESS_DEFAULTS: Record<string, boolean> = {
  graphqlEnabled: false,
  trpcEnabled: false,
  wsEnabled: false,
  requireAuth: false,
};

async function checkTRPCEnabled(): Promise<boolean> {
  try {
    const doc = await kyroInstance!.db.findOne({
      collection: "_globals_access-settings",
      where: {},
      draft: true,
    });
    return doc?.apiAccess?.trpcEnabled ?? ACCESS_DEFAULTS.trpcEnabled;
  } catch {
    return true;
  }
}

export const ALL: APIRoute = async (context) => {
  await warmKyroInstance(context);
  if (!(await checkTRPCEnabled())) return disabledResponse();
  const app = kyroInstance!.getTRPC();
  return app.fetch(context.request, context.locals);
};
