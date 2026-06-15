"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";
import { initPostHog } from "@/lib/posthog";

export default function TelemetryBootstrap() {
  useEffect(() => {
    // Both inits are async now (they dynamic-import their SDK only when a
    // key/DSN is set). Fire-and-forget, swallowing any rejection — telemetry is
    // best-effort and must never surface to the user.
    void initSentry().catch(() => {});
    void initPostHog().catch(() => {});
  }, []);
  return null;
}
