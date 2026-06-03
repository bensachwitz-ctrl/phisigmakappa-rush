"use client";

import * as React from "react";
import { EventCalendar } from "@/components/brother/event-calendar";
import { EventCalendarGrid } from "@/components/brother/event-calendar-grid";
import { EventDetailsModal } from "@/components/brother/event-details-modal";

/**
 * Client wrapper that hosts a single EventDetailsModal at the page level and
 * passes a shared `onEventClick` handler to both the live calendar grid and
 * the card list. Either surface — clicking a day-panel row in the grid OR
 * the card title in the list — opens the modal with the full RSVP breakdown
 * (Going / Maybe / Not going / No response). One modal instance keeps the
 * z-index + focus management simple.
 */
export function BrotherEventsSection() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleEventClick = React.useCallback((eventId: string) => {
    setOpenId(eventId);
  }, []);

  const handleClose = React.useCallback(() => setOpenId(null), []);

  // When the brother RSVPs from the modal, bump a key on the consumers so
  // they re-fetch their data. Cheap re-render — both components have their
  // own data caching anyway.
  const handleRsvpChange = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <div className="mb-6">
        <EventCalendarGrid key={`grid-${refreshKey}`} onEventClick={handleEventClick} />
      </div>
      <EventCalendar key={`list-${refreshKey}`} onEventClick={handleEventClick} />
      <EventDetailsModal
        eventId={openId}
        open={openId !== null}
        onClose={handleClose}
        onRsvpChange={handleRsvpChange}
      />
    </>
  );
}
