"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

const ToastContext = React.createContext<{
  push: (t: Omit<Toast, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  // Split into two live regions so destructive toasts interrupt screen-reader
  // output (aria-live="assertive") while informational ones queue politely.
  // aria-atomic="true" makes the entire toast read on update rather than just
  // the diff — critical because each toast is a brand-new DOM node.
  const politeToasts = toasts.filter((t) => t.variant !== "destructive");
  const assertiveToasts = toasts.filter((t) => t.variant === "destructive");

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 px-4"
      >
        <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
          {politeToasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto rounded-xl border bg-card px-4 py-3 shadow-lg animate-fade-in",
                t.variant === "success" && "border-emerald-200 bg-emerald-50"
              )}
            >
              <p className={cn(
                "text-sm font-semibold",
                t.variant === "success" && "text-emerald-900"
              )}>{t.title}</p>
              {t.description && (
                <p className={cn(
                  "mt-0.5 text-xs",
                  t.variant === "success" ? "text-emerald-800" : "text-muted-foreground"
                )}>{t.description}</p>
              )}
            </div>
          ))}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="flex flex-col gap-2">
          {assertiveToasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl border border-red-300 bg-red-50 px-4 py-3 shadow-lg animate-fade-in"
            >
              <p className="text-sm font-semibold text-red-900">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-red-800">{t.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
