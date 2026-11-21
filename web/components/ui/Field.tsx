import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
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
}

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
          "relative flex rounded-md border bg-surface",
          multiline ? "items-stretch" : "h-10 items-center",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          error ? "border-critical" : muted ? "border-border" : "border-border-strong",
          muted && "bg-sunken",
          disabled && "cursor-not-allowed",
          !muted && !error && "hov:border-ink",
        )}
      >
        {children}
        {suffix}
      </div>
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
}

export function Input({ label, error, mono, unit, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
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
        aria-describedby={error ? errorId : undefined}
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

export interface SelectProps extends FieldBaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  /** First, unselectable row shown while nothing is chosen. */
  placeholder?: string;
}

export function Select({
  label,
  error,
  mono,
  options,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;
  const { "data-demo": demo, ...selectProps } = rest;
  return (
    <FieldShell
      id={selectId}
      label={label}
      required={selectProps.required}
      error={error}
      errorId={errorId}
      disabled={selectProps.disabled}
      demo={demo}
      suffix={
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 size-4 text-muted"
          strokeWidth={1.75}
        />
      }
    >
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cx(CONTROL, "h-full appearance-none pr-9", mono && "font-mono", className)}
        {...selectProps}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
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
