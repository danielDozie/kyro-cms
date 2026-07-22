import { describe, it, expect } from "vitest";
import { normalizeUploadFields } from "../admin/src/lib/normalize-upload-fields";

describe("normalizeUploadFields", () => {
  it("should return primitives as-is", () => {
    expect(normalizeUploadFields(null)).toBeNull();
    expect(normalizeUploadFields(undefined)).toBeUndefined();
    expect(normalizeUploadFields("hello")).toBe("hello");
    expect(normalizeUploadFields(123)).toBe(123);
    expect(normalizeUploadFields(true)).toBe(true);
  });

  it("should recursively normalize arrays", () => {
    const input = [
      { id: "1", url: "/url1", filename: "file1.png", mimeType: "image/png" },
      "not-an-object",
      { id: "2", url: "/url2", filename: "file2.jpg", mimeType: "image/jpeg" },
    ];
    const output = normalizeUploadFields(input);
    expect(output).toEqual(["1", "not-an-object", "2"]);
  });

  it("should normalize small media objects with ~4-8 keys to their ID string", () => {
    const mediaObj = {
      id: "media-id-123",
      url: "/uploads/media-id-123.jpg",
      filename: "test.jpg",
      mimeType: "image/jpeg",
    };
    expect(normalizeUploadFields(mediaObj)).toBe("media-id-123");
  });

  it("should normalize fully populated MediaRow objects with > 8 keys (e.g. 17 keys) to their ID string", () => {
    const mediaRowObj = {
      id: "media-id-123",
      url: "/uploads/media-id-123.jpg",
      filename: "test.jpg",
      mimeType: "image/jpeg",
      width: 800,
      height: 600,
      size: 15420,
      createdAt: "2026-06-22T17:00:00Z",
      updatedAt: "2026-06-22T17:00:00Z",
      alt: "Test image",
      caption: null,
      description: null,
      uploadedBy: "user-1",
      folderId: null,
      provider: "local",
      providerMetadata: null,
      blurhash: "L6PZfH%g00OF4nof9F%M00wb~qof",
    };
    expect(normalizeUploadFields(mediaRowObj)).toBe("media-id-123");
  });

  it("should not normalize non-media objects or objects exceeding 25 keys", () => {
    const customObj = {
      id: "some-id",
      url: "/some/url",
      // missing filename and mimeType (does not satisfy hasMediaField)
    };
    expect(normalizeUploadFields(customObj)).toEqual(customObj);
  });

  it("should recursively normalize nested objects (like block components or groups)", () => {
    const formPayload = {
      title: "My Page",
      heroImage: {
        id: "img-456",
        url: "/img.jpg",
        filename: "img.jpg",
        mimeType: "image/jpeg",
        width: 1000,
        height: 500,
      },
      blocks: [
        {
          type: "image-block",
          image: {
            id: "img-789",
            url: "/img2.jpg",
            filename: "img2.jpg",
            mimeType: "image/jpeg",
          },
        },
      ],
    };

    expect(normalizeUploadFields(formPayload)).toEqual({
      title: "My Page",
      heroImage: "img-456",
      blocks: [
        {
          type: "image-block",
          image: "img-789",
        },
      ],
    });
  });
});
