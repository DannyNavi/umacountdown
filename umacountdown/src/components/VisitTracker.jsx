import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Dedupe StrictMode double-effects and rapid remounts for the same path. */
const recent = { path: null, at: 0 };
const DEDUPE_MS = 1500;

/**
 * Privacy-friendly page-view tracking: posts the current route only.
 * No cookies, no visitor IDs — aggregate counts on the server.
 */
export default function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || "/";
    const now = Date.now();
    if (recent.path === path && now - recent.at < DEDUPE_MS) {
      return;
    }
    recent.path = path;
    recent.at = now;

    // Fire-and-forget: do not abort on unmount (StrictMode would drop the hit).
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never break the app.
    });
  }, [location.pathname]);

  return null;
}
