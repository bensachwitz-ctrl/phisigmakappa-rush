"use client";

import { Button } from "@/components/ui/button";
import { IconPlus as Plus } from "@/components/brand/icons";

/**
 * Page-header "+ Add event" CTA. Lives ABOVE the brother calendar so admins
 * can drop a new event in two taps without scrolling. Dispatches a custom
 * DOM event that the EventsManager component listens for to pop the create
 * dialog — one prop-free coupling so this button can move anywhere on the
 * page without restructuring component tree.
 *
 * Also smooth-scrolls down to the manage-events section so when the dialog
 * closes the admin lands on the new event in the list (not back at the top).
 */
export function AddEventButton() {
  function handleClick() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("greekstack:open-add-event"));
    // Smooth-scroll to the manage section so the admin sees the new event
    // appear in the list once they save.
    const el = document.getElementById("manage-events");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  return (
    <Button
      onClick={handleClick}
      size="default"
      className="press cta-shine shadow-lg shadow-brand-red/20"
      aria-label="Add a new chapter event"
    >
      <Plus className="h-4 w-4" /> Add event
    </Button>
  );
}
