"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePlus, Landmark, Search, X } from "lucide-react";
import { Button, ButtonLink, Input } from "@/components/ui";
import { normalizeTrackingCode } from "@/lib/tracking-code";

type Phase = "closed" | "opening" | "open" | "closing";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const FULL = "inset(0px 0px 0px 0px)";

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
    <nav aria-label="Get started" className="relative flex max-w-xl flex-col gap-3">
      <ButtonLink href="/apply" size="lg" inert={expanded} icon={<FilePlus aria-hidden className="size-5" />}>
        Apply for a permit
      </ButtonLink>
      <div className="grid grid-cols-2 gap-3" inert={expanded}>
        <ButtonLink href="/review" variant="secondary" size="lg" icon={<Landmark aria-hidden className="size-5" />}>
          Staff portal
        </ButtonLink>
        <ButtonLink
          ref={openRef}
          href="/track"
          variant="secondary"
          size="lg"
          aria-expanded={expanded}
          aria-controls="track-panel"
          onClick={show}
          icon={<Search aria-hidden className="size-5" />}
        >
          Check status
        </ButtonLink>
      </div>

      <div
        ref={panelRef}
        id="track-panel"
        onKeyDown={onKeyDown}
        className="absolute inset-x-0 top-0 flex min-h-full flex-col justify-center border border-border-strong bg-surface px-5 py-4"
        style={{ visibility: expanded ? "visible" : "hidden", pointerEvents: expanded ? "auto" : "none" }}
      >
        <form ref={contentRef} onSubmit={submit} noValidate className="relative" style={{ opacity: 0 }}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Input
                ref={inputRef}
                label="Enter your tracking code"
                mono
                placeholder="PP-7K3Q-9M2X"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(undefined);
                }}
                error={error}
              />
            </div>
            {/* Label (20px) plus its gap (6px), so the button lines up with the box. */}
            <Button type="submit" className="mt-[26px]" icon={<ArrowRight aria-hidden className="size-4" />}>
              Open
            </Button>
          </div>
          <button
            type="button"
            onClick={hide}
            aria-label="Close"
            className="absolute -top-1.5 -right-2 flex size-8 items-center justify-center text-ink transition-[background-color] duration-100 ease-out hov:bg-hover"
          >
            <X aria-hidden className="size-4" />
          </button>
        </form>
      </div>
    </nav>
  );
}
