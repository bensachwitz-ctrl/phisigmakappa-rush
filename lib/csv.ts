/**
 * CSV cell escaping with spreadsheet formula-injection neutralization.
 *
 * A cell beginning with = + - @ TAB CR can be interpreted as a formula by
 * Excel/Sheets/LibreOffice and execute when a file is opened (OWASP "CSV
 * Injection"). User-controlled free text (names, hometowns, background info,
 * custom answers) flows into our PII exports, so we prefix any such cell with a
 * single quote BEFORE quoting/escaping. Benign values pass through unchanged
 * (aside from the standard quote-wrapping when they contain "/,/newline).
 *
 * Extracted to a lib module so it is unit-testable AND importable from any
 * route handler (a Next.js `route.ts` may only export HTTP method handlers).
 */
export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
