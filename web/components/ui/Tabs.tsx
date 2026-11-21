"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabItem {
  id: string;
  label: string;
  /** Icon before the label. */
  icon?: ReactNode;
  /** Show only the icon; the label stays as the accessible name and the tooltip. */
  iconOnly?: boolean;
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
  value,
  onChange,
  panelClassName = "pt-6",
}: {
  items: TabItem[];
  defaultTab?: string;
  /** Controlled: the selected tab id. Pair with onChange. */
  value?: string;
  onChange?: (id: string) => void;
  /** Spacing above each panel. */
  panelClassName?: string;
  /** Accessible name for the tab list. */
  label: string;
  /** Static hover sample on /design. */
  demoHoverId?: string;
}) {
  const baseId = useId();
  const enabled = items.filter((t) => !t.disabled);
  const [own, setOwn] = useState(defaultTab ?? enabled[0]?.id ?? "");
  const active = value ?? own;
  const listRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  // Where the tab bar sat on screen when a tab was clicked, so it can stay there.
  const anchor = useRef<{ top: number; bottom: number } | null>(null);

  function setActive(id: string) {
    if (id !== active && listRef.current) {
      const r = listRef.current.getBoundingClientRect();
      anchor.current = { top: r.top, bottom: r.bottom };
    }
    setOwn(id);
    onChange?.(id);
  }

  // Switching to a shorter tab would shrink the page and make the browser jump up. Before
  // anything is measured, give the panel area at least the screen height below the tab bar,
  // then scroll back by however far the tab bar moved, so the view stays put.
  useLayoutEffect(() => {
    const was = anchor.current;
    anchor.current = null;
    if (!was || !listRef.current || !panelsRef.current) return;
    panelsRef.current.style.minHeight = `${Math.max(0, Math.round(window.innerHeight - was.bottom))}px`;
    const shift = listRef.current.getBoundingClientRect().top - was.top;
    if (Math.abs(shift) > 1) window.scrollBy(0, shift);
  }, [active]);
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
        ref={listRef}
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
              data-tab-id={t.id}
              title={t.iconOnly ? t.label : undefined}
              onClick={() => setActive(t.id)}
              className={cx(
                // Square buttons in a row. The selected one is filled ink, like a pressed key.
                "flex h-10 shrink-0 items-center gap-2 border font-semibold whitespace-nowrap",
                t.iconOnly ? "w-10 justify-center" : "px-4",
                "transition-[background-color,border-color,color,box-shadow] duration-100 ease-out",
                selected
                  ? "border-ink bg-ink text-surface"
                  : "border-border-strong bg-surface text-ink hov:wash",
                "disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken disabled:text-border-strong",
              )}
            >
              {t.icon}
              {t.iconOnly ? <span className="sr-only">{t.label}</span> : t.label}
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
      <div ref={panelsRef}>
        {items.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            id={`${baseId}-panel-${t.id}`}
            aria-labelledby={`${baseId}-tab-${t.id}`}
            hidden={t.id !== active}
            tabIndex={0}
            className={panelClassName}
          >
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
