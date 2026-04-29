import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { redact } from "./lib/logger";
import "./index.css";

// QUAL-06 — Sentry observability with PII scrubbing as foundation lock.
// Reuses redact() from src/lib/logger.ts as single source of truth for PII rules.
// Replay default OFF (replaysSessionSampleRate: 0); when toggled ON via UI,
// maskAllText/maskAllInputs already configured here keep content masked.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !import.meta.env.DEV && Boolean(import.meta.env.VITE_SENTRY_DSN),
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0, // QUAL-06 LOCK — default OFF
  replaysOnErrorSampleRate: 0, // never auto-record on error (privacy first)
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    // QUAL-06 LOCK — beforeSend MUST scrub PII before any other config.
    // Reuses redact() from src/lib/logger.ts — single source of truth for PII keys.
    if (event.request) event.request = redact(event.request) as typeof event.request;
    if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
    if (event.user) {
      // Strip email/name from Sentry user record; keep only id + scope tags.
      event.user = { id: event.user.id };
    }
    // Also redact breadcrumbs.data which often carries fetch payloads.
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) =>
        b.data ? { ...b, data: redact(b.data) as typeof b.data } : b,
      );
    }
    return event;
  },
});

createRoot(document.getElementById("root")!).render(<App />);
