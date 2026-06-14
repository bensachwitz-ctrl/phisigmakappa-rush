"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";
import { initPostHog } from "@/lib/posthog";

export default function TelemetryBootstrap() {
  useEffect(() => {
    try {
      initSentry();
      initPostHog();
    } catch (err) {
      console.warn("Telemetry init failed:", err);
    }
  }, []);
  return null;
}
