import { describe, it, expect } from "vitest";
import { sanitizeRichText, htmlToPlainText, isRichTextEmpty } from "@/lib/rich-text";

describe("sanitizeRichText — keeps allowed formatting", () => {
  it("passes through basic formatting tags", () => {
    const html = "<p>Hello <strong>world</strong> and <em>friends</em></p>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("keeps headings, lists, blockquote, code", () => {
    const html =
      "<h2>Title</h2><ul><li>one</li><li>two</li></ul><blockquote>quote</blockquote><pre><code>x</code></pre>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("keeps a safe link and adds rel/target", () => {
    const out = sanitizeRichText('<a href="https://example.com">link</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('target="_blank"');
  });

  it("allows mailto and relative links", () => {
    expect(sanitizeRichText('<a href="mailto:x@y.com">m</a>')).toContain("mailto:x@y.com");
    expect(sanitizeRichText('<a href="/rush">r</a>')).toContain('href="/rush"');
    expect(sanitizeRichText('<a href="#top">t</a>')).toContain('href="#top"');
  });

  it("keeps the href on a HYPHENATED hostname (the control-char check must not eat '-')", () => {
    // Regression guard: the safe-URL check rejects embedded control chars via a
    // NUL..US range whose raw bytes render like [space-hyphen] in some editors.
    // A hyphenated domain must keep its href (not be silently downgraded to <a>).
    const out = sanitizeRichText('<a href="https://my-domain.com/path-name">go</a>');
    expect(out).toContain('href="https://my-domain.com/path-name"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    // ...while a javascript: scheme (even hyphen-adjacent) is still stripped.
    const bad = sanitizeRichText('<a href="javascript:alert-1">x</a>');
    expect(bad).not.toMatch(/javascript:/i);
    expect(bad).toBe("<a>x</a>");
  });

  it("returns '' for empty/nullish", () => {
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
  });
});

describe("sanitizeRichText — strips XSS vectors", () => {
  it("removes <script> element and its content", () => {
    const out = sanitizeRichText('<p>hi</p><script>alert(document.cookie)</script>');
    expect(out).toBe("<p>hi</p>");
    expect(out).not.toMatch(/alert|script/i);
  });

  it("removes <style> element and content", () => {
    expect(sanitizeRichText("<style>body{display:none}</style><p>ok</p>")).toBe("<p>ok</p>");
  });

  it("strips event-handler attributes", () => {
    const out = sanitizeRichText('<p onclick="alert(1)">click</p>');
    expect(out).toBe("<p>click</p>");
    expect(out).not.toMatch(/onclick/i);
  });

  it("strips img with onerror (img not allowed)", () => {
    const out = sanitizeRichText('<img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/onerror|img|alert/i);
  });

  it("neutralizes javascript: hrefs (keeps <a>, drops the href)", () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toBe("<a>x</a>");
  });

  it("neutralizes data: and vbscript: hrefs", () => {
    expect(sanitizeRichText('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toMatch(
      /data:|script/i,
    );
    expect(sanitizeRichText('<a href="vbscript:msgbox(1)">x</a>')).not.toMatch(/vbscript/i);
  });

  it("blocks entity/whitespace-obfuscated javascript hrefs", () => {
    expect(sanitizeRichText('<a href="java&#115;cript:alert(1)">x</a>')).not.toMatch(/alert|script:/i);
    expect(sanitizeRichText('<a href="  javascript:alert(1)">x</a>')).not.toMatch(/javascript/i);
  });

  it("drops iframe/object/embed entirely", () => {
    expect(sanitizeRichText('<iframe src="https://evil"></iframe>')).toBe("");
    expect(sanitizeRichText("<object data=x></object>")).toBe("");
  });

  it("escapes stray angle brackets in text position", () => {
    const out = sanitizeRichText("<p>2 < 3 and 5 > 4</p>");
    expect(out).toContain("2 &lt; 3");
    expect(out).toContain("5 &gt; 4");
  });

  it("strips HTML comments", () => {
    expect(sanitizeRichText("<!--[if IE]><script>x</script><![endif]--><p>a</p>")).toBe("<p>a</p>");
  });

  it("does not double-escape existing entities", () => {
    expect(sanitizeRichText("<p>Tom &amp; Jerry</p>")).toBe("<p>Tom &amp; Jerry</p>");
  });

  it("is idempotent on its own output", () => {
    const dirty = '<p onclick="x">hi <a href="javascript:1">l</a> <script>bad()</script></p>';
    const once = sanitizeRichText(dirty);
    expect(sanitizeRichText(once)).toBe(once);
  });
});

describe("htmlToPlainText", () => {
  it("converts blocks to newlines and bullets list items", () => {
    const txt = htmlToPlainText("<p>Intro</p><ul><li>a</li><li>b</li></ul>");
    expect(txt).toContain("Intro");
    expect(txt).toContain("- a");
    expect(txt).toContain("- b");
  });

  it("strips tags and decodes entities", () => {
    expect(htmlToPlainText("<p>Tom &amp; Jerry &lt;3</p>")).toBe("Tom & Jerry <3");
  });

  it("collapses excessive blank lines", () => {
    expect(htmlToPlainText("<p>a</p><p></p><p></p><p>b</p>")).toBe("a\n\nb");
  });
});

describe("isRichTextEmpty", () => {
  it("treats an empty Tiptap doc as empty", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("")).toBe(true);
    expect(isRichTextEmpty("<p><br></p>")).toBe(true);
  });

  it("treats real content as non-empty", () => {
    expect(isRichTextEmpty("<p>hi</p>")).toBe(false);
  });
});
