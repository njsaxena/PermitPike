"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cx } from "@/lib/cx";

/** The tracking code as a value, with a Copy button that says when it worked. */
export function TrackingCodeCopy({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    let done = false;
    try {
      await navigator.clipboard.writeText(code);
      done = true;
    } catch {
      // Webviews and some browsers refuse the Clipboard API; the older select-and-copy still works there.
      done = legacyCopy(code);
    }
    setState(done ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="select-all whitespace-nowrap border border-border-strong bg-surface px-3 py-2 font-mono text-lg tracking-wide text-ink">
          {code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 min-w-24 shrink-0 items-center justify-center gap-1.5 border border-border-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors duration-100 ease-out hov:border-ink hov:bg-sunken"
        >
          {state === "copied" ? (
            <Check aria-hidden className="size-4" strokeWidth={1.75} />
          ) : (
            <Copy aria-hidden className="size-4" strokeWidth={1.75} />
          )}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <span role="status" className="sr-only">
        {state === "copied"
          ? "Tracking code copied"
          : state === "failed"
            ? "Could not copy. Select the code instead."
            : ""}
      </span>
      {state === "failed" && (
        <span className="text-sm text-muted">Select the code to copy it.</span>
      )}
    </div>
  );
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
