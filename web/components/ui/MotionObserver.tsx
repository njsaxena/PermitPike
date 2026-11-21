"use client";

import { useEffect } from "react";

/**
 * Turns on scroll-in motion. Adds `pp-motion` to <html>, then marks each
 * [data-motion] element with `data-motion-in` the first time it enters view.
 * Renders nothing. Mount once, in the root layout.
 */
export function MotionObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-motion-in", "");
          observer.unobserve(entry.target);
        }
      },
      // Fire once the element's top is 15% into the viewport, however tall it is.
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    const watch = () =>
      document
        .querySelectorAll("[data-motion]:not([data-motion-in])")
        .forEach((el) => observer.observe(el));
    watch();
    root.classList.add("pp-motion");
    const mutations = new MutationObserver(watch);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove("pp-motion");
    };
  }, []);
  return null;
}
