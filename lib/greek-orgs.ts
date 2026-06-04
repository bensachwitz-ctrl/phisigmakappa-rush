// Preset library of major Greek-letter organizations (NIC fraternities, NPC
// sororities, and NPHC "Divine Nine"), each with its letters/glyph and a
// sensible official-ish brand palette. Used to PRELOAD the onboarding wizard so
// a chapter can pick its organization and get name + glyph + colors instantly —
// while still being free to type any letters or pick any custom colors.
//
// Colors are approximations of each org's heraldic colors expressed as a usable
// web palette (primary / a darker shade for gradients & text / a soft tint for
// backgrounds). Chapters can override any of them.

export type OrgType = "fraternity" | "sorority" | "nphc";

export type GreekOrg = {
  name: string; // full org name
  short: string; // common short name
  glyph: string; // Greek letters, e.g. "ΦΣΚ"
  type: OrgType;
  primary: string;
  dark: string;
  soft: string;
};

export const GREEK_ORGS: GreekOrg[] = [
  // ── Fraternities (NIC) ──────────────────────────────────────────────
  { name: "Phi Sigma Kappa", short: "Phi Sig", glyph: "ΦΣΚ", type: "fraternity", primary: "#C8102E", dark: "#A20D26", soft: "#FCEFF1" },
  { name: "Sigma Alpha Epsilon", short: "SAE", glyph: "ΣΑΕ", type: "fraternity", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },
  { name: "Sigma Chi", short: "Sigma Chi", glyph: "ΣΧ", type: "fraternity", primary: "#00529B", dark: "#003C73", soft: "#E8F1F9" },
  { name: "Pi Kappa Alpha", short: "Pike", glyph: "ΠΚΑ", type: "fraternity", primary: "#862633", dark: "#681D27", soft: "#F7ECEE" },
  { name: "Kappa Sigma", short: "Kappa Sig", glyph: "ΚΣ", type: "fraternity", primary: "#1B5E20", dark: "#134016", soft: "#E9F2EA" },
  { name: "Sigma Nu", short: "Sigma Nu", glyph: "ΣΝ", type: "fraternity", primary: "#B8860B", dark: "#8A6508", soft: "#FBF3DF" },
  { name: "Lambda Chi Alpha", short: "Lambda Chi", glyph: "ΛΧΑ", type: "fraternity", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },
  { name: "Beta Theta Pi", short: "Beta", glyph: "ΒΘΠ", type: "fraternity", primary: "#00529B", dark: "#003C73", soft: "#E8F1F9" },
  { name: "Phi Gamma Delta", short: "FIJI", glyph: "ΦΓΔ", type: "fraternity", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },
  { name: "Sigma Phi Epsilon", short: "SigEp", glyph: "ΣΦΕ", type: "fraternity", primary: "#6A1B9A", dark: "#4E1374", soft: "#F3EAF8" },
  { name: "Tau Kappa Epsilon", short: "TKE", glyph: "ΤΚΕ", type: "fraternity", primary: "#B0151E", dark: "#8A1018", soft: "#FBECED" },
  { name: "Alpha Tau Omega", short: "ATO", glyph: "ΑΤΩ", type: "fraternity", primary: "#0072CE", dark: "#0056A0", soft: "#E8F3FC" },
  { name: "Delta Tau Delta", short: "Delt", glyph: "ΔΤΔ", type: "fraternity", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },
  { name: "Phi Delta Theta", short: "Phi Delt", glyph: "ΦΔΘ", type: "fraternity", primary: "#003B5C", dark: "#002A42", soft: "#E7EEF3" },
  { name: "Phi Kappa Psi", short: "Phi Psi", glyph: "ΦΚΨ", type: "fraternity", primary: "#9E1B32", dark: "#7C1527", soft: "#FAEBEE" },
  { name: "Kappa Alpha Order", short: "KA", glyph: "ΚΑ", type: "fraternity", primary: "#9D2235", dark: "#7C1A2A", soft: "#F9EBED" },
  { name: "Sigma Pi", short: "Sigma Pi", glyph: "ΣΠ", type: "fraternity", primary: "#6A4C93", dark: "#523A73", soft: "#F0ECF6" },
  { name: "Pi Kappa Phi", short: "Pi Kapp", glyph: "ΠΚΦ", type: "fraternity", primary: "#003087", dark: "#00226A", soft: "#E6ECF6" },
  { name: "Delta Chi", short: "Delta Chi", glyph: "ΔΧ", type: "fraternity", primary: "#B01E2E", dark: "#8C1825", soft: "#FBEDEF" },
  { name: "Theta Chi", short: "Theta Chi", glyph: "ΘΧ", type: "fraternity", primary: "#8B0000", dark: "#6E0000", soft: "#F7E9E9" },
  { name: "Alpha Epsilon Pi", short: "AEPi", glyph: "ΑΕΠ", type: "fraternity", primary: "#003DA5", dark: "#002F7E", soft: "#E6EDF7" },
  { name: "Delta Sigma Phi", short: "Delta Sig", glyph: "ΔΣΦ", type: "fraternity", primary: "#00573F", dark: "#003D2C", soft: "#E6F0EC" },
  { name: "Phi Kappa Tau", short: "Phi Tau", glyph: "ΦΚΤ", type: "fraternity", primary: "#7A0019", dark: "#5C0013", soft: "#F6E8EB" },
  { name: "Zeta Beta Tau", short: "ZBT", glyph: "ΖΒΤ", type: "fraternity", primary: "#003DA5", dark: "#002F7E", soft: "#E6EDF7" },
  { name: "Theta Xi", short: "Theta Xi", glyph: "ΘΞ", type: "fraternity", primary: "#0033A0", dark: "#00277A", soft: "#E6EBF6" },
  { name: "Alpha Sigma Phi", short: "Alpha Sig", glyph: "ΑΣΦ", type: "fraternity", primary: "#6E0F2E", dark: "#540B23", soft: "#F4E8EC" },
  { name: "Chi Phi", short: "Chi Phi", glyph: "ΧΦ", type: "fraternity", primary: "#00205B", dark: "#001844", soft: "#E6E9F0" },

  // ── Sororities (NPC) ────────────────────────────────────────────────
  { name: "Chi Omega", short: "Chi O", glyph: "ΧΩ", type: "sorority", primary: "#9E1B34", dark: "#7C1528", soft: "#FAEBEE" },
  { name: "Kappa Kappa Gamma", short: "Kappa", glyph: "ΚΚΓ", type: "sorority", primary: "#0067A0", dark: "#004E7A", soft: "#E8F2F8" },
  { name: "Kappa Alpha Theta", short: "Theta", glyph: "ΚΑΘ", type: "sorority", primary: "#1F2937", dark: "#111827", soft: "#F1F2F4" },
  { name: "Delta Delta Delta", short: "Tri Delta", glyph: "ΔΔΔ", type: "sorority", primary: "#0067A0", dark: "#004E7A", soft: "#E8F2F8" },
  { name: "Pi Beta Phi", short: "Pi Phi", glyph: "ΠΒΦ", type: "sorority", primary: "#6E2639", dark: "#561E2D", soft: "#F4ECEF" },
  { name: "Alpha Chi Omega", short: "Alpha Chi", glyph: "ΑΧΩ", type: "sorority", primary: "#BE1E2D", dark: "#971722", soft: "#FBECEE" },
  { name: "Alpha Phi", short: "Alpha Phi", glyph: "ΑΦ", type: "sorority", primary: "#6E1F3E", dark: "#561830", soft: "#F4ECEF" },
  { name: "Gamma Phi Beta", short: "Gamma Phi", glyph: "ΓΦΒ", type: "sorority", primary: "#5A3825", dark: "#43291B", soft: "#F1ECE8" },
  { name: "Zeta Tau Alpha", short: "Zeta", glyph: "ΖΤΑ", type: "sorority", primary: "#1CA0A7", dark: "#157B80", soft: "#E8F7F7" },
  { name: "Kappa Delta", short: "KD", glyph: "ΚΔ", type: "sorority", primary: "#2E7D32", dark: "#205724", soft: "#EAF2EA" },
  { name: "Alpha Delta Pi", short: "ADPi", glyph: "ΑΔΠ", type: "sorority", primary: "#0072CE", dark: "#0056A0", soft: "#E8F3FC" },
  { name: "Delta Zeta", short: "DZ", glyph: "ΔΖ", type: "sorority", primary: "#C04E6D", dark: "#993D56", soft: "#FBECF0" },
  { name: "Sigma Kappa", short: "Sigma Kappa", glyph: "ΣΚ", type: "sorority", primary: "#7B1E3B", dark: "#5F172E", soft: "#F6EAEE" },
  { name: "Phi Mu", short: "Phi Mu", glyph: "ΦΜ", type: "sorority", primary: "#C04E6D", dark: "#993D56", soft: "#FBECF0" },
  { name: "Alpha Omicron Pi", short: "AOII", glyph: "ΑΟΠ", type: "sorority", primary: "#9E1B34", dark: "#7C1528", soft: "#FAEBEE" },
  { name: "Sigma Sigma Sigma", short: "Tri Sigma", glyph: "ΣΣΣ", type: "sorority", primary: "#6A2C70", dark: "#502156", soft: "#F1EAF2" },
  { name: "Delta Gamma", short: "DG", glyph: "ΔΓ", type: "sorority", primary: "#8C6239", dark: "#6B4A2B", soft: "#F4EFE8" },
  { name: "Alpha Gamma Delta", short: "Alpha Gam", glyph: "ΑΓΔ", type: "sorority", primary: "#B03A2E", dark: "#8A2D24", soft: "#FAEDEB" },
  { name: "Delta Phi Epsilon", short: "DPhiE", glyph: "ΔΦΕ", type: "sorority", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },

  // ── NPHC "Divine Nine" ──────────────────────────────────────────────
  { name: "Alpha Phi Alpha", short: "Alphas", glyph: "ΑΦΑ", type: "nphc", primary: "#00205B", dark: "#001844", soft: "#E6E9F0" },
  { name: "Kappa Alpha Psi", short: "Kappas", glyph: "ΚΑΨ", type: "nphc", primary: "#9D1C2E", dark: "#7C1525", soft: "#FAEBED" },
  { name: "Omega Psi Phi", short: "Ques", glyph: "ΩΨΦ", type: "nphc", primary: "#4B2E83", dark: "#37205F", soft: "#F0ECF7" },
  { name: "Phi Beta Sigma", short: "Sigmas", glyph: "ΦΒΣ", type: "nphc", primary: "#003DA5", dark: "#002F7E", soft: "#E6EDF7" },
  { name: "Iota Phi Theta", short: "Iotas", glyph: "ΙΦΘ", type: "nphc", primary: "#4A3B2A", dark: "#372C20", soft: "#F0EDE8" },
  { name: "Alpha Kappa Alpha", short: "AKA", glyph: "ΑΚΑ", type: "nphc", primary: "#177245", dark: "#105331", soft: "#E7F2EB" },
  { name: "Delta Sigma Theta", short: "Deltas", glyph: "ΔΣΘ", type: "nphc", primary: "#9D1C2E", dark: "#7C1525", soft: "#FAEBED" },
  { name: "Zeta Phi Beta", short: "Zetas", glyph: "ΖΦΒ", type: "nphc", primary: "#003DA5", dark: "#002F7E", soft: "#E6EDF7" },
  { name: "Sigma Gamma Rho", short: "SGRho", glyph: "ΣΓΡ", type: "nphc", primary: "#003087", dark: "#00226A", soft: "#E6ECF6" },
];

// The 24-letter Greek alphabet (upper + lower + spelled name) for a click-to-build
// glyph picker, so a chapter can compose ANY letters — including chapter
// designations (e.g. "Gamma Triton" → ΓΤ) — without an external keyboard.
export const GREEK_ALPHABET: { upper: string; lower: string; name: string }[] = [
  { upper: "Α", lower: "α", name: "Alpha" },
  { upper: "Β", lower: "β", name: "Beta" },
  { upper: "Γ", lower: "γ", name: "Gamma" },
  { upper: "Δ", lower: "δ", name: "Delta" },
  { upper: "Ε", lower: "ε", name: "Epsilon" },
  { upper: "Ζ", lower: "ζ", name: "Zeta" },
  { upper: "Η", lower: "η", name: "Eta" },
  { upper: "Θ", lower: "θ", name: "Theta" },
  { upper: "Ι", lower: "ι", name: "Iota" },
  { upper: "Κ", lower: "κ", name: "Kappa" },
  { upper: "Λ", lower: "λ", name: "Lambda" },
  { upper: "Μ", lower: "μ", name: "Mu" },
  { upper: "Ν", lower: "ν", name: "Nu" },
  { upper: "Ξ", lower: "ξ", name: "Xi" },
  { upper: "Ο", lower: "ο", name: "Omicron" },
  { upper: "Π", lower: "π", name: "Pi" },
  { upper: "Ρ", lower: "ρ", name: "Rho" },
  { upper: "Σ", lower: "σ", name: "Sigma" },
  { upper: "Τ", lower: "τ", name: "Tau" },
  { upper: "Υ", lower: "υ", name: "Upsilon" },
  { upper: "Φ", lower: "φ", name: "Phi" },
  { upper: "Χ", lower: "χ", name: "Chi" },
  { upper: "Ψ", lower: "ψ", name: "Psi" },
  { upper: "Ω", lower: "ω", name: "Omega" },
];

// A small curated palette of common chapter colors for quick custom picks
// (independent of the org presets above).
export const COMMON_BRAND_COLORS: { name: string; hex: string }[] = [
  { name: "Cardinal", hex: "#C8102E" },
  { name: "Crimson", hex: "#9D1C2E" },
  { name: "Garnet", hex: "#862633" },
  { name: "Royal Purple", hex: "#4B2E83" },
  { name: "Violet", hex: "#6A1B9A" },
  { name: "Navy", hex: "#00205B" },
  { name: "Royal Blue", hex: "#003DA5" },
  { name: "Azure", hex: "#0072CE" },
  { name: "Teal", hex: "#1CA0A7" },
  { name: "Forest Green", hex: "#1B5E20" },
  { name: "Kelly Green", hex: "#2E7D32" },
  { name: "Old Gold", hex: "#B8860B" },
  { name: "Burnt Orange", hex: "#B03A2E" },
  { name: "Maroon", hex: "#7B1E3B" },
  { name: "Rose", hex: "#C04E6D" },
  { name: "Charcoal", hex: "#1F2937" },
];

/** Lighten/darken helpers so a picked primary can auto-suggest dark + soft. */
export function shade(hex: string, lightenToward: "dark" | "soft"): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  let r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  if (lightenToward === "dark") {
    r = Math.round(r * 0.78); g = Math.round(g * 0.78); b = Math.round(b * 0.78);
  } else {
    r = Math.round(r + (255 - r) * 0.92); g = Math.round(g + (255 - g) * 0.92); b = Math.round(b + (255 - b) * 0.92);
  }
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
