"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePlus, Landmark, Search, X } from "lucide-react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { normalizeTrackingCode } from "@/lib/tracking-code";

type Phase = "closed" | "opening" | "open" | "closing";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const FULL = "inset(0px 0px 0px 0px)";

/* Borderless, straight on the map: gold for the main way in, white for the other two. */
const ACTION =
  "flex items-center justify-center gap-2.5 px-4 font-semibold sm:px-6 whitespace-nowrap text-ink no-underline transition-[box-shadow] duration-150 ease-out motion-reduce:transition-none hov:wash";
const HALF = "min-h-14 min-w-0 flex-1 basis-0 bg-surface text-[18px] leading-6";

/**
 * The three ways in. "Check status" grows out of its own button into a panel the size of
 * all three, asks for the tracking code from the filing confirmation, and opens that permit.
 * Without JavaScript it is a plain link to /track.
 */
export function HomeActions() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();

  const openRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const phase = useRef<Phase>("closed");
  const anims = useRef<Animation[]>([]);
  const focusTimer = useRef<number | undefined>(undefined);

  // Freeze whatever is running where it is, so a quick second click carries on from there.
  function stop() {
    for (const a of anims.current) {
      try {
        a.commitStyles();
      } catch {
        // commitStyles throws if the element is not rendered; cancelling is enough then.
      }
      a.cancel();
    }
    anims.current = [];
    window.clearTimeout(focusTimer.current);
  }

  useEffect(() => stop, []);

  /** The Check status button as an inset of the panel, which can be taller than the buttons. */
  function buttonClip(panel: HTMLElement, button: HTMLElement) {
    const p = panel.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const px = (n: number) => `${Math.max(0, n)}px`;
    return `inset(${px(b.top - p.top)} ${px(p.right - b.right)} ${px(p.bottom - b.bottom)} ${px(b.left - p.left)})`;
  }

  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(e: MouseEvent) {
    e.preventDefault();
    const panel = panelRef.current, content = contentRef.current, button = openRef.current;
    if (!panel || !content || !button) return;
    if (phase.current === "open" || phase.current === "opening") return;
    const fromClosed = phase.current === "closed";
    stop();
    // Render the panel (visible, buttons inert) before measuring and animating it.
    flushSync(() => {
      setExpanded(true);
      if (fromClosed) setError(undefined);
    });
    if (fromClosed) {
      panel.style.clipPath = buttonClip(panel, button);
      content.style.opacity = "0";
    }
    phase.current = "opening";
    const done = () => {
      panel.style.clipPath = FULL;
      content.style.opacity = "1";
      phase.current = "open";
      inputRef.current?.focus({ preventScroll: true });
    };
    if (still()) {
      done();
      return;
    }
    const grow = panel.animate([{ clipPath: getComputedStyle(panel).clipPath }, { clipPath: FULL }], {
      duration: 420,
      easing: EASE,
      fill: "forwards",
    });
    const fade = content.animate([{ opacity: getComputedStyle(content).opacity }, { opacity: 1 }], {
      duration: 260,
      delay: 140,
      easing: "ease-out",
      fill: "forwards",
    });
    anims.current = [grow, fade];
    grow.finished.then(
      () => {
        if (phase.current !== "opening") return;
        stop();
        done();
      },
      () => {},
    );
    focusTimer.current = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 160);
  }

  function hide() {
    const panel = panelRef.current, content = contentRef.current, button = openRef.current;
    if (!panel || !content || !button) return;
    if (phase.current === "closed" || phase.current === "closing") return;
    stop();
    phase.current = "closing";
    const done = () => {
      phase.current = "closed";
      flushSync(() => setExpanded(false));
      button.focus({ preventScroll: true });
    };
    if (still()) {
      done();
      return;
    }
    const target = buttonClip(panel, button);
    const shrink = panel.animate([{ clipPath: getComputedStyle(panel).clipPath }, { clipPath: target }], {
      duration: 320,
      easing: EASE,
      fill: "forwards",
    });
    const fade = content.animate([{ opacity: getComputedStyle(content).opacity }, { opacity: 0 }], {
      duration: 120,
      easing: "ease-in",
      fill: "forwards",
    });
    anims.current = [shrink, fade];
    shrink.finished.then(
      () => {
        if (phase.current !== "closing") return;
        stop();
        panel.style.clipPath = target;
        content.style.opacity = "0";
        done();
      },
      () => {},
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      hide();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const typed = code.trim();
    const normalized = normalizeTrackingCode(typed);
    if (!normalized) {
      setError(
        typed
          ? "That doesn't look like a tracking code. It has 8 letters and numbers, like PP-7K3Q-9M2X."
          : "Enter your tracking code.",
      );
      inputRef.current?.focus();
      return;
    }
    router.push(`/track/${normalized}`);
  }

  return (
    <nav aria-label="Get started" className="relative z-[2] flex flex-col gap-3">
      <Link href="/apply" inert={expanded} className={cx(ACTION, "min-h-[68px] bg-accent text-[20px] leading-[26px]")}>
        <FilePlus aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
        Apply for a permit
      </Link>
      <div className="flex gap-3" inert={expanded}>
        <Link href="/review" className={cx(ACTION, HALF)}>
          <Landmark aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          Staff portal
        </Link>
        <Link
          ref={openRef}
          href="/track"
          aria-expanded={expanded}
          aria-controls="track-panel"
          onClick={show}
          className={cx(ACTION, HALF)}
        >
          <Search aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          Check status
        </Link>
      </div>

      <div
        ref={panelRef}
        id="track-panel"
        onKeyDown={onKeyDown}
        className="absolute inset-x-0 top-0 flex min-h-full flex-col justify-center bg-surface px-5 py-[18px]"
        style={{ visibility: expanded ? "visible" : "hidden", pointerEvents: expanded ? "auto" : "none" }}
      >
        <form ref={contentRef} onSubmit={submit} noValidate className="flex flex-col gap-2.5" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="track-code" className="text-[18px] leading-6 font-semibold text-ink">
              Enter your tracking code
            </label>
            <button
              type="button"
              onClick={hide}
              aria-label="Close"
              className="-my-1 -mr-1.5 flex size-8 items-center justify-center text-ink transition-[box-shadow] duration-150 ease-out hov:wash"
            >
              <X aria-hidden className="size-5" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              id="track-code"
              name="code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="PP-7K3Q-9M2X"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(undefined);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "track-code-error" : undefined}
              className={cx(
                "h-[52px] min-w-0 flex-auto border bg-surface px-3.5 text-[18px] leading-6 font-semibold tracking-[0.04em] text-ink",
                "placeholder:font-normal placeholder:text-border-strong",
                error ? "border-critical" : "border-border-strong",
              )}
            />
            <button
              type="submit"
              className="flex h-[52px] shrink-0 items-center gap-2 bg-accent px-[22px] text-[18px] leading-6 font-semibold text-ink transition-[box-shadow] duration-150 ease-out hov:wash"
            >
              Open
              <ArrowRight aria-hidden className="size-5" strokeWidth={1.75} />
            </button>
          </div>
          {error && (
            <p id="track-code-error" role="alert" className="text-[13px] leading-[18px] text-critical">
              {error}
            </p>
          )}
        </form>
      </div>
    </nav>
  );
}
