// Single-tenant chapter identifier helper.
//
// Until W3+ multi-tenant arrives, every chapter-scoped record uses a fixed
// string. Centralising this means W3 only has to change one constant + add a
// request-scoped resolver.
//
// Always import `CURRENT_CHAPTER_ID` rather than hardcoding the string in
// individual routes.

export const CURRENT_CHAPTER_ID = "gamma-triton";

export const CURRENT_CHAPTER_DISPLAY_NAME = "Phi Sigma Kappa — Gamma Triton (USC)";
