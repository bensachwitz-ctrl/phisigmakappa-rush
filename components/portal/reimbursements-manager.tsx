"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Receipt,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

/**
 * Member-facing Treasury reimbursement manager (brothers portal).
 *
 * Calls the existing account API (app/api/account/expenses):
 *   GET  → the signed-in member's own reimbursement requests
 *   POST → { amountCents, category, description, receiptUrl? } creates a PENDING row
 *
 * The submit closes the loop end-to-end: a member submits here, the treasurer
 * sees it in /admin/treasury and approves / reimburses / denies. Status is
 * surfaced back to the member via the badge + decided-by line on each row.
 *
 * Chapter-branded to match the portal (maroon / cream / amber identity). Gold
 * (amber) is reserved for the semantic PENDING badge only.
 */

// Shape mirrors the Prisma Expense row returned by the API (dates arrive as
// ISO strings over JSON).
interface Expense {
  id: string;
  submittedById: string | null;
  submittedByName: string | null;
  amountCents: number;
  category: string;
  description: string;
  status: string; // PENDING | APPROVED | REIMBURSED | DENIED
  receiptUrl: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReimbursementsManagerProps {
  initialExpenses?: Expense[];
  // When true the parent already server-loaded the rows, so we skip the initial
  // client fetch (avoids a redundant round-trip + flash of the loading state).
  preloaded?: boolean;
}

const CATEGORIES = ["Event", "Supplies", "Food", "Travel", "Philanthropy", "Other"] as const;

const STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string; icon: LucideIcon }
> = {
  PENDING: {
    label: "Pending",
    // Gold/amber is intentional here — the one semantic exception in the portal.
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    icon: Clock,
  },
  APPROVED: {
    // Brand blue-tone for "approved, not yet paid out".
    label: "Approved",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
    icon: CheckCircle,
  },
  REIMBURSED: {
    label: "Reimbursed",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
    icon: Wallet,
  },
  DENIED: {
    label: "Denied",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-600",
    icon: XCircle,
  },
};

function statusMeta(status: string) {
  return STATUS_META[status] || STATUS_META.PENDING;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Soft maroon medallion empty-state matching the dashboard's PortalEmpty. */
function PortalEmpty({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="relative">
        <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-maroon-200/40 blur-2xl" />
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-100 to-cream-100 text-maroon-700 ring-1 ring-maroon-200 shadow-sm">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-maroon-900">{title}</p>
        {sub && <p className="text-xs text-maroon-500 max-w-xs">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReimbursementsManager({
  initialExpenses = [],
  preloaded = false,
}: ReimbursementsManagerProps) {
  const router = useRouter();
  const { push } = useToast();
  const { greekLetters, terms } = useChapterIdentity();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [loading, setLoading] = useState(!preloaded);

  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load the member's own requests unless the server already provided them.
  useEffect(() => {
    if (preloaded) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/expenses", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.ok && Array.isArray(data.expenses)) {
          setExpenses(data.expenses);
        } else if (res.status === 401) {
          // Session expired between page render and fetch — send to login.
          router.push("/portal/brothers");
          return;
        }
      } catch {
        if (active) {
          push({
            title: "Couldn't load your reimbursements",
            description: "Check your connection and refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [preloaded, push, router]);

  // Parse a dollar string ("$1,234.56" / "12.5" / "12") into integer cents.
  // Returns null when the value isn't a positive amount.
  function parseAmountToCents(raw: string): number | null {
    const cleaned = raw.replace(/[$,\s]/g, "");
    if (!cleaned) return null;
    if (!/^\d*\.?\d*$/.test(cleaned)) return null;
    const dollars = Number(cleaned);
    if (!Number.isFinite(dollars) || dollars <= 0) return null;
    const cents = Math.round(dollars * 100);
    if (cents < 1) return null;
    return cents;
  }

  const totals = useMemo(() => {
    const sum = (s: string) =>
      expenses.filter((e) => e.status === s).reduce((acc, e) => acc + e.amountCents, 0);
    return {
      pending: sum("PENDING"),
      approved: sum("APPROVED"),
      reimbursed: sum("REIMBURSED"),
    };
  }, [expenses]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setFormError("Enter a dollar amount greater than $0.00.");
      return;
    }
    if (!description.trim()) {
      setFormError("Add a short description of what this was for.");
      return;
    }
    const trimmedReceipt = receiptUrl.trim();
    if (trimmedReceipt) {
      try {
        // Mirror the server's URL validation so we fail fast with a clear message.
        new URL(trimmedReceipt);
      } catch {
        setFormError("The receipt link doesn't look like a valid URL.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account/expenses", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          category,
          description: description.trim(),
          receiptUrl: trimmedReceipt || undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data.expense) {
        setExpenses((prev) => [data.expense as Expense, ...prev]);
        setAmount("");
        setCategory(CATEGORIES[0]);
        setDescription("");
        setReceiptUrl("");
        push({
          title: "Reimbursement submitted",
          description: `${formatCents(cents)} · ${category} — sent to the treasurer for review.`,
          variant: "success",
        });
      } else if (res.status === 401) {
        setFormError("Your session expired. Please sign in again.");
        push({ title: "Session expired", description: "Sign in again to submit.", variant: "destructive" });
        router.push("/portal/brothers");
      } else if (res.status === 429) {
        setFormError(data?.error || "You're submitting too fast — give it a minute and try again.");
      } else if (res.status === 400) {
        setFormError(data?.error || "Please double-check the form and try again.");
      } else {
        setFormError(data?.error || "Something went wrong submitting your request. Try again.");
      }
    } catch {
      setFormError("A connection error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950">
      {/* Header */}
      <header className="bg-white border-b border-maroon-100 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-800 text-cream-50 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-maroon-900 leading-tight">Reimbursements</h1>
              <p className="text-xs text-maroon-600">{greekLetters} Treasury • {terms.member} requests</p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-maroon-200 text-maroon-800 hover:bg-cream-50 text-xs h-9 rounded-lg cursor-pointer"
          >
            <a href="/portal/brothers/dashboard">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </a>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ── Submit form ──────────────────────────────────────────── */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-maroon-100 shadow-sm">
              <h2 className="font-bold text-maroon-900 text-lg mb-1 flex items-center gap-2">
                <Plus className="w-5 h-5 text-maroon-600" />
                Submit a Request
              </h2>
              <p className="text-xs text-maroon-500 mb-4 leading-relaxed">
                Spent your own money on something for the chapter? Request it back here — the
                treasurer reviews every submission.
              </p>

              {formError && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold"
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
                {/* Amount */}
                <div>
                  <label htmlFor="rb-amount" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-maroon-500 text-sm font-semibold">
                      $
                    </span>
                    <input
                      id="rb-amount"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl text-sm text-maroon-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus:border-maroon-500"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="rb-category" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Category
                  </label>
                  <select
                    id="rb-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl text-sm text-maroon-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus:border-maroon-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="rb-description" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Description
                  </label>
                  <textarea
                    id="rb-description"
                    rows={3}
                    placeholder="e.g. Cups, plates, and ice for the philanthropy cookout."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl text-sm text-maroon-900 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus:border-maroon-500"
                  />
                </div>

                {/* Receipt URL */}
                <div>
                  <label htmlFor="rb-receipt" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Receipt Link <span className="text-maroon-400 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    id="rb-receipt"
                    type="url"
                    inputMode="url"
                    placeholder="https://link-to-receipt-photo"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl text-sm text-maroon-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus:border-maroon-500"
                  />
                  <p className="text-[10px] text-maroon-500 mt-1">
                    Paste a link to a photo of your receipt (Drive, Dropbox, etc.).
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-maroon-800 hover:bg-maroon-900 text-cream-50 py-2.5 rounded-xl shadow font-semibold cursor-pointer disabled:cursor-not-allowed motion-reduce:transition-none"
                >
                  {submitting ? "Submitting…" : "Submit Reimbursement"}
                </Button>
              </form>
            </div>
          </div>

          {/* ── List of own requests ─────────────────────────────────── */}
          <div className="md:col-span-2 space-y-6">
            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Pending</span>
                <p className="text-lg font-extrabold text-maroon-900 mt-0.5 tabular-nums">{formatCents(totals.pending)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Approved</span>
                <p className="text-lg font-extrabold text-maroon-900 mt-0.5 tabular-nums">{formatCents(totals.approved)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Reimbursed</span>
                <p className="text-lg font-extrabold text-maroon-900 mt-0.5 tabular-nums">{formatCents(totals.reimbursed)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-maroon-100 shadow-sm">
              <div className="flex justify-between items-center p-6 pb-4">
                <h2 className="font-bold text-maroon-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-maroon-600" />
                  Your Requests
                </h2>
                {!loading && expenses.length > 0 && (
                  <Badge className="bg-maroon-800 text-cream-50 border-none py-1 px-2.5 font-semibold">
                    {expenses.length}
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="px-6 pb-6 space-y-3" aria-busy="true" aria-live="polite">
                  <span className="sr-only">Loading your reimbursement requests…</span>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-cream-100/70 border border-maroon-50 animate-pulse motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <PortalEmpty
                  icon={Receipt}
                  title="No reimbursement requests yet"
                  sub="Submit your first request using the form on the left — it'll show up here with a live status."
                />
              ) : (
                <ul className="divide-y divide-maroon-50">
                  {expenses.map((ex) => {
                    const meta = statusMeta(ex.status);
                    const StatusIcon = meta.icon;
                    return (
                      <li key={ex.id} className="p-5 sm:px-6 hover:bg-cream-50/30 transition-colors motion-reduce:transition-none">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-extrabold text-maroon-900 tabular-nums">
                                {formatCents(ex.amountCents)}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                {ex.category}
                              </span>
                            </div>
                            <p className="text-xs text-maroon-700 mt-1.5 leading-relaxed break-words">
                              {ex.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-maroon-400 font-semibold uppercase tracking-wider">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Submitted {formatDate(ex.createdAt)}
                              </span>
                              {ex.receiptUrl && (
                                <a
                                  href={ex.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-maroon-600 hover:text-maroon-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500"
                                >
                                  Receipt
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            {(ex.status === "REIMBURSED" || ex.status === "APPROVED" || ex.status === "DENIED") &&
                              ex.decidedByName && (
                                <p className="text-[10px] text-maroon-500 mt-2 italic">
                                  {meta.label} by {ex.decidedByName}
                                  {ex.decidedAt ? ` · ${formatDate(ex.decidedAt)}` : ""}
                                </p>
                              )}
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badge}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
