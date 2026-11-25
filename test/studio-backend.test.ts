import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { createRESTAPI } from "../src/api/rest/index.js";
import { pageCollection } from "../src/templates/pages.js";
import { formsCollection } from "../src/templates/forms.js";
import { formEntriesCollection } from "../src/templates/form-entries.js";
import { mediaCollection } from "../src/templates/media.js";
import { imageFrame } from "../src/storage/image-framing.js";
import {
  validateStudioDocument,
  enforceStudioValidation,
} from "../src/studio/validation.js";
import { checkOptimisticConcurrency } from "../src/studio/occ.js";
import {
  getStudioSiteCapabilities,
  resolvePagePublicUrl,
  resolvePagePreviewUrl,
  createPreviewToken,
  verifyPreviewToken,
} from "../src/studio/capabilities.js";
import { getDeliveryCoordinator } from "../src/studio/delivery.js";
import { isStudioBridgeMessage } from "../packages/kyro-studio/src/bridge.js";

describe("Studio Backend Delivery & Quality Gates", () => {
  let db: LocalAdapter;
  let app: any;
  let registry: any;

  beforeAll(async () => {
    db = new LocalAdapter({ path: ":memory:" });
    await db.connect();

    registry = createRegistry();
    const openPageCollection = {
      ...pageCollection,
      access: { read: () => true, create: () => true, update: () => true },
    };
    const openFormsCollection = {
      ...formsCollection,
      access: { read: () => true, create: () => true, update: () => true },
    };
    const openMediaCollection = {
      ...mediaCollection,
      access: { read: () => true, create: () => true, update: () => true },
    };
    registry.addCollection(openPageCollection);
    registry.addCollection(openFormsCollection);
    registry.addCollection(formEntriesCollection);
    registry.addCollection(openMediaCollection);

    await db.init([
      registry.getCollection("pages")!,
      registry.getCollection("forms")!,
      registry.getCollection("form-entries")!,
      registry.getCollection("media")!,
    ]);

    app = await createRESTAPI(registry, db, {
      authSecret: "test-studio-jwt-secret-key-9999",
      studio: { enabled: true },
    });
  });

  afterAll(async () => {
    await db?.disconnect();
  });

  const request = (
    path: string,
    method = "GET",
    data?: unknown,
    headers: Record<string, string> = {}
  ) =>
    app.fetch(
      new Request(`http://localhost${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      })
    );

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Recursive Schema Validation & Finite Layout Grammar
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Recursive schema validation and layout grammar", () => {
    it("allows valid Section → Container → Row → Column → Hero nesting", () => {
      const validDoc = {
        title: "Valid Nested",
        slug: "valid-nested",
        content: [
          {
            id: "sec-1",
            blockType: "section",
            children: [
              {
                id: "cont-1",
                blockType: "container",
                children: [
                  {
                    id: "row-1",
                    blockType: "row",
                    children: [
                      {
                        id: "col-1",
                        blockType: "column",
                        children: [
                          {
                            id: "hero-1",
                            blockType: "hero",
                            singleSlide: { title: "Hello Valid" },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = validateStudioDocument(validDoc, pageCollection, { isPublish: true });
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("rejects invalid grammar: Row directly inside Column (content.0.children.0.children.0.children.0)", () => {
      const invalidNesting = {
        title: "Bad Nesting",
        slug: "bad-nesting",
        content: [
          {
            id: "sec-1",
            blockType: "section",
            children: [
              {
                id: "cont-1",
                blockType: "container",
                children: [
                  {
                    id: "row-1",
                    blockType: "row",
                    children: [
                      {
                        id: "col-1",
                        blockType: "column",
                        children: [
                          {
                            id: "bad-row",
                            blockType: "row", // Invalid: row inside column
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = validateStudioDocument(invalidNesting, pageCollection, { isPublish: true });
      expect(result.valid).toBe(false);
      const nestingIssue = result.issues.find((i) => i.code === "invalid-nesting");
      expect(nestingIssue).toBeDefined();
      expect(nestingIssue?.path).toBe("content.0.children.0.children.0.children.0.children.0");
      expect(nestingIssue?.message).toContain('"row" is not allowed inside "column"');
    });

    it("rejects invalid grammar: Hero directly inside Row without Column", () => {
      const invalidRow = {
        title: "Hero in Row",
        slug: "hero-in-row",
        content: [
          {
            id: "row-1",
            blockType: "row",
            children: [
              {
                id: "hero-1",
                blockType: "hero", // Row only accepts column
              },
            ],
          },
        ],
      };

      const result = validateStudioDocument(invalidRow, pageCollection, { isPublish: true });
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('"hero" is not allowed inside "row"');
      expect(result.issues[0].path).toBe("content.0.children.0");
    });

    it("rejects prototype pollution keys in block payloads", () => {
      const maliciousDoc = JSON.parse(
        JSON.stringify({
          title: "Malicious Doc",
          slug: "malicious",
          content: [
            {
              id: "hero-1",
              blockType: "hero",
              constructor: { injected: true },
            },
          ],
        })
      );

      const result = validateStudioDocument(maliciousDoc, pageCollection);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "prototype-pollution")).toBe(true);
    });

    it("rejects malformed block IDs", () => {
      const badIdDoc = {
        title: "Bad ID",
        slug: "bad-id",
        content: [
          {
            id: "invalid id with spaces & symbols!",
            blockType: "hero",
          },
        ],
      };

      const result = validateStudioDocument(badIdDoc, pageCollection);
      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe("invalid-id");
    });

    it("enforces depth limit (> 16 levels)", () => {
      let current: any = { id: "leaf", blockType: "hero" };
      for (let i = 0; i < 18; i++) {
        current = { id: `level-${i}`, blockType: "section", children: [current] };
      }
      const deepDoc = { title: "Deep", slug: "deep", content: [current] };

      const result = validateStudioDocument(deepDoc, pageCollection);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "max-depth-exceeded")).toBe(true);
    });

    it("preserves unknown blocks in draft save, but rejects them on publish", async () => {
      const docWithUnknown = {
        title: "Unknown Block Test",
        slug: "unknown-test",
        status: "draft",
        content: [
          {
            id: "ghost-1",
            blockType: "nonExistentBlock",
            customProp: "precious saved draft data",
          },
        ],
      };

      // Draft save succeeds and preserves unknown block data
      const draftRes = await request("/api/pages", "POST", docWithUnknown, { "X-Draft": "true" });
      expect(draftRes.status).toBe(201);
      const draftData = (await draftRes.json()).data;
      expect(draftData.content[0].blockType).toBe("nonExistentBlock");
      expect(draftData.content[0].customProp).toBe("precious saved draft data");

      // Attempting to publish the document with unrecognized block fails with path error
      const publishRes = await request(
        `/api/pages/${draftData.id}`,
        "PATCH",
        { ...draftData, status: "published" },
        { "X-Draft": "false" }
      );
      expect(publishRes.status).toBe(400);
      const err = await publishRes.json();
      expect(err.error).toContain("Unrecognized block type \"nonExistentBlock\"");
      expect(err.issues?.[0]?.path).toBe("content.0");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Draft Safety, OCC, and Autosave
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Draft safety, OCC, and autosave", () => {
    it("returns HTTP 409 conflict when saving with stale baseUpdatedAt", async () => {
      // 1. Create a document
      const initRes = await request("/api/pages", "POST", {
        title: "OCC Test",
        slug: "occ-test",
        status: "published",
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Original" } }],
      });
      expect(initRes.status).toBe(201);
      const initialDoc = (await initRes.json()).data;

      // 2. Editor A updates the document successfully
      const updateA = await request(`/api/pages/${initialDoc.id}`, "PATCH", {
        ...initialDoc,
        baseUpdatedAt: initialDoc.updatedAt,
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Editor A Heading" } }],
      });
      expect(updateA.status).toBe(200);
      const docAfterA = (await updateA.json()).data;
      expect(docAfterA.content[0].singleSlide.title).toBe("Editor A Heading");

      // 3. Editor B tries to update using the stale initial updatedAt
      const staleDate = new Date(Date.now() - 60000).toISOString();
      const updateB = await request(`/api/pages/${initialDoc.id}`, "PATCH", {
        ...initialDoc,
        baseUpdatedAt: staleDate, // Stale timestamp
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Editor B Heading" } }],
      });

      expect(updateB.status).toBe(409);
      const conflictBody = await updateB.json();
      expect(conflictBody.code).toBe("CONCURRENT_MODIFICATION");
      expect(conflictBody.currentUpdatedAt).toBeDefined();
      expect(conflictBody.latestDoc).toBeDefined();
      expect(conflictBody.latestDoc.content[0].singleSlide.title).toBe("Editor A Heading");
    });

    it("new-page draft creation returns durable document ID and draft status", async () => {
      const newDraftRes = await request("/api/pages", "POST", {
        title: "New Draft Page",
        slug: "new-draft-page",
        status: "draft",
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Draft Hero" } }],
      });
      expect(newDraftRes.status).toBe(201);
      const newDraft = (await newDraftRes.json()).data;
      expect(newDraft.id).toBeDefined();
      expect(newDraft.status).toBe("draft");

      // Reloading via GET /api/pages/:id?draft=true recovers it
      const reload = await request(`/api/pages/${newDraft.id}?draft=true`);
      expect(reload.status).toBe(200);
      const recovered = (await reload.json()).data;
      expect(recovered.id).toBe(newDraft.id);
      expect(recovered.content[0].singleSlide.title).toBe("Draft Hero");
    });

    it("publishing a stale draft fails with HTTP 409 conflict", async () => {
      // 1. Create a draft document
      const draftRes = await request("/api/pages", "POST", {
        title: "Draft to Publish",
        slug: "draft-to-publish",
        status: "draft",
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Draft v1" } }],
      });
      expect(draftRes.status).toBe(201);
      const draft = (await draftRes.json()).data;

      // Small delay to ensure timestamp advancement
      await new Promise((r) => setTimeout(r, 10));

      // 2. Someone else updates the draft
      const updateRes = await request(`/api/pages/${draft.id}`, "PATCH", {
        ...draft,
        content: [{ id: "h1", blockType: "hero", singleSlide: { title: "Draft v2" } }],
      });
      expect(updateRes.status).toBe(200);

      // 3. Trying to publish using the old baseUpdatedAt fails
      const publishRes = await request(`/api/pages/${draft.id}`, "PATCH", {
        ...draft,
        baseUpdatedAt: draft.updatedAt,
        status: "published",
      });
      expect(publishRes.status).toBe(409);
      const body = await publishRes.json();
      expect(body.code).toBe("CONCURRENT_MODIFICATION");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Reference Population and Dynamic Blocks
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. Reference population and public form sanitization", () => {
    let testFormId: string;

    beforeAll(async () => {
      // Create a form definition with private webhook and notification data
      const formRes = await request("/api/forms", "POST", {
        name: "Contact Us",
        slug: "contact-us",
        subtitle: "Send us a note",
        submitButtonText: "Send Message",
        webhooks: "https://secret-internal-webhook.example.com",
        secretKey: "super-secret-key-do-not-leak",
        fields: [
          { fieldName: "email", inputType: "email", isRequired: true },
          { fieldName: "message", inputType: "textarea", isRequired: true },
        ],
      });
      testFormId = (await formRes.json()).data.id;
    });

    it("sanitizes public form references by stripping secretKey, webhooks, and entries", async () => {
      const pageWithForm = await request("/api/pages", "POST", {
        title: "Page With Form",
        slug: "page-form",
        status: "published",
        content: [
          {
            id: "form-block-1",
            blockType: "formEmbed",
            form: testFormId,
          },
        ],
      });
      expect(pageWithForm.status).toBe(201);
      const pageId = (await pageWithForm.json()).data.id;

      // Fetch the page with depth=1
      const readRes = await request(`/api/pages/${pageId}?depth=1`);
      expect(readRes.status).toBe(200);
      const pageData = (await readRes.json()).data;
      const populatedForm = pageData.content[0].form;

      expect(populatedForm).toBeDefined();
      expect(populatedForm.name).toBe("Contact Us");
      expect(populatedForm.fields).toHaveLength(2);
      // Ensure private fields are NOT leaked
      expect(populatedForm.secretKey).toBeUndefined();
      expect(populatedForm.webhooks).toBeUndefined();
      expect(populatedForm.entries).toBeUndefined();
    });

    it("resolves references in batch via POST /api/studio/resolve-references", async () => {
      const res = await request("/api/studio/resolve-references", "POST", {
        references: [{ collection: "forms", id: testFormId }],
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.references).toBeDefined();
      const formKey = `forms/${testFormId}`;
      expect(body.references[formKey]).toBeDefined();
      expect(body.references[formKey].name).toBe("Contact Us");
      expect(body.references[formKey].secretKey).toBeUndefined();
    });

    it("normalizes populated reference objects back to scalar IDs on save without storing full objects", async () => {
      // Client sends document with populated form object and rogue studioContent/savedHtml
      const saveRes = await request("/api/pages", "POST", {
        title: "Populated Object Save",
        slug: "populated-save",
        status: "draft",
        studioContent: "<div>Rogue Rendered HTML</div>",
        savedHtml: "<p>Duplicate output</p>",
        content: [
          {
            id: "fb-1",
            blockType: "formEmbed",
            form: {
              id: testFormId,
              name: "Populated Form Object That Shouldn't Be Saved As An Object",
              fields: [{ fieldName: "email", inputType: "email" }],
            },
          },
        ],
      });

      expect(saveRes.status).toBe(201);
      const savedDoc = (await saveRes.json()).data;
      // Stored block must only retain the scalar reference ID
      expect(savedDoc.content[0].form).toBe(testFormId);
      // Disallowed root fields stripped
      expect(savedDoc.studioContent).toBeUndefined();
      expect(savedDoc.savedHtml).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Form Submission Adapter
  // ──────────────────────────────────────────────────────────────────────────
  describe("4. Form submission adapter", () => {
    let formId: string;

    beforeAll(async () => {
      const f = await request("/api/forms", "POST", {
        name: "Lead Form",
        slug: "lead-form",
        status: "published",
        redirectUrl: "https://example.com/thanks",
        fields: [
          { fieldName: "email", inputType: "email", isRequired: true },
          { fieldName: "fullName", inputType: "text", isRequired: true },
          { fieldName: "phone", inputType: "tel", isRequired: false },
        ],
      });
      formId = (await f.json()).data.id;
    });

    it("submits valid form data and returns success with redirectUrl", async () => {
      const res = await request(`/api/forms/${formId}/submit`, "POST", {
        email: "visitor@example.com",
        fullName: "Jane Doe",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.redirectUrl).toBe("https://example.com/thanks");
      expect(body.entryId).toBeDefined();

      // Verify entry in database has the submitted data
      const entry = await db.findByID({ collection: "form-entries", id: body.entryId });
      expect(entry).toBeDefined();
      expect(entry.data.email).toBe("visitor@example.com");
      expect(entry.data.fullName).toBe("Jane Doe");
    });

    it("rejects missing required fields and invalid email format with fieldErrors", async () => {
      const res = await request(`/api/forms/${formId}/submit`, "POST", {
        email: "not-an-email",
        // fullName missing
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("FORM_VALIDATION_ERROR");
      expect(body.fieldErrors?.fullName).toContain("fullName is required");
      expect(body.fieldErrors?.email).toContain("valid email address");
    });

    it("silently drops honeypot spam without creating an entry", async () => {
      const res = await request(`/api/forms/${formId}/submit`, "POST", {
        email: "spammer@bot.com",
        fullName: "Bot",
        _gotcha: "I am a spam bot",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.entryId).toBeUndefined();
    });

    it("blocks anonymous users from direct /api/form-entries creation/read", async () => {
      // Anonymous user cannot read form entries directly
      const getRes = await request("/api/form-entries");
      expect(getRes.status).toBe(403);

      // Anonymous user cannot POST arbitrary data directly to /api/form-entries
      const postRes = await request("/api/form-entries", "POST", {
        form: formId,
        data: { arbitrary: "injection" },
      });
      expect(postRes.status).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Connected Site Capabilities and Authenticated Preview
  // ──────────────────────────────────────────────────────────────────────────
  describe("5. Connected site capabilities and authenticated preview", () => {
    it("returns StudioSiteCapabilities with registered block types and features", async () => {
      const res = await request("/api/studio/capabilities");
      expect(res.status).toBe(200);
      const caps = await res.json();
      expect(caps.siteId).toBeDefined();
      expect(caps.previewOrigin).toBeDefined();
      expect(caps.rendererRevision).toBe("1.0.0");
      expect(Array.isArray(caps.blockTypes)).toBe(true);
      expect(caps.blockTypes).toContain("hero");
      expect(caps.blockTypes).toContain("section");
      expect(caps.features.forms).toBe(true);
      expect(caps.features.liveDrafts).toBe(true);
    });

    it("resolves public URLs accurately (home maps to /, slug maps to /slug)", () => {
      expect(resolvePagePublicUrl({ slug: "home" }, pageCollection)).toBe("/");
      expect(resolvePagePublicUrl({ slug: "index" }, pageCollection)).toBe("/");
      expect(resolvePagePublicUrl({ slug: "about" }, pageCollection)).toBe("/about");
      expect(resolvePagePublicUrl({ slug: "pricing-plans" }, pageCollection)).toBe("/pricing-plans");
    });

    it("mints and verifies short-lived signed preview tokens", async () => {
      const token = await createPreviewToken("pages", "page-123", "test-secret", 900);
      expect(typeof token).toBe("string");

      const verified = await verifyPreviewToken(token, "test-secret");
      expect(verified).toBeDefined();
      expect(verified?.collection).toBe("pages");
      expect(verified?.id).toBe("page-123");

      // Invalid secret rejected
      const invalid = await verifyPreviewToken(token, "wrong-secret");
      expect(invalid).toBeNull();
    });

    it("validates typed bridge messages with isStudioBridgeMessage", () => {
      expect(isStudioBridgeMessage({ type: "KYRO_STUDIO_READY", version: "1.0.0" })).toBe(true);
      expect(isStudioBridgeMessage({ type: "KYRO_STUDIO_SELECT", nodePath: "content.0" })).toBe(true);
      expect(isStudioBridgeMessage({ type: "UNKNOWN_MESSAGE" })).toBe(false);
      expect(isStudioBridgeMessage(null)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Publish Delivery and Cache/Rebuild Coordination
  // ──────────────────────────────────────────────────────────────────────────
  describe("6. Publish delivery and cache/rebuild coordination", () => {
    it("coordinates publish delivery idempotently with status tracking and retry", async () => {
      const coordinator = getDeliveryCoordinator({ mode: "ssr" });

      const delivery = await coordinator.triggerPublishDelivery({
        collection: "pages",
        documentId: "page-del-1",
        revision: "rev-100",
        slug: "delivery-test",
      });

      expect(delivery.id).toBeDefined();
      expect(delivery.status).toBe("live");
      expect(delivery.attempts).toBe(1);

      // Idempotent trigger for the same revision returns existing record
      const idempotent = await coordinator.triggerPublishDelivery({
        collection: "pages",
        documentId: "page-del-1",
        revision: "rev-100",
      });
      expect(idempotent.id).toBe(delivery.id);

      // Retry delivery
      const retried = await coordinator.retryDelivery(delivery.id);
      expect(retried.attempts).toBe(2);
      expect(retried.status).toBe("live");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Studio Suite Configuration via kyro.config & Structural Defaulting
  // ──────────────────────────────────────────────────────────────────────────
  describe("7. Studio Suite Configuration & Structural Defaulting", () => {
    it("always defaults unconfigured collections to structural without layout grammar constraints", () => {
      // Standard blog post or article collection with a blocks field, but NO admin.studio
      const structuralBlogCollection = {
        slug: "posts",
        fields: [
          { name: "title", type: "text" as const },
          {
            name: "content",
            type: "blocks" as const,
            blocks: [
              {
                slug: "codeBlock",
                fields: [{ name: "code", type: "textarea" as const }],
              },
            ],
          },
        ],
      };

      // Document with standalone codeBlock at root (not wrapped in section/container/row)
      const doc = {
        title: "Structural Code Post",
        slug: "code-post",
        content: [
          {
            id: "code-1",
            blockType: "codeBlock",
            code: "console.log('hello');",
          },
        ],
      };

      // Validation returns valid because collection defaults to structural!
      const result = validateStudioDocument(doc, structuralBlogCollection as any, { isPublish: true });
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("respects custom studio config in Kyro options for previewOrigin and capabilities", async () => {
      const customApp = await createRESTAPI(registry, db, {
        authSecret: "test-secret",
        studio: {
          enabled: true,
          previewOrigin: "https://custom-preview.example.com",
          rendererRevision: "2.5.0",
        },
      });

      const res = await customApp.fetch(new Request("http://localhost/api/studio/capabilities"));
      expect(res.status).toBe(200);
      const caps = await res.json();
      expect(caps.enabled).toBe(true);
      expect(caps.previewOrigin).toBe("https://custom-preview.example.com");
      expect(caps.rendererRevision).toBe("2.5.0");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Image Placement Crop & Hotspot Pipeline
  // ──────────────────────────────────────────────────────────────────────────
  describe("8. Image placement crop and hotspot pipeline", () => {
    let testMediaId: string;

    beforeAll(async () => {
      const mediaDoc = await db.create({
        collection: "media",
        data: {
          title: "Sample Landscape Photo",
          filename: "sample-landscape.jpg",
          mimeType: "image/jpeg",
          filesize: 102400,
          width: 1920,
          height: 1080,
          alt: "A scenic landscape",
          url: "/uploads/sample-landscape.jpg",
        },
      });
      testMediaId = mediaDoc.id;
    });

    it("preserves string media IDs and arrays for backwards compatibility", async () => {
      const doc = {
        title: "String Media Page",
        slug: "string-media-page",
        content: [
          {
            id: "h-str",
            blockType: "hero",
            singleSlide: {
              title: "String Media",
              backgroundImage: testMediaId,
            },
          },
        ],
      };

      const res = await request("/api/pages", "POST", doc);
      expect(res.status).toBe(201);
      const saved = (await res.json()).data;
      expect(saved.content[0].singleSlide.backgroundImage).toBe(testMediaId);
    });

    it("saves and normalizes placement object with crop and hotspot metadata", async () => {
      const placementDoc = {
        title: "Placement Media Page",
        slug: "placement-media-page",
        content: [
          {
            id: "h-place",
            blockType: "hero",
            singleSlide: {
              title: "Custom Placement",
              backgroundImage: {
                id: testMediaId,
                metadata: {
                  crop: { x: 10, y: 15, width: 75, height: 70 },
                  hotspot: { x: 45, y: 50, width: 10, height: 10 },
                },
              },
            },
          },
        ],
      };

      const res = await request("/api/pages", "POST", placementDoc);
      expect(res.status).toBe(201);
      const saved = (await res.json()).data;
      const bg = saved.content[0].singleSlide.backgroundImage;
      expect(typeof bg).toBe("object");
      expect(bg.id).toBe(testMediaId);
      expect(bg.metadata?.crop).toEqual({ x: 10, y: 15, width: 75, height: 70 });
      expect(bg.metadata?.hotspot).toEqual({ x: 45, y: 50, width: 10, height: 10 });
    });

    it("resets placement transforms cleanly back to scalar ID when metadata is cleared", async () => {
      const resetDoc = {
        title: "Reset Placement Page",
        slug: "reset-placement-page",
        content: [
          {
            id: "h-reset",
            blockType: "hero",
            singleSlide: {
              title: "Clean Scalar",
              backgroundImage: {
                id: testMediaId,
                metadata: {}, // Empty metadata = transforms reset
              },
            },
          },
        ],
      };

      const res = await request("/api/pages", "POST", resetDoc);
      expect(res.status).toBe(201);
      const saved = (await res.json()).data;
      // Normalizes cleanly back to scalar string ID!
      expect(saved.content[0].singleSlide.backgroundImage).toBe(testMediaId);
    });

    it("populates media references while preserving placement crop and hotspot metadata", async () => {
      const createRes = await request("/api/pages", "POST", {
        title: "Populated Placement Page",
        slug: "pop-place-page",
        status: "published",
        content: [
          {
            id: "h-pop",
            blockType: "hero",
            singleSlide: {
              title: "Populated",
              backgroundImage: {
                id: testMediaId,
                metadata: {
                  crop: { x: 5, y: 10, width: 80, height: 80 },
                  hotspot: { x: 60, y: 40, width: 10, height: 10 },
                },
              },
            },
          },
        ],
      });
      expect(createRes.status).toBe(201);
      const pageId = (await createRes.json()).data.id;

      // Query with depth=1
      const getRes = await request(`/api/pages/${pageId}?depth=1`);
      expect(getRes.status).toBe(200);
      const pageData = (await getRes.json()).data;
      const populatedBg = pageData.content[0].singleSlide.backgroundImage;

      expect(populatedBg).toBeDefined();
      expect(populatedBg.id).toBe(testMediaId);
      expect(populatedBg.filename).toBe("sample-landscape.jpg");
      expect(populatedBg.url).toBe("/uploads/sample-landscape.jpg");
      expect(populatedBg.metadata?.crop).toEqual({ x: 5, y: 10, width: 80, height: 80 });
      expect(populatedBg.metadata?.hotspot).toEqual({ x: 60, y: 40, width: 10, height: 10 });
    });

    it("maintains wide, square, and portrait aspect framing parity via imageFrame", () => {
      const imgW = 1920;
      const imgH = 1080;
      const crop = { x: 10, y: 10, width: 80, height: 80 };
      const hotspot = { x: 70, y: 30, width: 10, height: 10 };

      // 1. Wide aspect (16:9)
      const wide = imageFrame(imgW, imgH, crop, hotspot, 16 / 9);
      expect(wide.width).toBeGreaterThan(0);
      expect(wide.height).toBeGreaterThan(0);
      expect(wide.x).toBeGreaterThanOrEqual(crop.x);
      expect(wide.x + wide.width).toBeLessThanOrEqual(crop.x + crop.width + 0.01);

      // 2. Square aspect (1:1)
      const square = imageFrame(imgW, imgH, crop, hotspot, 1);
      expect(square.width).toBeGreaterThan(0);
      expect(square.height).toBeGreaterThan(0);
      expect(square.y).toBeGreaterThanOrEqual(crop.y);
      expect(square.y + square.height).toBeLessThanOrEqual(crop.y + crop.height + 0.01);

      // 3. Portrait aspect (9:16)
      const portrait = imageFrame(imgW, imgH, crop, hotspot, 9 / 16);
      expect(portrait.width).toBeGreaterThan(0);
      expect(portrait.height).toBeGreaterThan(0);
      expect(portrait.x).toBeGreaterThanOrEqual(crop.x);
      expect(portrait.y).toBeGreaterThanOrEqual(crop.y);
    });

    it("applies EXIF orientation and imageFrame cropping in image delivery resize pipeline", async () => {
      const { default: sharp } = await import("sharp");
      const testBuffer = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const base64Data = testBuffer.toString("base64");
      const dataUri = `data:image/jpeg;base64,${base64Data}`;

      const res = await request(
        `/api/media/resize?url=${encodeURIComponent(dataUri)}&cw=80&ch=80&cx=10&cy=10&w=100&h=100&fmt=webp`
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      expect(res.headers.get("cache-control")).toContain("public");
    });
  });
});
