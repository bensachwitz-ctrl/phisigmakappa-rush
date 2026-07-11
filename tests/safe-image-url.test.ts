import { describe, it, expect } from "vitest";
import { isSafeImageUrl, sanitizeImageUrl } from "@/lib/safe-image-url";

// Guards the site-builder pasted-image-URL path: XSS via dangerous schemes and
// SSRF/internal-probing via loopback/private hosts must never reach an <img src>
// or persist to a section's cfg.

describe("isSafeImageUrl", () => {
  it("accepts public http(s) image URLs", () => {
    expect(isSafeImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isSafeImageUrl("http://images.example.org/logo.png?v=2")).toBe(true);
    expect(isSafeImageUrl("https://res.cloudinary.com/x/image/upload/a.webp")).toBe(true);
  });

  it("accepts protocol-relative and root-relative paths", () => {
    expect(isSafeImageUrl("//cdn.example.com/a.png")).toBe(true);
    expect(isSafeImageUrl("/uploads/hero.jpg")).toBe(true);
  });

  it("accepts the dev-mock raster data URLs but rejects data:text/html + svg", () => {
    expect(isSafeImageUrl("data:image/webp;base64,AAAA")).toBe(true);
    expect(isSafeImageUrl("data:image/png;base64,iVBOR")).toBe(true);
    expect(isSafeImageUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBe(false);
  });

  it("rejects XSS schemes (javascript:/vbscript:/file:) incl. obfuscation", () => {
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeImageUrl("file:///etc/passwd")).toBe(false);
    // embedded control char to smuggle a scheme past a naive prefix check
    expect(isSafeImageUrl("java\tscript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("java\nscript:alert(1)")).toBe(false);
  });

  it("rejects loopback / private / link-local hosts (SSRF)", () => {
    expect(isSafeImageUrl("http://localhost/internal")).toBe(false);
    expect(isSafeImageUrl("http://localhost:3000/admin")).toBe(false);
    expect(isSafeImageUrl("http://127.0.0.1/x")).toBe(false);
    expect(isSafeImageUrl("http://0.0.0.0/x")).toBe(false);
    expect(isSafeImageUrl("http://10.0.0.5/x")).toBe(false);
    expect(isSafeImageUrl("http://192.168.1.1/x")).toBe(false);
    expect(isSafeImageUrl("http://172.16.0.9/x")).toBe(false);
    expect(isSafeImageUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafeImageUrl("http://box.internal/x")).toBe(false);
    expect(isSafeImageUrl("http://printer.local/x")).toBe(false);
    expect(isSafeImageUrl("http://[::1]/x")).toBe(false);
  });

  it("rejects empty / nullish / non-URL junk", () => {
    expect(isSafeImageUrl("")).toBe(false);
    expect(isSafeImageUrl("   ")).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl("not a url")).toBe(false);
  });

  it("172.x public sub-blocks are NOT treated as private", () => {
    expect(isSafeImageUrl("http://172.15.0.1/x")).toBe(true);
    expect(isSafeImageUrl("http://172.32.0.1/x")).toBe(true);
  });
});

describe("sanitizeImageUrl", () => {
  it("returns a trimmed safe URL, else empty string", () => {
    expect(sanitizeImageUrl("  https://cdn.example.com/a.jpg  ")).toBe("https://cdn.example.com/a.jpg");
    expect(sanitizeImageUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeImageUrl("http://localhost/x")).toBe("");
    expect(sanitizeImageUrl("")).toBe("");
  });
});
