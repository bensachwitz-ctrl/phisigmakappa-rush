"use client";

// components/ui/rich-text-editor.tsx — headless Tiptap (ProseMirror) rich-text
// editor, styled in the GreekStack design language.
//
// Emits SANITIZED HTML: every update runs the editor's HTML through
// sanitizeRichText() (lib/rich-text.ts) before it reaches the parent, so a
// consumer never holds unsanitized markup and the stored/rendered value is always
// safe. StarterKit's schema already constrains the node set; the sanitizer is
// defense-in-depth + the single source of truth for what tags survive.
//
// Wire this in anywhere a plain <Textarea> collected long-form copy
// (announcements, event descriptions, profile bios). Render the stored value with
// <RichTextContent /> (same file) — never dangerouslySetInnerHTML by hand.

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold, Italic, Heading2, List, ListOrdered, Quote, Link2, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/rich-text";

export interface RichTextEditorProps {
  /** Current HTML value (controlled-ish — set on mount + synced on external reset). */
  value: string;
  /** Called with SANITIZED HTML on every edit. */
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  ariaLabel?: string;
  id?: string;
}

function ToolbarButton({
  onClick, active, disabled, label, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed",
        "hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Re-render the toolbar on selection/transaction so active states track the cursor.
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const update = () => force();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const setLink = React.useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave blank to remove)", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-1.5 py-1"
    >
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-input" aria-hidden />
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-input" aria-hidden />
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" aria-hidden />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value, onChange, placeholder, className, editable = true, ariaLabel, id,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Next.js SSR: don't render on the server pass to avoid a hydration mismatch.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "gs-richtext min-h-[120px] px-3 py-2 focus:outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(sanitizeRichText(editor.getHTML())),
  });

  // Sync external value changes (e.g. a form reset / switching the edited record)
  // WITHOUT clobbering the user's in-progress typing.
  React.useEffect(() => {
    if (!editor) return;
    const current = sanitizeRichText(editor.getHTML());
    if (value !== current) editor.commands.setContent(value || "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  React.useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background text-base md:text-sm",
        "ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        className,
      )}
    >
      {editor && editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Safe renderer for stored rich text. ALWAYS sanitizes before injecting, so a
 * legacy/hostile stored value can't XSS. Use this instead of a bare
 * dangerouslySetInnerHTML anywhere a rich body is displayed.
 */
export function RichTextContent({
  html, className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const clean = React.useMemo(() => sanitizeRichText(html), [html]);
  return <div className={cn("gs-richtext", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
