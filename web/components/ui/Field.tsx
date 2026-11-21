"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronDown, CircleAlert, ScanText } from "lucide-react";
import { cx } from "@/lib/cx";

/*
 * Input, Select and Textarea share one shell: a visible label above, a bordered box,
 * and an error line below. Every control needs a label; there is no placeholder-only mode.
 */

interface FieldBaseProps {
  label: string;
  /** Shown under the control in brick red; also sets aria-invalid. */
  error?: string;
  /** Monospace value: permit numbers, amps, volts, citations. */
  mono?: boolean;
  /** Static state for /design samples, e.g. "hover" or "focus". */
  "data-demo"?: string;
}

interface ShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  errorId: string;
  disabled?: boolean;
  readOnly?: boolean;
  demo?: string;
  children: ReactNode;
  suffix?: ReactNode;
  multiline?: boolean;
  extracted?: Extracted;
  extractedId?: string;
  extractedSource?: string;
}

/**
 * A value PermitPike read from an uploaded document. "confirm": the applicant still
 * has to check it. "confirmed": they did. The AI never fills a field silently.
 */
export type Extracted = "confirm" | "confirmed";

function FieldShell({
  id,
  label,
  required,
  error,
  errorId,
  disabled,
  readOnly,
  demo,
  children,
  suffix,
  multiline,
  extracted,
  extractedId,
  extractedSource = "your upload",
}: ShellProps) {
  const muted = disabled || readOnly;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 font-normal text-muted">
            <span aria-hidden>*</span>
            <span className="sr-only">(required)</span>
          </span>
        )}
      </label>
      <div
        data-demo={demo}
        className={cx(
          "relative flex border",
          multiline ? "items-stretch" : "h-10 items-center",
          "focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ink",
          error
            ? "border-critical"
            : extracted === "confirm"
              ? "border-ink"
              : muted
                ? "border-border"
                : "border-border-strong",
          muted ? "bg-sunken" : extracted === "confirm" && !error ? "bg-accent-tint" : "bg-surface",
          disabled && "cursor-not-allowed",
          !muted && !error && "hov:border-ink",
        )}
      >
        {children}
        {suffix}
        {extracted === "confirmed" && (
          <span className="flex h-full items-center gap-1 border-l border-border px-2.5 text-sm font-semibold text-positive">
            <Check aria-hidden className="size-4" strokeWidth={2.5} />
            Confirmed
          </span>
        )}
      </div>
      {extracted === "confirm" && !error && (
        <p id={extractedId} className="flex items-start gap-1.5 text-sm text-ink">
          <ScanText aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          Read from {extractedSource}. Check it before you submit.
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-critical">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "min-w-0 flex-1 bg-transparent px-3 text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:text-muted";

export interface InputProps extends FieldBaseProps, InputHTMLAttributes<HTMLInputElement> {
  /** Unit shown at the right edge in mono, e.g. "A", "V", "ft". */
  unit?: string;
  /** The value was read from an upload; see `Extracted`. */
  extracted?: Extracted;
  /** Where it was read from, e.g. "the load calculation". */
  extractedSource?: string;
}

export function Input({
  label,
  error,
  mono,
  unit,
  extracted,
  extractedSource,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const extractedId = `${inputId}-extracted`;
  const describedBy =
    [error && errorId, extracted === "confirm" && !error && extractedId].filter(Boolean).join(" ") ||
    undefined;
  const { "data-demo": demo, ...inputProps } = rest;
  return (
    <FieldShell
      id={inputId}
      label={label}
      required={inputProps.required}
      error={error}
      errorId={errorId}
      disabled={inputProps.disabled}
      readOnly={inputProps.readOnly}
      demo={demo}
      extracted={extracted}
      extractedId={extractedId}
      extractedSource={extractedSource}
      suffix={
        unit ? (
          <span className="flex h-full items-center border-l border-border px-3 font-mono text-sm text-muted">
            {unit}
          </span>
        ) : null
      }
    >
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL, "h-full", mono && "font-mono", className)}
        {...inputProps}
      />
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends FieldBaseProps {
  options: SelectOption[];
  /** Controlled value. Use "" for nothing chosen. */
  value?: string;
  /** Uncontrolled starting value. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shown in the box while nothing is chosen. */
  placeholder?: string;
  /** Adds a hidden input so the value posts with a plain form. */
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A select-only combobox (WAI-ARIA APG pattern) in place of the native dropdown, so the
 * list matches the rest of the kit. Focus stays on the button; options are pointed at
 * with aria-activedescendant. Keys: arrows, Home, End, Enter, Space, Escape, Tab, typing.
 */
export function Select({
  label,
  error,
  mono,
  options,
  value: controlled,
  defaultValue = "",
  onChange,
  placeholder = "Choose one",
  name,
  id,
  required,
  disabled,
  className,
  "data-demo": demo,
}: SelectProps) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const listId = `${buttonId}-list`;
  const errorId = `${buttonId}-error`;
  const optionId = (i: number) => `${buttonId}-opt-${i}`;

  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const selectedIndex = options.findIndex((o) => o.value === value);
  const staticOpen = demo?.split(" ").includes("open") ?? false;
  const [open, setOpen] = useState(staticOpen);
  const [active, setActive] = useState(Math.max(selectedIndex, 0));
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  function choose(i: number) {
    const opt = options[i];
    if (!opt) return;
    if (controlled === undefined) setUncontrolled(opt.value);
    if (opt.value !== value) onChange?.(opt.value);
  }

  function openAt(i: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    // Open upward when the list would run off the bottom of the screen.
    setDropUp(rect ? window.innerHeight - rect.bottom < 280 && rect.top > 280 : false);
    setActive(Math.min(Math.max(i, 0), options.length - 1));
    setOpen(true);
  }

  function close() {
    if (!staticOpen) setOpen(false);
  }

  // Close on a press anywhere outside the field.
  useEffect(() => {
    if (!open || staticOpen) return;
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, staticOpen]);

  // Keep the active row in view while moving with the keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function matchTyped(key: string): number {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 600 ? key : typed.current.text + key;
    typed.current.at = now;
    const q = typed.current.text.toLowerCase();
    const from = open ? active : Math.max(selectedIndex, 0);
    // A repeated single letter cycles through the matches.
    const start = q.length === 1 ? from + 1 : from;
    for (let k = 0; k < options.length; k++) {
      const i = (start + k) % options.length;
      if (options[i]?.label.toLowerCase().startsWith(q)) return i;
    }
    return -1;
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        openAt(e.key === "Home" ? 0 : last);
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const i = matchTyped(e.key);
        if (i >= 0) openAt(i);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) {
          choose(active);
          close();
        } else setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
      case "PageUp":
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : (i) => Math.max(i - 10, 0));
        break;
      case "End":
      case "PageDown":
        e.preventDefault();
        setActive(e.key === "End" ? last : (i) => Math.min(i + 10, last));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        close();
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        choose(active);
        close();
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const i = matchTyped(e.key);
          if (i >= 0) setActive(i);
        }
    }
  }

  const selected = options[selectedIndex];
  return (
    <div ref={wrapRef} className="relative">
      <FieldShell
        id={buttonId}
        label={label}
        required={required}
        error={error}
        errorId={errorId}
        disabled={disabled}
        demo={demo}
        suffix={
          <>
            <ChevronDown
              aria-hidden
              className={cx(
                "pointer-events-none absolute right-3 size-4 text-muted transition-transform duration-100 motion-reduce:transition-none",
                open && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            hidden={!open}
            className={cx(
              "absolute -inset-x-px z-30 max-h-72 overflow-y-auto border border-ink bg-surface py-1",
              dropUp ? "bottom-[calc(100%+5px)]" : "top-[calc(100%+5px)]",
            )}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={o.value}
                  id={optionId(i)}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  // Keep focus on the button so the combobox stays the single tab stop.
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActive(i)}
                  onClick={() => {
                    choose(i);
                    close();
                    buttonRef.current?.focus();
                  }}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-ink",
                    i === active && "bg-accent-tint",
                    isSelected && "font-semibold",
                    mono && "font-mono",
                  )}
                >
                  <span>{o.label}</span>
                  {isSelected && <Check aria-hidden className="size-4 shrink-0" strokeWidth={2} />}
                </li>
              );
            })}
          </ul>
          </>
        }
      >
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openAt(selectedIndex >= 0 ? selectedIndex : 0))}
          onKeyDown={onKeyDown}
          onBlur={close}
          className={cx(
            CONTROL,
            "h-full truncate pr-9 text-left",
            !disabled && "cursor-pointer",
            !selected && "text-muted",
            mono && "font-mono",
            className,
          )}
        >
          {selected?.label ?? placeholder}
        </button>
      </FieldShell>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

export interface TextareaProps extends FieldBaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ label, error, mono, id, className, rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  const errorId = `${areaId}-error`;
  const { "data-demo": demo, ...areaProps } = rest;
  return (
    <FieldShell
      id={areaId}
      label={label}
      required={areaProps.required}
      error={error}
      errorId={errorId}
      disabled={areaProps.disabled}
      readOnly={areaProps.readOnly}
      demo={demo}
      multiline
    >
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cx(CONTROL, "resize-y py-2", mono && "font-mono", className)}
        {...areaProps}
      />
    </FieldShell>
  );
}
