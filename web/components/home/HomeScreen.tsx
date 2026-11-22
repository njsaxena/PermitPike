"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PermitPikeMark } from "@/components/ui/Logo";
import { HomeActions } from "./HomeActions";
import { GRID_HEIGHT, GRID_RLE, GRID_WIDTH, NEIGHBORHOODS } from "./neighborhoods";

const MAP_SRC = "/home/boston-permits-map.jpg";
const MAP_RATIO = 5600 / 2444;
/** One lap of the drift around the city. */
const LOOP_MS = 240_000;

function decodeGrid(rle: string): number[] {
  const cells: number[] = [];
  for (const pair of rle.split(",")) {
    const [value = 0, count = 0] = pair.split(":").map(Number);
    for (let i = 0; i < count; i++) cells.push(value);
  }
  return cells;
}

/**
 * A fresh loop on every visit: seven waypoints around the city, Allston to the North End,
 * jittered, with a random start angle and direction, as fractions of the map image.
 */
function makeLoop(): Array<[number, number]> {
  const n = 7;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const a0 = Math.random() * Math.PI * 2;
  return Array.from({ length: n }, (_, k) => {
    const a = a0 + dir * k * ((Math.PI * 2) / n);
    const ru = 0.37 + (Math.random() - 0.5) * 0.08;
    const rv = 0.22 + (Math.random() - 0.5) * 0.1;
    return [0.52 + Math.cos(a) * ru, 0.55 + Math.sin(a) * rv];
  });
}

/** Point on the closed Catmull-Rom spline through `pts`, t in laps. */
function along(pts: Array<[number, number]>, t: number): [number, number] {
  const n = pts.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const s = f - i;
  // Indices wrap, so every lookup lands on a waypoint.
  const at = (k: number) => pts[(k + n) % n]!;
  const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
  const cr = (q0: number, q1: number, q2: number, q3: number) =>
    0.5 * (2 * q1 + (-q0 + q2) * s + (2 * q0 - 5 * q1 + 4 * q2 - q3) * s * s + (-q0 + 3 * q1 - 3 * q2 + q3) * s * s * s);
  return [cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1])];
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The homepage: a blurred heat map of Boston's residential electrical permits drifts slowly
 * behind the logo and the three ways in. Bottom left names the neighborhood under the middle
 * of the screen, with its real permit counts.
 */
export function HomeScreen() {
  const grid = useMemo(() => decodeGrid(GRID_RLE), []);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Index into NEIGHBORHOODS, or -1 over water and outside the city.
  const [hood, setHood] = useState(-1);
  const [shown, setShown] = useState(false);

  // Clear the wash from the last time someone left this page (Back returns here).
  useEffect(() => {
    delete document.documentElement.dataset.leavingHome;
    return () => {
      delete document.documentElement.dataset.leavingHome;
    };
  }, []);

  useEffect(() => {
    const box = boxRef.current, img = imgRef.current;
    if (!box || !img) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pts = makeLoop();
    const t0 = performance.now() - Math.random() * 1000;
    let width = 0, raf = 0, lastCheck = -1e9, current = -2, swap = 0;

    function readout(u: number, v: number) {
      const i = Math.min(GRID_WIDTH - 1, Math.floor(u * GRID_WIDTH));
      const j = Math.min(GRID_HEIGHT - 1, Math.floor(v * GRID_HEIGHT));
      const idx = (grid[j * GRID_WIDTH + i] ?? 0) - 1;
      if (idx === current) return;
      current = idx;
      // Fade out, swap the numbers, fade back in.
      setShown(false);
      window.clearTimeout(swap);
      if (idx < 0) return;
      swap = window.setTimeout(() => {
        setHood(idx);
        setShown(true);
      }, still ? 0 : 260);
    }

    function place(now: number) {
      if (!box || !img) return;
      const vw = box.clientWidth, vh = box.clientHeight;
      const w = Math.max(3.2 * vw, 1.5 * vh * MAP_RATIO), h = w / MAP_RATIO;
      if (w !== width) {
        img.style.width = `${w}px`;
        img.style.height = `${h}px`;
        width = w;
      }
      const [qu, qv] = along(pts, (now - t0) / LOOP_MS);
      // Keep the image covering the screen at the turns.
      const hu = vw / 2 / w, hv = vh / 2 / h;
      const u = Math.min(1 - hu, Math.max(hu, qu)), v = Math.min(1 - hv, Math.max(hv, qv));
      img.style.transform = `translate3d(${(vw / 2 - u * w).toFixed(1)}px, ${(vh / 2 - v * h).toFixed(1)}px, 0)`;
      if (now - lastCheck > 400) {
        lastCheck = now;
        readout(u, v);
      }
    }

    function tick(now: number) {
      place(now);
      if (!still) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    const onResize = () => {
      width = 0;
      place(performance.now());
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(swap);
      window.removeEventListener("resize", onResize);
    };
  }, [grid]);

  const d = hood >= 0 ? NEIGHBORHOODS[hood] : undefined;
  const top = d ? Math.max(...d.byYear, 1) : 1;

  return (
    // Covers the whole window, over the app shell, and scrolls on its own if the window is short.
    <div data-home className="fixed inset-0 z-10 overflow-y-auto bg-background">
      <div className="relative min-h-full overflow-hidden">
        <div ref={boxRef} aria-hidden className="absolute inset-0 overflow-hidden">
          {/* A drifting background picture, not content: next/image would resize a 5600px map we move by hand. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={MAP_SRC}
            alt=""
            width={5600}
            height={2444}
            decoding="async"
            className="pointer-events-none absolute top-0 left-0 max-w-none select-none will-change-transform"
          />
          {/* Limestone wash, so the logo and buttons read over the map. */}
          <div className="absolute inset-0 bg-background opacity-50" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-5 pt-12 pb-[72px]">
          <div className="flex w-full max-w-[640px] flex-col gap-12">
            <div className="flex items-center justify-center gap-[clamp(14px,2.4vw,28px)]">
              <PermitPikeMark on="transparent" size={112} className="size-[clamp(56px,9vw,112px)]" />
              <div className="flex min-w-0 flex-col gap-[clamp(4px,0.8vw,10px)]">
                <h1
                  className="text-[clamp(38px,7vw,80px)] leading-[0.9] font-bold tracking-[-0.02em] whitespace-nowrap text-ink"
                  style={{ fontFamily: "var(--pp-font-wordmark)" }}
                >
                  PermitPike
                </h1>
                <p className="text-[clamp(13px,1.75vw,20px)] leading-[1.2] text-ink italic">
                  The fast lane for Boston electrical permits.
                </p>
              </div>
            </div>
            <HomeActions />
          </div>
        </div>

        {/* Decorative: the same counts are not the page's content, so screen readers skip it. */}
        <div
          aria-hidden
          className="absolute bottom-16 left-4 max-w-[440px] text-ink transition-opacity duration-[240ms] ease-out motion-reduce:transition-none sm:bottom-11 sm:left-6"
          style={{ opacity: shown && d ? 1 : 0 }}
        >
          {d && (
            <>
              <p className="text-[20px] leading-[26px] font-semibold">{d.name}</p>
              <p className="mt-1 text-[15px] leading-[22px]">{fmt(d.y2026)} permits in 2026</p>
              <div className="mt-3.5 hidden items-end gap-3.5 sm:flex">
                <div className="flex shrink-0 flex-col gap-1">
                  <div className="flex h-8 items-end gap-[3px]">
                    {d.byYear.map((n, k) => (
                      <div
                        key={k}
                        className="w-3 bg-critical"
                        style={{ height: Math.max(2, Math.round((32 * n) / top)) }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] leading-[14px] text-muted">
                    <span>2021</span>
                    <span>2025</span>
                  </div>
                </div>
                <p className="mb-[18px] text-sm leading-[18px]">
                  {fmt(d.total)} residential electrical permits since 2021
                </p>
              </div>
            </>
          )}
        </div>

        <p className="absolute right-3 bottom-2.5 left-3 text-right text-[12px] leading-4 text-muted">
          <span className="inline-block bg-background px-2 py-[3px]">Analyze Boston · © OpenStreetMap</span>
        </p>
      </div>
    </div>
  );
}
