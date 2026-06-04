"use client";

import { useState } from "react";
import {
  GraduationCap,
  Search,
  Trash2,
  UserPlus,
  Upload,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle,
  XCircle,
  Plus,
  Send,
  Copy,
  Link2,
  X,
  Loader2
} from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AddMembersWizard } from "@/components/admin/add-members-wizard";

interface Alumnus {
  id: string;
  fullName: string;
  preferredName: string | null;
  graduationYear: number;
  pledgeClass: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  employer: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  bio: string | null;
}

interface AlumniManagerProps {
  initialAlumni: Alumnus[];
}

export function AlumniManager({ initialAlumni }: AlumniManagerProps) {
  const { push } = useToast();
  const [alumniList, setAlumniList] = useState<Alumnus[]>(initialAlumni);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Confirm dialog (replaces window.confirm) for deleting an alumnus.
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Add form state
  const [formData, setFormData] = useState({
    fullName: "",
    preferredName: "",
    graduationYear: new Date().getFullYear().toString(),
    pledgeClass: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    employer: "",
    jobTitle: "",
    linkedinUrl: "",
    bio: "",
  });

  // CSV states
  const [csvText, setCsvText] = useState("");

  // R45 — portal-invite state. `inviteFor` is the alumnus we're inviting;
  // `inviteResult` holds the generated link + delivery outcome to display.
  const [inviteFor, setInviteFor] = useState<Alumnus | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteResult, setInviteResult] = useState<{ link: string; delivery: { channel: string; sent: boolean; reason: string } } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateInvite(alumnus: Alumnus, channel: "link" | "email" | "sms") {
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch("/api/admin/alumni-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumniId: alumnus.id, channel }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setInviteError(data.error || "Could not generate the invite.");
        return;
      }
      setInviteResult({ link: data.link, delivery: data.delivery });
    } catch {
      setInviteError("A connection error occurred. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  function openInvite(alumnus: Alumnus) {
    setInviteFor(alumnus);
    setInviteResult(null);
    setInviteError("");
    setCopied(false);
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setInviteError("Couldn't copy — select and copy the link manually.");
    }
  }

  // Search filter
  const filtered = alumniList.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.fullName.toLowerCase().includes(q) ||
      (a.employer && a.employer.toLowerCase().includes(q)) ||
      (a.city && a.city.toLowerCase().includes(q)) ||
      (a.state && a.state.toLowerCase().includes(q)) ||
      a.graduationYear.toString().includes(q)
    );
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          graduationYear: parseInt(formData.graduationYear, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add alumnus.");
      } else {
        setAlumniList((prev) => [data.alumni, ...prev]);
        setShowAddModal(false);
        // Reset form
        setFormData({
          fullName: "",
          preferredName: "",
          graduationYear: new Date().getFullYear().toString(),
          pledgeClass: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          employer: "",
          jobTitle: "",
          linkedinUrl: "",
          bio: "",
        });
      }
    } catch (err) {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAlumniList((prev) => prev.filter((a) => a.id !== id));
        push({ title: "Alumnus removed", variant: "success" });
        setDeleteTarget(null);
      } else {
        push({ title: "Failed to delete alumnus.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      push({ title: "Failed to delete alumnus.", variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simple CSV parser
    const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setError("CSV must contain a header row and at least one data row.");
      setLoading(false);
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const rows = lines.slice(1).map(row => 
      row.split(",").map(cell => cell.trim().replace(/^["']|["']$/g, ""))
    );

    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: { headers, rows } }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import CSV.");
      } else {
        push({
          title: `Imported ${data.imported} alumni`,
          description: data.failed ? `${data.failed} failed` : undefined,
          variant: "success",
        });
        // Refresh the page data
        window.location.reload();
      }
    } catch (err) {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // After the Add-Members wizard creates alumni rows, re-pull the directory so
  // the new rows render fully (the wizard only returns id+name).
  async function refreshAfterWizard() {
    try {
      const res = await fetch("/api/admin/alumni");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.alumni)) {
        setAlumniList(json.alumni);
      }
    } catch {
      // Wizard already toasted success; a refresh miss just needs a reload.
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search alumni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setWizardOpen(true)}
            className="flex-1 sm:flex-none bg-maroon-800 hover:bg-maroon-900 text-cream-50 flex items-center justify-center gap-1.5 rounded-xl font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Add Members
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="flex-1 sm:flex-none border-maroon-200 text-maroon-900 hover:bg-cream-50 flex items-center justify-center gap-1.5 rounded-xl font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            Add Alumnus
          </Button>
          <Button
            onClick={() => setShowCsvModal(true)}
            variant="outline"
            className="flex-1 sm:flex-none border-maroon-200 text-maroon-900 hover:bg-cream-50 flex items-center justify-center gap-1.5 rounded-xl font-semibold"
          >
            <Upload className="w-4 h-4" />
            CSV Import
          </Button>
        </div>
      </div>

      <AddMembersWizard
        type="alumni"
        lockType
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onAdded={() => { void refreshAfterWizard(); }}
        memberTermSingular="alumnus"
        memberTermPlural="alumni"
      />

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-maroon-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-cream-50/50 border-b border-maroon-100 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Grad Year</th>
                <th className="px-6 py-4">Professional</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-maroon-50 text-maroon-950">
              {filtered.length > 0 ? (
                filtered.map((alumni) => (
                  <tr key={alumni.id} className="hover:bg-cream-50/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-maroon-900">{alumni.fullName}</div>
                      {alumni.pledgeClass && (
                        <div className="text-xs text-muted-foreground">{alumni.pledgeClass}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-amber-800">{alumni.graduationYear}</span>
                    </td>
                    <td className="px-6 py-4">
                      {alumni.employer ? (
                        <div>
                          <div className="font-semibold text-xs text-maroon-900">{alumni.jobTitle || "Employed"}</div>
                          <div className="text-xs text-muted-foreground">{alumni.employer}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      {alumni.email && (
                        <a href={`mailto:${alumni.email}`} className="text-xs hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {alumni.email}
                        </a>
                      )}
                      {alumni.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {alumni.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {alumni.city ? (
                        <span className="text-xs text-maroon-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {alumni.city}, {alumni.state || ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openInvite(alumni)}
                          className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-lg transition"
                          title="Send portal invite link"
                          aria-label={`Send portal invite to ${alumni.fullName}`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(alumni.id, alumni.fullName)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                          title="Delete Alumnus"
                          aria-label={`Delete ${alumni.fullName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No alumni profiles found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* R45 — PORTAL INVITE MODAL */}
      {inviteFor && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setInviteFor(null); }}>
          <div className="bg-white rounded-2xl border border-maroon-100 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-1.5">
                  <Send className="w-5 h-5 text-amber-500" />
                  Invite to alumni portal
                </h3>
                <p className="text-xs text-muted-foreground">{inviteFor.fullName} · Class of {inviteFor.graduationYear}</p>
              </div>
              <button onClick={() => setInviteFor(null)} className="p-1.5 hover:bg-cream-100 rounded-lg text-maroon-600" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">{inviteError}</div>
            )}

            {!inviteResult ? (
              <>
                <p className="text-xs text-maroon-600">
                  Generates a secure single-use link (expires in 30 days) that lets {inviteFor.preferredName || inviteFor.fullName.split(" ")[0]} set a password and create their portal account. Their existing details are pre-filled.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => generateInvite(inviteFor, "email")}
                    disabled={inviteLoading || !inviteFor.email}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-cream-50 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
                    title={inviteFor.email ? `Email ${inviteFor.email}` : "No email on file"}
                  >
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send by email {inviteFor.email ? `→ ${inviteFor.email}` : "(no email on file)"}
                  </button>
                  <button
                    onClick={() => generateInvite(inviteFor, "sms")}
                    disabled={inviteLoading || !inviteFor.phone}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-cream-50 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
                    title={inviteFor.phone ? `Text ${inviteFor.phone}` : "No phone on file"}
                  >
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    Send by text {inviteFor.phone ? `→ ${inviteFor.phone}` : "(no phone on file)"}
                  </button>
                  <button
                    onClick={() => generateInvite(inviteFor, "link")}
                    disabled={inviteLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-maroon-900 border border-maroon-200 text-sm font-semibold disabled:opacity-40 transition min-h-[44px]"
                  >
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Just generate a copy-paste link
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  inviteResult.delivery.sent ? "bg-green-50 border border-green-200 text-green-800"
                  : inviteResult.delivery.channel === "link" ? "bg-cream-50 border border-maroon-100 text-maroon-700"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
                }`}>
                  {inviteResult.delivery.sent ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Link2 className="w-4 h-4 shrink-0" />}
                  {inviteResult.delivery.sent
                    ? `Sent via ${inviteResult.delivery.channel}. Share the link below as a backup.`
                    : inviteResult.delivery.channel === "link"
                      ? "Link ready — copy it and send however you like."
                      : `Couldn't auto-send (${inviteResult.delivery.reason}). Copy the link below and send it manually.`}
                </div>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteResult.link} onFocus={(e) => e.target.select()}
                    className="flex-1 px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl text-xs text-maroon-900 truncate" />
                  <button onClick={() => copyLink(inviteResult.link)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-cream-50 text-xs font-semibold transition shrink-0 min-h-[40px]">
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button onClick={() => setInviteFor(null)}
                  className="w-full py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-maroon-900 border border-maroon-200 text-sm font-semibold transition">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADD ALUMNUS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSubmit} className="bg-white rounded-2xl border border-maroon-100 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Add Alumnus Profile
              </h3>
              <p className="text-xs text-muted-foreground">Create a new alumnus directory record manually.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Graduation Year *</label>
                <input
                  type="number"
                  required
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  placeholder="2020"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Pledge Class</label>
                <input
                  type="text"
                  value={formData.pledgeClass}
                  onChange={(e) => setFormData({ ...formData, pledgeClass: e.target.value })}
                  placeholder="Fall 2016"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Preferred Name</label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  placeholder="Johnny"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="555-0199"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Columbia"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SC"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Employer / Company</label>
                <input
                  type="text"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Google"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="Software Engineer"
                  className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-maroon-900 mb-1">Bio / Note</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief bio notes..."
                rows={2}
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={loading}
                variant="outline"
                className="w-1/2 border-maroon-200 text-maroon-900 rounded-xl py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 rounded-xl py-2"
              >
                {loading ? "Adding..." : "Add Profile"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCsvImport} className="bg-white rounded-2xl border border-maroon-100 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-1.5">
                <Upload className="w-5 h-5 text-amber-500" />
                CSV Bulk Import
              </h3>
              <p className="text-xs text-muted-foreground">Import multiple alumni profiles in one go.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">{error}</div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-maroon-900">Paste CSV Contents</label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Required columns: <code>fullName</code>, <code>graduationYear</code>. 
                Optional: <code>preferredName</code>, <code>pledgeClass</code>, <code>email</code>, <code>phone</code>, <code>city</code>, <code>state</code>, <code>employer</code>, <code>jobTitle</code>, <code>linkedinUrl</code>, <code>bio</code>.
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`fullName,graduationYear,pledgeClass,email,city,state\nJohn Doe,2018,Fall 2014,john@doe.com,Atlanta,GA\nJane Smith,2015,Spring 2012,jane@smith.com,New York,NY`}
                rows={8}
                required
                className="w-full px-3 py-1.5 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setShowCsvModal(false)}
                disabled={loading}
                variant="outline"
                className="w-1/2 border-maroon-200 text-maroon-900 rounded-xl py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 rounded-xl py-2"
              >
                {loading ? "Importing..." : "Run Import"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !deleteBusy && !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove alumnus?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to remove ${deleteTarget.name} from the alumni database? This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={doDelete}
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
