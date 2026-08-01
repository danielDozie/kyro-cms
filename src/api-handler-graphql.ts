import type { APIRoute } from "astro";
import { warmKyroInstance, kyroInstance } from "./api-handler.js";

function toNativeResponse(r: Response): Response {
  return new Response(r.body, r);
}

const ACCESS_DEFAULTS: Record<string, boolean> = {
  graphqlEnabled: false,
  trpcEnabled: false,
  wsEnabled: false,
  requireAuth: false,
};

function disabledResponse() {
  return new Response(JSON.stringify({ error: "GraphQL is disabled" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function checkGraphQLEnabled(): Promise<boolean> {
  try {
    const doc = await kyroInstance!.db.findOne({
      collection: "_globals_access-settings",
      where: {},
      draft: true,
    });
    return doc?.apiAccess?.graphqlEnabled ?? ACCESS_DEFAULTS.graphqlEnabled;
  } catch {
    return true;
  }
}

export const POST: APIRoute = async (context) => {
  await warmKyroInstance(context);
  if (!(await checkGraphQLEnabled())) return disabledResponse();
  const app = kyroInstance!.getGraphQL();
  const res = await app.fetch(context.request, context.locals);
  return toNativeResponse(res);
};

export const GET: APIRoute = async (context) => {
  await warmKyroInstance(context);
  if (!(await checkGraphQLEnabled())) return disabledResponse();
  const app = kyroInstance!.getGraphQL();
  const res = await app.fetch(context.request, context.locals);
  return toNativeResponse(res);
};
