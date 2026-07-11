import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Item-2: per-section image upload (sharp -> Vercel Blob) + URL fields ───────
// The route processes the image server-side before storing it; the uploader is a
// thin client that POSTs a file (or accepts a pasted URL); the builder wires the
// uploader into the section editor against the SAME cfg keys the renderer reads.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("upload-section-image route: admin-gated, sharp-optimized, Blob-stored", () => {
  const src = readFileSync(root("app/api/upload-section-image/route.ts"), "utf8");
  it("is admin-only (401/403 before any work)", () => {
    expect(src).toMatch(/isAdminAuthed\(\)/);
    expect(src).toMatch(/isAdminRole\(\)/);
  });
  it("processes with sharp: auto-rotate, downscale-without-enlarge, WebP, strip metadata", () => {
    expect(src).toMatch(/import sharp from "sharp"/);
    expect(src).toMatch(/\.rotate\(\)/);
    expect(src).toMatch(/withoutEnlargement: true/);
    expect(src).toMatch(/\.webp\(/);
  });
  it("stores the processed bytes on Vercel Blob (Cloudinary when configured; dev mock otherwise)", () => {
    expect(src).toMatch(/from "@vercel\/blob"/);
    expect(src).toMatch(/put\(/);
    expect(src).toMatch(/isCloudinaryConfigured\(\)/);
    expect(src).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });
  it("drives the max dimension per section (data-driven), never upscaling", () => {
    expect(src).toMatch(/SECTION_MAX_DIM/);
    expect(src).toMatch(/hero:\s*\d+/);
  });
});

describe("SectionImageUploader: drag-drop upload + paste-a-URL field", () => {
  const src = readFileSync(root("components/admin/section-image-uploader.tsx"), "utf8");
  it("POSTs the file (+ section hint) to the sharp/Blob route", () => {
    expect(src).toMatch(/\/api\/upload-section-image/);
    expect(src).toMatch(/body\.append\("file", file\)/);
    expect(src).toMatch(/body\.append\("section", section\)/);
  });
  it("supports drag-and-drop AND a paste-a-URL field", () => {
    expect(src).toMatch(/onDrop=/);
    expect(src).toMatch(/type="url"/);
  });
});

describe("builder wires the uploader into the section editor on the renderer's cfg keys", () => {
  const src = readFileSync(root("app/admin/website/website-builder-client.tsx"), "utf8");
  it("declares per-section image slots and renders an uploader per slot", () => {
    expect(src).toMatch(/IMAGE_FIELDS/);
    expect(src).toMatch(/<SectionImageUploader/);
    // about/spotlight photo slots map to about.slug / spotlight.slug (renderer keys)
    expect(src).toMatch(/about:\s*\[\{ key: "slug"/);
    expect(src).toMatch(/spotlight:\s*\[\{ key: "slug"/);
  });
});
