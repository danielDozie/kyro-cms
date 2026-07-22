import { sequence } from "astro:middleware";
import { onRequest as authMiddleware } from "./auth.js";
import { onRequest as maintenanceMiddleware } from "./maintenance.js";

export const onRequest = sequence(maintenanceMiddleware, authMiddleware);
