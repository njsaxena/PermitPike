"use client";

/*
 * Leaving the homepage for a login. The browser keeps the map on screen until the next page
 * has rendered, then crossfades into it, so there is no blank frame while the page loads.
 * Browsers without view transitions, and reduced motion, switch instantly.
 */

/** Never hold the old screen longer than this, even if the next page is slow. */
const MAX_HOLD_MS = 2500;

let settle: (() => void) | null = null;

/** Called once the new route has rendered: lets the held transition run. */
export function settleRoute(): void {
  const done = settle;
  settle = null;
  done?.();
}

/** Starts the crossfade and the navigation. Returns false when the caller should navigate normally. */
export function leaveHome(navigate: () => void): boolean {
  if (typeof document.startViewTransition !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const root = document.documentElement;
  root.dataset.fromHome = "";
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        settle = resolve;
        window.setTimeout(settleRoute, MAX_HOLD_MS);
        navigate();
      }),
  );
  transition.finished.finally(() => delete root.dataset.fromHome);
  return true;
}
