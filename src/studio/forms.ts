import type { BaseAdapter } from "../registry/types.js";
import type { Registry } from "../registry/index.js";
import { ApiError } from "../utils/errors.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 10;
const submissionCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const record = submissionCounts.get(ipAddress);

  if (!record || now > record.resetAt) {
    submissionCounts.set(ipAddress, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_SUBMISSIONS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-\(\).]{7,25}$/;

export interface SubmitFormOptions {
  db: BaseAdapter;
  registry: Registry;
  formIdOrSlug: string;
  data: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

export interface FormSubmissionResponse {
  success: boolean;
  message: string;
  redirectUrl?: string | null;
  entryId?: string;
}

export async function handleFormSubmission(
  options: SubmitFormOptions
): Promise<FormSubmissionResponse> {
  const { db, registry, formIdOrSlug, data, ipAddress = "127.0.0.1", tenantId } = options;

  // 1. Rate limiting check
  if (!checkRateLimit(ipAddress)) {
    throw new ApiError(429, "Too many form submissions. Please try again in a minute.", {
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  // 2. Anti-spam honeypot check
  if (data._gotcha || data._hp || data.honeypot) {
    // Silently acknowledge honeypot triggers without writing entries
    return {
      success: true,
      message: "Thank you for your submission.",
      redirectUrl: null,
    };
  }

  // 3. Find form definition by id or slug
  let formDoc: any = null;
  try {
    formDoc = await db.findByID({
      collection: "forms",
      id: formIdOrSlug,
      tenantId,
      draft: false,
    });
  } catch {
    // Try by slug
  }

  if (!formDoc) {
    const slugMatches = await db.find({
      collection: "forms",
      where: { slug: { equals: formIdOrSlug } },
      limit: 1,
      tenantId,
      draft: false,
    });
    formDoc = slugMatches?.docs?.[0];
  }

  if (!formDoc) {
    throw new ApiError(404, `Form "${formIdOrSlug}" not found`, {
      code: "FORM_NOT_FOUND",
    });
  }

  // 4. Validate fields against form definition
  const fieldErrors: Record<string, string> = {};
  const formFields = Array.isArray(formDoc.fields) ? formDoc.fields : [];

  for (const f of formFields) {
    const fieldName = f.fieldName;
    if (!fieldName) continue;

    const val = data[fieldName];
    const isPresent = val !== undefined && val !== null && String(val).trim() !== "";

    if (f.isRequired && !isPresent) {
      fieldErrors[fieldName] = `${fieldName} is required`;
      continue;
    }

    if (isPresent) {
      if (f.inputType === "email" && !EMAIL_REGEX.test(String(val))) {
        fieldErrors[fieldName] = "Please enter a valid email address";
      } else if (f.inputType === "tel" && !PHONE_REGEX.test(String(val))) {
        fieldErrors[fieldName] = "Please enter a valid telephone number";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(400, "Form validation failed", {
      code: "FORM_VALIDATION_ERROR",
      fieldErrors,
    });
  }

  // 5. Clean data for storage
  const cleanedData: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("_") || k === "honeypot") continue;
    cleanedData[k] = v;
  }

  // 6. Create privileged form entry record
  const entry = await db.create({
    collection: "form-entries",
    data: {
      form: formDoc.id,
      data: cleanedData,
      ipAddress,
    },
    tenantId,
  });

  return {
    success: true,
    message: "Form submitted successfully",
    redirectUrl: formDoc.redirectUrl || null,
    entryId: (entry as any)?.id,
  };
}
