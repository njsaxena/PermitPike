"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { settleRoute } from "@/lib/home-transition";

/**
 * Tells a held homepage transition that the new page is on screen. Waits a beat after the
 * route changes so client-only pages (the applicant's, which reads the device first) have
 * drawn. A timer, not requestAnimationFrame: the browser pauses frames while it holds.
 */
export function RouteSettled() {
  const pathname = usePathname();
  useEffect(() => {
    const timer = window.setTimeout(settleRoute, 40);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
