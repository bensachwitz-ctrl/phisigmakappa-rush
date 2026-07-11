import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * List / ListItem — a cohesive row-list in the GreekStack design language for
 * the many "card of divided rows" surfaces (roster rows, ledger lines, settings
 * rows, announcement feeds). Standardizes the radius (matches Card's rounded-2xl),
 * border + divider tokens, row padding, and the leading/title/description/
 * trailing slot layout so these lists stop being re-invented per screen.
 *
 * <List>
 *   <ListItem leading={<IconMembers />} title="Alex Mercer" description="Senior" trailing={<Badge>Active</Badge>} />
 *   <ListItem asChild interactive><Link href="/x">…</Link></ListItem>
 * </List>
 */

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Wrap the list in a bordered, rounded card surface (default true). */
  bordered?: boolean;
}

export const List = React.forwardRef<HTMLUListElement, ListProps>(function List(
  { className, bordered = true, ...props },
  ref
) {
  return (
    <ul
      ref={ref}
      className={cn(
        "divide-y divide-border",
        bordered && "overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
      {...props}
    />
  );
});

export interface ListItemProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "title"> {
  /** Leading slot — an icon chip or avatar. */
  leading?: React.ReactNode;
  /** Primary line. */
  title?: React.ReactNode;
  /** Secondary muted line under the title. */
  description?: React.ReactNode;
  /** Trailing slot — a badge, chevron, count, or action. */
  trailing?: React.ReactNode;
  /** Brand hover wash + pointer affordance (for rows that navigate/select). */
  interactive?: boolean;
  /** Render the row content into a child element (e.g. a next/link <a>). */
  asChild?: boolean;
}

export const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { className, leading, title, description, trailing, interactive, asChild, children, ...props },
  ref
) {
  const Inner = asChild ? Slot : "div";
  const body = children ?? (
    <>
      {leading != null && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        {title != null && (
          <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        )}
        {description != null && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
        )}
      </span>
      {trailing != null && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
    </>
  );

  return (
    <li ref={ref} className={cn("list-none", className)} {...props}>
      <Inner
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          interactive &&
            "cursor-pointer transition-colors hover:bg-[hsl(var(--primary)/0.06)] focus-visible:bg-[hsl(var(--primary)/0.08)] focus-visible:outline-none"
        )}
      >
        {body}
      </Inner>
    </li>
  );
});
