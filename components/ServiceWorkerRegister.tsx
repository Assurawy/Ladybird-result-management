"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        /* offline support is a nice-to-have, not fatal if registration fails */
      });
    }
  }, []);
  return null;
}
