import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";

/*
 * Square checkbox and radio. Checked = dome-gold fill with an ink edge and ink mark:
 * a check for a checkbox, a solid square for a radio. Native inputs, so keyboard and
 * screen reader behavior is the browser's own.
 */

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  /** One short line under the label. */
  description?: string;
  /** Static state for /design samples, e.g. "hover" or "focus". */
  "data-demo"?: string;
}

function ChoiceBase({
  kind,
  label,
  description,
  id,
  disabled,
  className,
  "data-demo": demo,
  ...rest
}: ChoiceProps & { kind: "checkbox" | "radio" }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input
          id={inputId}
          type={kind}
          disabled={disabled}
          data-demo={demo}
          aria-describedby={description ? descId : undefined}
          className={cx(
            "peer size-5 cursor-pointer appearance-none border border-border-strong bg-surface",
            "transition-colors duration-100 ease-out",
            "hov:border-ink checked:border-ink checked:bg-accent",
            "disabled:cursor-not-allowed disabled:border-border disabled:bg-sunken",
            "disabled:checked:bg-border",
          )}
          {...rest}
        />
        {kind === "checkbox" ? (
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-0.5 hidden size-4 text-ink peer-checked:block"
          />
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[6px] hidden bg-ink peer-checked:block"
          />
        )}
      </span>
      <span className="flex flex-col">
        <label
          htmlFor={inputId}
          className={cx("cursor-pointer text-ink", disabled && "cursor-not-allowed text-muted")}
        >
          {label}
        </label>
        {description && (
          <span id={descId} className="text-sm text-muted">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <ChoiceBase kind="checkbox" {...props} />;
}

export function Radio(props: ChoiceProps) {
  return <ChoiceBase kind="radio" {...props} />;
}

/** A labelled group of radios or checkboxes. The legend is the visible label. */
export function ChoiceGroup({
  legend,
  error,
  children,
  className,
}: {
  legend: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cx("flex flex-col gap-3", className)} aria-invalid={error ? true : undefined}>
      <legend className="mb-1 text-sm font-semibold text-ink">{legend}</legend>
      {children}
      {error && <p className="text-sm text-critical">{error}</p>}
    </fieldset>
  );
}
