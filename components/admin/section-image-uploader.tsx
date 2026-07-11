"use client";

import * as React from "react";
import { UploadCloud, LinkIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Item 2 — per-section image uploader. A drag-and-drop dropzone that POSTs to
// /api/upload-section-image (which sharp-optimizes and stores on Vercel Blob),
// PLUS a URL/link field so an admin can paste an existing image instead. The
// server does the heavy lifting (resize + WebP + strip metadata), so this stays a
// thin, dependency-light client: drop or browse a file, or paste a link. The
// value is always a URL string the section's cfg key stores.

export interface SectionImageUploaderProps {
  /** Current image URL (Blob/Cloudinary/paste). Empty = nothing set. */
  value: string;
  onChange: (url: string) => void;
  /** Section slot hint sent to the server (drives the sharp max dimension). */
  section: string;
  label?: string;
  /** Called with a human-readable message when an upload fails. */
  onError?: (message: string) => void;
}

export function SectionImageUploader({
  value, onChange, section, label = "Image", onError,
}: SectionImageUploaderProps) {
  const inputId = React.useId();
  const [busy, setBusy] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const upload = React.useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onError?.("That file isn't an image.");
        return;
      }
      setBusy(true);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("section", section);
        const res = await fetch("/api/upload-section-image", { method: "POST", body });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "Upload failed");
        onChange(json.url as string);
      } catch (err: any) {
        onError?.(err?.message || "Upload failed. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [section, onChange, onError],
  );

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void upload(f);
    e.target.value = ""; // allow re-selecting the same file
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:underline"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      {/* Dropzone (click or drag). Keyboard: the label wraps the file input. */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={cn(
          "flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
          dragOver ? "border-phisig-red bg-phisig-red-soft/40" : "border-border bg-card hover:border-phisig-red/40",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-phisig-red" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Optimizing &amp; uploading…</span>
          </>
        ) : value ? (
          <span className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${label} preview`} className="max-h-24 w-auto rounded-md object-contain" />
            <span className="text-[11px] text-muted-foreground">Drop a new image or click to replace</span>
          </span>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-phisig-red" aria-hidden="true" />
            <span className="text-xs font-medium">Drag an image here, or click to browse</span>
            <span className="text-[10px] text-muted-foreground">JPG, PNG, WEBP, HEIC · resized &amp; optimized automatically</span>
          </>
        )}
        <input id={inputId} type="file" accept="image/*" onChange={onFile} className="sr-only" disabled={busy} />
      </label>

      {/* URL / link field — paste an existing image instead of uploading. */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 focus-within:border-phisig-red/40">
        <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          spellCheck={false}
          aria-label={`${label} URL`}
          className="min-h-[40px] w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
