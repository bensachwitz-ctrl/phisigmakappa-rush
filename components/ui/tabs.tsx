"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tabs — an accessible, dependency-free tab set in the GreekStack design
 * language, consolidating the ~9 ad-hoc `role="tab"` / `useState(tab)` switchers
 * scattered across the app (directory manager, dashboards, org picker, …) into
 * one cohesive, WAI-ARIA-correct primitive.
 *
 * Behavior: controlled (`value` + `onValueChange`) or uncontrolled
 * (`defaultValue`). The tablist is keyboard-navigable per the WAI-ARIA APG —
 * Left/Right (Home/End) move a roving tabindex between triggers; only the active
 * trigger is in the tab order.
 *
 * Design: two looks share the brand language.
 *   • `segmented` (default) — a pill group on a `bg-secondary` track; the active
 *     tab lifts onto a `bg-card` chip with a soft shadow and the chapter
 *     `--primary` text, so it re-brands per tenant with no hardcoded color.
 *   • `underline` — a quiet baseline row; the active tab carries a 2px
 *     `--primary` underline.
 */

type TabsVariant = "segmented" | "underline";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  variant: TabsVariant;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>`);
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled active tab value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}

export function Tabs({
  value: valueProp,
  defaultValue,
  onValueChange,
  variant = "segmented",
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const value = isControlled ? (valueProp as string) : internal;
  const baseId = React.useId();

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  const ctx = React.useMemo<TabsContextValue>(
    () => ({ value, setValue, variant, baseId }),
    [value, setValue, variant, baseId]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

const listVariants = cva("relative flex items-center", {
  variants: {
    variant: {
      segmented: "gap-1 rounded-xl border border-border bg-secondary/50 p-1",
      underline: "gap-4 border-b border-border",
    },
  },
  defaultVariants: { variant: "segmented" },
});

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listVariants> {}

export function TabsList({ className, children, ...props }: TabsListProps) {
  const { variant } = useTabs("TabsList");
  const ref = React.useRef<HTMLDivElement>(null);

  // Roving keyboard nav across enabled triggers (WAI-ARIA APG).
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? []
    );
    if (tabs.length === 0) return;
    const current = tabs.findIndex((t) => t === document.activeElement);
    e.preventDefault();
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    tabs[next]?.focus();
    tabs[next]?.click();
  };

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(listVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

const triggerVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        segmented:
          "flex-1 rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground data-[active=true]:bg-card data-[active=true]:text-[hsl(var(--primary))] data-[active=true]:shadow-sm",
        underline:
          "-mb-px border-b-2 border-transparent px-1 pb-2.5 text-muted-foreground hover:text-foreground data-[active=true]:border-[hsl(var(--primary))] data-[active=true]:text-foreground",
      },
    },
    defaultVariants: { variant: "segmented" },
  }
);

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = useTabs("TabsTrigger");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      data-active={active}
      onClick={() => ctx.setValue(value)}
      className={cn(triggerVariants({ variant: ctx.variant }), className)}
      {...props}
    />
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useTabs("TabsContent");
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
