"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabItem {
  id: string;
  label: string;
  /** Mono count after the label, e.g. failing checks. */
  count?: number;
  disabled?: boolean;
  content: ReactNode;
}

/** WAI-ARIA tabs: arrow keys move between tabs, Home/End jump, Tab moves into the panel. */
export function Tabs({
  items,
  defaultTab,
  label,
  demoHoverId,
}: {
  items: TabItem[];
  defaultTab?: string;
  /** Accessible name for the tab list. */
  label: string;
  /** Static hover sample on /design. */
  demoHoverId?: string;
}) {
  const baseId = useId();
  const enabled = items.filter((t) => !t.disabled);
  const [active, setActive] = useState(defaultTab ?? enabled[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(e: KeyboardEvent<HTMLDivElement>) {
    const idx = enabled.findIndex((t) => t.id === active);
    let next: TabItem | undefined;
    if (e.key === "ArrowRight") next = enabled[(idx + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(idx - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    setActive(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={move}
        className="flex flex-wrap gap-2"
      >
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={t.disabled}
              data-demo={demoHoverId === t.id ? "hover" : undefined}
              onClick={() => setActive(t.id)}
              className={cx(
                // Square buttons in a row. The selected one is filled ink, like a pressed key.
                "flex h-10 shrink-0 items-center gap-2 border px-4 font-semibold whitespace-nowrap",
                "transition-colors duration-100 ease-out",
                selected
                  ? "border-ink bg-ink text-surface"
                  : "border-border-strong bg-surface text-ink hov:border-ink",
                "disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken disabled:text-border-strong",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cx(
                    "flex h-5 min-w-5 items-center justify-center px-1 font-mono text-label",
                    selected ? "bg-accent text-ink" : "bg-sunken text-muted",
                  )}
                >
                  <span className="sr-only">(</span>
                  {t.count}
                  <span className="sr-only">)</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className="pt-6"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
