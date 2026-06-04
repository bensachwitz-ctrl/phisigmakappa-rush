// Curated catalog of ~90 well-known Greek-letter organizations for the chapter
// onboarding wizard's organization picker. Each entry carries the actual Greek
// glyphs and a usable two-color brand palette so picking an org can prefill the
// chapter's Greek letters + brand-primary/secondary on the live preview.
//
// ── Why this file exists separately from `lib/greek-orgs.ts` ───────────────
// `lib/greek-orgs.ts` is the original 56-org PRESET library already wired into
// the wizard (its `GreekOrg` has glyph/primary/dark/soft and an "nphc" type).
// This NEW catalog is purpose-built for the SchoolOrgPicker typeahead the spec
// asked for: a broader list (~90), the `{ name, letters, type, colors? }` shape,
// and a ranked `searchOrgs(q, type?, limit?)`. Keeping it standalone avoids
// touching/breaking the existing preset picker and its consumers.
//
// Colors approximate each org's official heraldic colors as a web-usable
// [primaryHex, secondaryHex] pair. They are a starting point and remain fully
// overridable by the chapter.

/**
 * Organization council type. The picker exposes only fraternity vs. sorority as
 * a top-level filter (per the spec), but NPHC orgs (the "Divine Nine") span both
 * — so they are tagged with their actual gender council ("fraternity" for the
 * men's orgs, "sorority" for the women's) and additionally flagged `nphc: true`
 * for callers that want to surface that lineage.
 */
export type OrgCategory = "fraternity" | "sorority";

export type GreekOrg = {
  /** Full organization name, e.g. "Phi Sigma Kappa". */
  name: string;
  /** Common short name / nickname, e.g. "Phi Sig" or "Pike". */
  short: string;
  /** Actual Greek glyphs, e.g. "ΦΣΚ". */
  letters: string;
  /** Top-level filter category. NPHC orgs use their gender council here. */
  type: OrgCategory;
  /** [primaryHex, secondaryHex] — approx official colors. Optional per spec. */
  colors?: [string, string];
  /** True for NPHC "Divine Nine" orgs (informational; not a filter bucket). */
  nphc?: boolean;
};

export const GREEK_ORGS: GreekOrg[] = [
  // ── IFC / NIC Fraternities ───────────────────────────────────────────
  { name: "Phi Sigma Kappa", short: "Phi Sig", letters: "ΦΣΚ", type: "fraternity", colors: ["#C8102E", "#A6A6A6"] },
  { name: "Sigma Chi", short: "Sigma Chi", letters: "ΣΧ", type: "fraternity", colors: ["#00529B", "#F1B82D"] },
  { name: "Sigma Alpha Epsilon", short: "SAE", letters: "ΣΑΕ", type: "fraternity", colors: ["#4B2E83", "#B59A57"] },
  { name: "Pi Kappa Alpha", short: "Pike", letters: "ΠΚΑ", type: "fraternity", colors: ["#862633", "#C9A227"] },
  { name: "Kappa Sigma", short: "Kappa Sig", letters: "ΚΣ", type: "fraternity", colors: ["#1B5E20", "#9E1B32"] },
  { name: "Sigma Nu", short: "Sigma Nu", letters: "ΣΝ", type: "fraternity", colors: ["#000000", "#B8860B"] },
  { name: "Sigma Phi Epsilon", short: "SigEp", letters: "ΣΦΕ", type: "fraternity", colors: ["#6A1B9A", "#B0151E"] },
  { name: "Beta Theta Pi", short: "Beta", letters: "ΒΘΠ", type: "fraternity", colors: ["#00529B", "#EC3A82"] },
  { name: "Lambda Chi Alpha", short: "Lambda Chi", letters: "ΛΧΑ", type: "fraternity", colors: ["#4B2E83", "#0C7C59"] },
  { name: "Phi Delta Theta", short: "Phi Delt", letters: "ΦΔΘ", type: "fraternity", colors: ["#003B5C", "#A6A6A6"] },
  { name: "Alpha Tau Omega", short: "ATO", letters: "ΑΤΩ", type: "fraternity", colors: ["#0072CE", "#B8860B"] },
  { name: "Tau Kappa Epsilon", short: "TKE", letters: "ΤΚΕ", type: "fraternity", colors: ["#B0151E", "#A6A6A6"] },
  { name: "Delta Tau Delta", short: "Delt", letters: "ΔΤΔ", type: "fraternity", colors: ["#4B2E83", "#B8860B"] },
  { name: "Theta Chi", short: "Theta Chi", letters: "ΘΧ", type: "fraternity", colors: ["#8B0000", "#FFFFFF"] },
  { name: "Phi Gamma Delta", short: "FIJI", letters: "ΦΓΔ", type: "fraternity", colors: ["#4B2E83", "#FFFFFF"] },
  { name: "Kappa Alpha Order", short: "KA", letters: "ΚΑ", type: "fraternity", colors: ["#9D2235", "#B5985A"] },
  { name: "Pi Kappa Phi", short: "Pi Kapp", letters: "ΠΚΦ", type: "fraternity", colors: ["#003087", "#C99700"] },
  { name: "Delta Chi", short: "Delta Chi", letters: "ΔΧ", type: "fraternity", colors: ["#B01E2E", "#F1B82D"] },
  { name: "Chi Phi", short: "Chi Phi", letters: "ΧΦ", type: "fraternity", colors: ["#00205B", "#C8102E"] },
  { name: "Acacia", short: "Acacia", letters: "ΑΚΚ", type: "fraternity", colors: ["#000000", "#9D2235"] },
  { name: "Alpha Epsilon Pi", short: "AEPi", letters: "ΑΕΠ", type: "fraternity", colors: ["#003DA5", "#F1B82D"] },
  { name: "Phi Kappa Psi", short: "Phi Psi", letters: "ΦΚΨ", type: "fraternity", colors: ["#9E1B32", "#E10098"] },
  { name: "Phi Kappa Tau", short: "Phi Tau", letters: "ΦΚΤ", type: "fraternity", colors: ["#7A0019", "#B8860B"] },
  { name: "Phi Kappa Sigma", short: "Skulls", letters: "ΦΚΣ", type: "fraternity", colors: ["#000000", "#B59A57"] },
  { name: "Sigma Pi", short: "Sigma Pi", letters: "ΣΠ", type: "fraternity", colors: ["#6A4C93", "#FFFFFF"] },
  { name: "Sigma Alpha Mu", short: "Sammy", letters: "ΣΑΜ", type: "fraternity", colors: ["#5A2D81", "#FFFFFF"] },
  { name: "Theta Xi", short: "Theta Xi", letters: "ΘΞ", type: "fraternity", colors: ["#0033A0", "#9E1B32"] },
  { name: "Delta Sigma Phi", short: "Delta Sig", letters: "ΔΣΦ", type: "fraternity", colors: ["#00573F", "#FFFFFF"] },
  { name: "Delta Upsilon", short: "DU", letters: "ΔΥ", type: "fraternity", colors: ["#003087", "#B8860B"] },
  { name: "Delta Kappa Epsilon", short: "DKE", letters: "ΔΚΕ", type: "fraternity", colors: ["#003DA5", "#9E1B32"] },
  { name: "Alpha Sigma Phi", short: "Alpha Sig", letters: "ΑΣΦ", type: "fraternity", colors: ["#6E0F2E", "#B8860B"] },
  { name: "Zeta Beta Tau", short: "ZBT", letters: "ΖΒΤ", type: "fraternity", colors: ["#003DA5", "#FFFFFF"] },
  { name: "Zeta Psi", short: "Zete", letters: "ΖΨ", type: "fraternity", colors: ["#FFFFFF", "#000000"] },
  { name: "Theta Delta Chi", short: "TDX", letters: "ΘΔΧ", type: "fraternity", colors: ["#003B5C", "#FFFFFF"] },
  { name: "Chi Psi", short: "Chi Psi", letters: "ΧΨ", type: "fraternity", colors: ["#4B2E83", "#B8860B"] },
  { name: "Psi Upsilon", short: "Psi U", letters: "ΨΥ", type: "fraternity", colors: ["#7A0019", "#B8860B"] },
  { name: "Alpha Gamma Rho", short: "AGR", letters: "ΑΓΡ", type: "fraternity", colors: ["#004B23", "#F1B82D"] },
  { name: "FarmHouse", short: "FarmHouse", letters: "FH", type: "fraternity", colors: ["#013A6B", "#B59A57"] },
  { name: "Triangle", short: "Triangle", letters: "△", type: "fraternity", colors: ["#46166B", "#A6A6A6"] },
  { name: "Pi Lambda Phi", short: "Pilam", letters: "ΠΛΦ", type: "fraternity", colors: ["#5A2D81", "#B8860B"] },
  { name: "Tau Epsilon Phi", short: "TEP", letters: "ΤΕΦ", type: "fraternity", colors: ["#5A2D81", "#A6A6A6"] },
  { name: "Alpha Chi Rho", short: "Crows", letters: "ΑΧΡ", type: "fraternity", colors: ["#9D2235", "#FFFFFF"] },
  { name: "Sigma Tau Gamma", short: "Sig Tau", letters: "ΣΤΓ", type: "fraternity", colors: ["#003087", "#FFFFFF"] },
  { name: "Phi Iota Alpha", short: "Phiotas", letters: "ΦΙΑ", type: "fraternity", colors: ["#8B0000", "#B8860B"] },
  { name: "Lambda Theta Phi", short: "Lambdas", letters: "ΛΘΦ", type: "fraternity", colors: ["#8B0000", "#FFFFFF"] },
  { name: "Lambda Sigma Upsilon", short: "LSU Frat", letters: "ΛΣΥ", type: "fraternity", colors: ["#000000", "#C8102E"] },
  { name: "Sigma Lambda Beta", short: "Betas", letters: "ΣΛΒ", type: "fraternity", colors: ["#7A0019", "#B59A57"] },

  // ── NPC Sororities ───────────────────────────────────────────────────
  { name: "Alpha Phi", short: "Alpha Phi", letters: "ΑΦ", type: "sorority", colors: ["#6E1F3E", "#A6A6A6"] },
  { name: "Chi Omega", short: "Chi O", letters: "ΧΩ", type: "sorority", colors: ["#9E1B34", "#B8860B"] },
  { name: "Delta Gamma", short: "DG", letters: "ΔΓ", type: "sorority", colors: ["#8C6239", "#F2A900"] },
  { name: "Kappa Kappa Gamma", short: "Kappa", letters: "ΚΚΓ", type: "sorority", colors: ["#0067A0", "#1CA0A7"] },
  { name: "Kappa Alpha Theta", short: "Theta", letters: "ΚΑΘ", type: "sorority", colors: ["#000000", "#B8860B"] },
  { name: "Pi Beta Phi", short: "Pi Phi", letters: "ΠΒΦ", type: "sorority", colors: ["#6E2639", "#9CC3E5"] },
  { name: "Delta Delta Delta", short: "Tri Delta", letters: "ΔΔΔ", type: "sorority", colors: ["#0067A0", "#F1B82D"] },
  { name: "Alpha Chi Omega", short: "Alpha Chi", letters: "ΑΧΩ", type: "sorority", colors: ["#BE1E2D", "#5A6915"] },
  { name: "Gamma Phi Beta", short: "Gamma Phi", letters: "ΓΦΒ", type: "sorority", colors: ["#5A3825", "#B59A57"] },
  { name: "Kappa Delta", short: "KD", letters: "ΚΔ", type: "sorority", colors: ["#2E7D32", "#FFFFFF"] },
  { name: "Alpha Delta Pi", short: "ADPi", letters: "ΑΔΠ", type: "sorority", colors: ["#0072CE", "#FFFFFF"] },
  { name: "Zeta Tau Alpha", short: "Zeta", letters: "ΖΤΑ", type: "sorority", colors: ["#1CA0A7", "#A6A6A6"] },
  { name: "Delta Zeta", short: "DZ", letters: "ΔΖ", type: "sorority", colors: ["#C04E6D", "#00A86B"] },
  { name: "Phi Mu", short: "Phi Mu", letters: "ΦΜ", type: "sorority", colors: ["#C04E6D", "#B59A57"] },
  { name: "Sigma Kappa", short: "Sigma Kappa", letters: "ΣΚ", type: "sorority", colors: ["#7B1E3B", "#B59A57"] },
  { name: "Alpha Omicron Pi", short: "AOII", letters: "ΑΟΠ", type: "sorority", colors: ["#9E1B34", "#FFFFFF"] },
  { name: "Alpha Gamma Delta", short: "Alpha Gam", letters: "ΑΓΔ", type: "sorority", colors: ["#B03A2E", "#B8860B"] },
  { name: "Delta Phi Epsilon", short: "DPhiE", letters: "ΔΦΕ", type: "sorority", colors: ["#4B2E83", "#017A4A"] },
  { name: "Sigma Sigma Sigma", short: "Tri Sigma", letters: "ΣΣΣ", type: "sorority", colors: ["#6A2C70", "#FFFFFF"] },
  { name: "Sigma Delta Tau", short: "SDT", letters: "ΣΔΤ", type: "sorority", colors: ["#F1B82D", "#003087"] },
  { name: "Alpha Epsilon Phi", short: "AEPhi", letters: "ΑΕΦ", type: "sorority", colors: ["#00573F", "#B59A57"] },
  { name: "Alpha Sigma Alpha", short: "ASA", letters: "ΑΣΑ", type: "sorority", colors: ["#9E1B34", "#B59A57"] },
  { name: "Alpha Sigma Tau", short: "AST", letters: "ΑΣΤ", type: "sorority", colors: ["#00573F", "#B8860B"] },
  { name: "Alpha Xi Delta", short: "AZD", letters: "ΑΞΔ", type: "sorority", colors: ["#7B1E3B", "#B59A57"] },
  { name: "Delta Phi Lambda", short: "DPhiL", letters: "ΔΦΛ", type: "sorority", colors: ["#017A4A", "#B59A57"] },
  { name: "Gamma Alpha Omega", short: "GAO", letters: "ΓΑΩ", type: "sorority", colors: ["#7A0019", "#B59A57"] },
  { name: "Kappa Beta Gamma", short: "KBG", letters: "ΚΒΓ", type: "sorority", colors: ["#003DA5", "#3FBFE0"] },
  { name: "Lambda Theta Alpha", short: "LTA", letters: "ΛΘΑ", type: "sorority", colors: ["#7A0019", "#B8860B"] },
  { name: "Phi Sigma Sigma", short: "Phi Sig Sig", letters: "ΦΣΣ", type: "sorority", colors: ["#003087", "#B8860B"] },
  { name: "Sigma Lambda Gamma", short: "SLG", letters: "ΣΛΓ", type: "sorority", colors: ["#5A2D81", "#F1B82D"] },
  { name: "Theta Phi Alpha", short: "Theta Phi", letters: "ΘΦΑ", type: "sorority", colors: ["#003B5C", "#B59A57"] },

  // ── NPHC "Divine Nine" (tagged by gender council; nphc: true) ─────────
  { name: "Alpha Phi Alpha", short: "Alphas", letters: "ΑΦΑ", type: "fraternity", nphc: true, colors: ["#000000", "#B8860B"] },
  { name: "Kappa Alpha Psi", short: "Kappas", letters: "ΚΑΨ", type: "fraternity", nphc: true, colors: ["#9D1C2E", "#A6A6A6"] },
  { name: "Omega Psi Phi", short: "Ques", letters: "ΩΨΦ", type: "fraternity", nphc: true, colors: ["#4B2E83", "#B8860B"] },
  { name: "Phi Beta Sigma", short: "Sigmas", letters: "ΦΒΣ", type: "fraternity", nphc: true, colors: ["#003DA5", "#FFFFFF"] },
  { name: "Iota Phi Theta", short: "Iotas", letters: "ΙΦΘ", type: "fraternity", nphc: true, colors: ["#4A3B2A", "#B8860B"] },
  { name: "Alpha Kappa Alpha", short: "AKA", letters: "ΑΚΑ", type: "sorority", nphc: true, colors: ["#046A38", "#F1B82D"] },
  { name: "Delta Sigma Theta", short: "Deltas", letters: "ΔΣΘ", type: "sorority", nphc: true, colors: ["#9D1C2E", "#FFFFFF"] },
  { name: "Zeta Phi Beta", short: "Zetas", letters: "ΖΦΒ", type: "sorority", nphc: true, colors: ["#003DA5", "#FFFFFF"] },
  { name: "Sigma Gamma Rho", short: "SGRho", letters: "ΣΓΡ", type: "sorority", nphc: true, colors: ["#003087", "#B8860B"] },
];

/** Normalize for accent/case-insensitive matching (matches lib/schools.ts). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Case-insensitive ranked search over the org catalog. Matches on the full
 * name, the short name/nickname, and the Greek glyphs.
 *
 * Ranking (lower = surfaces first):
 *   0 — short name starts with query (e.g. "pi" → "Pike")
 *   1 — full name starts with query
 *   2 — glyphs match query exactly (e.g. "ΦΣΚ")
 *   3 — short name contains query
 *   4 — full name contains query
 * Ties break alphabetically by full name.
 *
 * @param q     raw user query
 * @param type  optional council filter ("fraternity" | "sorority")
 * @param limit max results (default 8)
 */
export function searchOrgs(q: string, type?: OrgCategory, limit = 8): GreekOrg[] {
  const query = norm(q);
  const pool = type ? GREEK_ORGS.filter((o) => o.type === type) : GREEK_ORGS;

  if (!query) {
    return pool.slice(0, limit);
  }

  const scored: { org: GreekOrg; score: number }[] = [];
  for (const org of pool) {
    const name = norm(org.name);
    const short = norm(org.short);
    const letters = norm(org.letters);

    let score = Infinity;
    if (short.startsWith(query)) score = Math.min(score, 0);
    if (name.startsWith(query)) score = Math.min(score, 1);
    if (letters === query) score = Math.min(score, 2);
    if (short.includes(query)) score = Math.min(score, 3);
    if (name.includes(query)) score = Math.min(score, 4);

    if (score !== Infinity) scored.push({ org, score });
  }

  scored.sort((a, b) =>
    a.score !== b.score ? a.score - b.score : a.org.name.localeCompare(b.org.name)
  );

  return scored.slice(0, limit).map((s) => s.org);
}
