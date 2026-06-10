import React from "react";
import { Calendar, Check, X } from "lucide-react";
import type { DemoContext } from "../context";

export function renderBookingModal(ctx: DemoContext) {
  const {
    bookingDate,
    bookingEmail,
    bookingName,
    bookingSubmitted,
    bookingTime,
    email,
    setBookingDate,
    setBookingEmail,
    setBookingName,
    setBookingSubmitted,
    setBookingTime,
    setShowBookingModal,
  } = ctx;
  return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowBookingModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 w-full max-w-md space-y-5 shadow-2xl relative animate-scale-in text-left text-slate-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowBookingModal(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1.5 border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-1.5 text-blue-400 text-[12px] font-bold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Book walkthrough
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">Schedule a Call with Ben</h3>
              <p className="text-xs text-slate-400">Pick a time to walk through the custom options for your chapter.</p>
            </div>

            {bookingSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm mx-auto animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">Meeting Requested!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  We&apos;ve sent a calendar invite to <span className="text-blue-400 font-semibold">{bookingEmail}</span>. Looking forward to speaking!
                </p>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="mt-4 px-5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setBookingSubmitted(true); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Mercer"
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="president@chapter.edu"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl outline-none text-xs text-white focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 to-sky-400 hover:opacity-95 shadow-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Calendar className="w-4 h-4" /> Confirm Booking
                </button>
              </form>
            )}
          </div>
        </div>
      );
}
