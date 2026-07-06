"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Upload, Trash2, Loader2, FileText, Download, FolderOpen,
  UploadCloud, File as FileIcon, BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentRow = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  blobUrl: string | null;
  category: string;
  visibility: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

// Mirror the enums enforced by /api/admin/library (route Schema).
const CATEGORIES = [
  "BYLAWS", "POLICIES", "RITUAL", "FORMS", "TRAINING",
  "CALENDAR", "DUES", "GENERAL", "OTHER",
] as const;

const VISIBILITIES = ["PUBLIC", "MEMBERS", "INITIATES", "OFFICERS"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  BYLAWS: "Bylaws",
  POLICIES: "Policies",
  RITUAL: "Ritual",
  FORMS: "Forms",
  TRAINING: "Training",
  CALENDAR: "Calendar",
  DUES: "Dues",
  GENERAL: "General",
  OTHER: "Other",
};

const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: "Public",
  MEMBERS: "All Members",
  INITIATES: "Initiates Only",
  OFFICERS: "Officers Only",
};

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryClient({
  initialDocuments,
  canWrite,
}: {
  initialDocuments: DocumentRow[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [docs, setDocs] = React.useState<DocumentRow[]>(initialDocuments);
  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false); // file → blob
  const [saving, setSaving] = React.useState(false); // metadata → db
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    category: "GENERAL" as (typeof CATEGORIES)[number],
    visibility: "MEMBERS" as (typeof VISIBILITIES)[number],
    url: "",
    fileName: "",
    fileSize: undefined as number | undefined,
    mimeType: "",
  });

  // Delete confirm state
  const [deleting, setDeleting] = React.useState<DocumentRow | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  function resetForm() {
    setForm({
      name: "",
      description: "",
      category: "GENERAL",
      visibility: "MEMBERS",
      url: "",
      fileName: "",
      fileSize: undefined,
      mimeType: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openUpload() {
    resetForm();
    setUploadOpen(true);
  }

  // Step 1: upload the chosen file to blob storage, capture the returned URL.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/library/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      setForm((f) => ({
        ...f,
        url: json.url,
        fileName: json.fileName || file.name,
        fileSize: typeof json.fileSize === "number" ? json.fileSize : file.size,
        mimeType: json.mimeType || file.type || "",
        // Pre-fill the document name from the file name if empty.
        name: f.name || (json.fileName || file.name).replace(/\.[^.]+$/, ""),
      }));
      push({ title: "File uploaded - add details below", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  // Step 2: persist the document metadata row.
  async function saveDocument() {
    if (!form.url) {
      push({ title: "Choose a file to upload first", variant: "destructive" });
      return;
    }
    if (form.name.trim().length < 2) {
      push({ title: "Document name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || "",
          url: form.url,
          category: form.category,
          visibility: form.visibility,
          fileName: form.fileName || "",
          fileSize: form.fileSize,
          mimeType: form.mimeType || "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save document");
      const created: DocumentRow = {
        ...json.document,
        fileSize: json.document.fileSize ?? json.document.size ?? form.fileSize ?? null,
        createdAt: new Date(json.document.createdAt).toISOString(),
        uploadedBy: null,
      };
      setDocs((xs) => [created, ...xs]);
      push({ title: "Document added to library", variant: "success" });
      setUploadOpen(false);
      resetForm();
    } catch (err: any) {
      push({ title: err.message || "Could not save document", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function openDelete(doc: DocumentRow) {
    if (!canWrite) return;
    setDeleting(doc);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const target = deleting;
    try {
      const res = await fetch("/api/admin/library", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      setDocs((xs) => xs.filter((x) => x.id !== target.id));
      push({ title: "Document deleted", variant: "success" });
      setDeleting(null);
    } catch (err: any) {
      push({ title: err.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return docs.filter((d) => {
      const matchesQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q) ||
        (d.fileName || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "ALL" || d.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [docs, query, categoryFilter]);

  const stats = React.useMemo(() => {
    const totalBytes = docs.reduce((s, d) => s + (d.fileSize || 0), 0);
    const categories = new Set(docs.map((d) => d.category)).size;
    return { total: docs.length, totalBytes, categories };
  }, [docs]);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <IconChip icon={BookMarked} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Document Library</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload and organize chapter documents - bylaws, policies, forms, and training materials.
            </p>
          </div>
        </div>
        {canWrite ? (
          <Button onClick={openUpload}>
            <Upload className="h-4 w-4 mr-1.5" /> Upload Document
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <FileText className="h-3.5 w-3.5 text-phisig-red" /> Documents
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.total}</div>
        </div>
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <FolderOpen className="h-3.5 w-3.5 text-phisig-red" /> Categories
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.categories}</div>
        </div>
        <div className="lift rounded-xl border p-3 bg-card">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <BookMarked className="h-3.5 w-3.5 text-phisig-red" /> Total Size
          </div>
          <div className="text-2xl font-bold mt-0.5">{formatBytes(stats.totalBytes)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12 border-dashed bg-gradient-to-b from-muted/30 to-transparent">
          <CardContent className="space-y-4">
            <div className="relative mx-auto w-fit">
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl" />
              <IconChip icon={FolderOpen} tone="brand" size="lg" className="mx-auto" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">
                {docs.length === 0 ? "No Documents Yet" : "No Matching Documents"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {docs.length === 0
                  ? "Upload your chapter's bylaws, policies, and forms to keep them in one place."
                  : "Try a different search term or category filter."}
              </p>
            </div>
            {docs.length === 0 && canWrite && (
              <Button onClick={openUpload} className="mt-1">
                <Upload className="h-4 w-4 mr-1.5" /> Upload Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="border border-border/80">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-phisig-red/10 text-phisig-red flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold leading-tight truncate">{d.name}</h3>
                      <Badge className="border border-border text-muted-foreground bg-transparent">
                        {CATEGORY_LABELS[d.category] || d.category}
                      </Badge>
                      <Badge className="bg-secondary text-secondary-foreground">
                        {VISIBILITY_LABELS[d.visibility] || d.visibility}
                      </Badge>
                    </div>
                    {d.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                        <FileIcon className="h-3 w-3 shrink-0" /> {d.fileName || "document"}
                      </span>
                      <span>{formatBytes(d.fileSize)}</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      {d.uploadedBy && <span>by {d.uploadedBy.name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a href={d.blobUrl || d.url} target="_blank" rel="noreferrer noopener">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1.5" /> Open
                    </Button>
                  </a>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => openDelete(d)}
                      aria-label={`Delete ${d.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading && !saving) setUploadOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File picker */}
            <div className="space-y-1.5">
              <Label>File *</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed border-border p-6 text-center transition hover:border-phisig-red/40 hover:bg-secondary/30",
                  form.url && "border-emerald-300 bg-emerald-50/40"
                )}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Uploading…</span>
                  </div>
                ) : form.url ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileText className="h-6 w-6 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800 truncate max-w-full">{form.fileName}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(form.fileSize ?? null)} · Click to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <UploadCloud className="h-7 w-7" />
                    <span className="text-sm font-medium text-foreground">Click to choose a file</span>
                    <span className="text-xs">PDF, Word, Excel, PowerPoint, images · max 25 MB</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docName">Document Name *</Label>
              <Input
                id="docName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Chapter Bylaws 2025"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docDesc">Description</Label>
              <Textarea
                id="docDesc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short summary of what this document covers."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="docCategory">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as (typeof CATEGORIES)[number] })}>
                  <SelectTrigger id="docCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="docVisibility">Visibility</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as (typeof VISIBILITIES)[number] })}>
                  <SelectTrigger id="docVisibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITIES.map((v) => (
                      <SelectItem key={v} value={v}>{VISIBILITY_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading || saving}>Cancel</Button>
            <Button onClick={saveDocument} disabled={uploading || saving || !form.url}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => { if (!deleteBusy && !o) setDeleting(null); }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          {deleting && (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">{deleting.name}</span>?
                This removes it from the library and cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleteBusy} className="bg-red-600 text-white hover:bg-red-700">
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
