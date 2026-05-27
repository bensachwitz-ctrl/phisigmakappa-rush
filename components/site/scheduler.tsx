"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  CalendarDays,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Mail,
  Loader2,
  ExternalLink,
  ChevronRight,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulerProps {
  calDiyUrl?: string;
  chapterShort?: string;
  schoolShort?: string;
  tagline?: string;
}

const EVENT_TYPES = [
  { id: "rush", name: "Rush Coffee Chat", desc: "For PNMs looking to learn more about the chapter in a casual setting." },
  { id: "mentorship", name: "Alumni Mentorship", desc: "For active brothers matching with alumni for career guidance." },
  { id: "office", name: "Officer Office Hours", desc: "Meet with chapter President, Treasurer, or Rush Chairs." },
  { id: "study", name: "Brotherhood Study Session", desc: "Coordinate library study hours or academic check-ins." },
  { id: "other", name: "Other / custom meeting", desc: "Any other scheduling needs with notes." },
];

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:30 PM", "01:30 PM", "02:30 PM", "03:30 PM", "04:30 PM", "05:30 PM"
];

export function Scheduler({ calDiyUrl, chapterShort = "Phi Sig", schoolShort = "USC", tagline = "#DamnProud" }: SchedulerProps) {
  const { push } = useToast();
  const [useEmbed, setUseEmbed] = React.useState(!!calDiyUrl);
  const [selectedType, setSelectedType] = React.useState(EVENT_TYPES[0].name);
  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedTime, setSelectedTime] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [location, setLocation] = React.useState("Chapter House / Online");
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [bookedEvent, setBookedEvent] = React.useState<any>(null);

  // Generate 7 days starting from tomorrow for the date selector
  const dates = React.useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        iso: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        fullString: d.toLocaleDateString("en-US", { dateStyle: "medium" }),
      });
    }
    return arr;
  }, []);

  // Format clean iframe URL if username is supplied instead of full URL
  const embedUrl = React.useMemo(() => {
    if (!calDiyUrl) return "";
    if (calDiyUrl.startsWith("http://") || calDiyUrl.startsWith("https://")) {
      return calDiyUrl;
    }
    // Fallback to Cal.com structure
    return `https://cal.com/${calDiyUrl}`;
  }, [calDiyUrl]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !selectedDate || !selectedTime) {
      push({ title: "Please fill out all required fields", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      // Parse selected time string (e.g. "09:00 AM") to set hours/minutes on date
      const [time, modifier] = selectedTime.split(" ");
      let [hoursStr, minutesStr] = time.split(":");
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (modifier === "PM" && hours < 12) {
        hours += 12;
      }
      if (modifier === "AM" && hours === 12) {
        hours = 0;
      }

      const dateObj = new Date(selectedDate);
      dateObj.setHours(hours, minutes, 0, 0);

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          eventType: selectedType,
          date: dateObj.toISOString(),
          notes,
          location,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Booking failed");

      setBookedEvent(json.event);
      setSuccess(true);
      push({ title: "Meeting Scheduled!", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Failed to schedule meeting", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (success && bookedEvent) {
    return (
      <Card className="max-w-xl mx-auto border-emerald-500/20 bg-gradient-to-br from-emerald-50/30 to-white shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">Meeting Confirmed!</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Your appointment has been added to our calendar. A confirmation email has been sent to <span className="font-semibold">{email}</span>.
          </p>

          <div className="mt-6 border border-emerald-100 rounded-xl bg-white p-5 text-left space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Event</p>
                <p className="text-sm font-semibold text-emerald-950">{selectedType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Date &amp; Time</p>
                <p className="text-sm font-semibold text-emerald-950">
                  {new Date(bookedEvent.startsAt).toLocaleDateString("en-US", { dateStyle: "full" })} at{" "}
                  {new Date(bookedEvent.startsAt).toLocaleTimeString("en-US", { timeStyle: "short" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Location</p>
                <p className="text-sm font-semibold text-emerald-950">{location}</p>
              </div>
            </div>
            {notes && (
              <div className="flex items-start gap-3 border-t border-emerald-50 pt-2.5">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Notes</p>
                  <p className="text-xs text-emerald-800 italic mt-0.5">{notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <Button
              onClick={() => {
                setSuccess(false);
                setName("");
                setEmail("");
                setNotes("");
                setSelectedDate("");
                setSelectedTime("");
              }}
              variant="outline"
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              Book another meeting
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href="/">Return to Home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Embed Toggle if calDiyUrl is configured */}
      {calDiyUrl && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-maroon-100 bg-white p-1 shadow-sm">
            <button
              onClick={() => setUseEmbed(false)}
              className={cn(
                "rounded-md px-4 py-2 text-xs font-semibold transition-all",
                !useEmbed ? "bg-maroon-800 text-cream-50 shadow" : "text-maroon-700 hover:text-maroon-900"
              )}
            >
              Built-in Scheduler
            </button>
            <button
              onClick={() => setUseEmbed(true)}
              className={cn(
                "rounded-md px-4 py-2 text-xs font-semibold transition-all",
                useEmbed ? "bg-maroon-800 text-cream-50 shadow" : "text-maroon-700 hover:text-maroon-900"
              )}
            >
              Cal.diy Scheduler
            </button>
          </div>
        </div>
      )}

      {useEmbed && calDiyUrl ? (
        <Card className="border-maroon-100 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-maroon-800 px-6 py-4 flex items-center justify-between text-cream-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cream-300" />
                <span className="font-bold text-sm">Cal.diy Booking Portal</span>
              </div>
              <a
                href={embedUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cream-200 hover:text-cream-50 transition"
              >
                Open in new tab <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {/* Cal.diy iframe */}
            <div className="relative w-full h-[650px] bg-zinc-50">
              <iframe
                src={embedUrl}
                title="Cal.diy Scheduling Portal"
                className="w-full h-full border-0"
                allow="camera; microphone; geolocation; clipboard-write"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left panel: Event Type Selection */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon-800 px-1">1. Choose Meeting</h2>
            <div className="space-y-2.5">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.name}
                  type="button"
                  onClick={() => setSelectedType(type.name)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all text-xs flex flex-col gap-1 shadow-sm",
                    selectedType === type.name
                      ? "bg-maroon-800 text-cream-50 border-transparent scale-[1.01]"
                      : "bg-white text-maroon-900 border-maroon-100/60 hover:border-maroon-200"
                  )}
                >
                  <span className="font-bold text-sm">{type.name}</span>
                  <span className={cn("text-xs leading-relaxed", selectedType === type.name ? "text-cream-200/90" : "text-muted-foreground")}>
                    {type.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Date & Details Form */}
          <Card className="border-maroon-100 bg-white shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Date selection grid */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon-800 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-maroon-600" />
                  2. Select Date
                </h2>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {dates.map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.iso);
                        setSelectedTime(""); // Reset time on date change
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
                        selectedDate === d.iso
                          ? "bg-maroon-700 text-cream-50 border-transparent font-semibold"
                          : "bg-cream-50 text-maroon-900 border-maroon-100/40 hover:border-maroon-200"
                      )}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider">{d.dayName}</span>
                      <span className="text-xl font-extrabold my-0.5">{d.dayNum}</span>
                      <span className="text-[10px] uppercase opacity-75">{d.month}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time selection grid */}
              {selectedDate && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-maroon-600" />
                    3. Select Time
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "py-2.5 rounded-lg border text-xs font-semibold transition-all",
                          selectedTime === t
                            ? "bg-maroon-700 text-cream-50 border-transparent"
                            : "bg-white text-maroon-800 border-maroon-100/60 hover:border-maroon-200"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact and details form */}
              {selectedDate && selectedTime && (
                <div className="space-y-4 pt-4 border-t border-maroon-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-maroon-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-maroon-600" />
                    4. Your Details
                  </h2>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sched-name" className="text-xs font-bold text-maroon-900">Your Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="sched-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Smith"
                          className="pl-9 border-maroon-100 focus-visible:ring-maroon-700"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sched-email" className="text-xs font-bold text-maroon-900">Your Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="sched-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex.smith@example.com"
                          className="pl-9 border-maroon-100 focus-visible:ring-maroon-700"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sched-location" className="text-xs font-bold text-maroon-900">Meeting Location (e.g. Online, Chapter House, Coffee Shop)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="sched-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Chapter House — 1525 College St"
                        className="pl-9 border-maroon-100 focus-visible:ring-maroon-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sched-notes" className="text-xs font-bold text-maroon-900">Meeting Notes / Agenda (optional)</Label>
                    <Textarea
                      id="sched-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Let us know what you want to discuss, or list any questions you have."
                      className="border-maroon-100 focus-visible:ring-maroon-700"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold px-6 py-5 rounded-xl shadow-lg shadow-maroon-800/10"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Confirming booking...
                        </>
                      ) : (
                        <>
                          Confirm Booking
                          <ChevronRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
