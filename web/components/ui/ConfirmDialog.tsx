"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";
import { Button, type ButtonVariant } from "./Button";
import { Checkbox } from "./Choice";

/*
 * Confirmation before an action that cannot be undone, e.g. an official signing a
 * permit. Native <dialog>: focus is trapped, Escape closes, focus returns to the
 * trigger. With `attestation`, the confirm button stays disabled until it is ticked.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** What will happen, in plain words; e.g. a short summary list. */
  children: ReactNode;
  /** Statement the person must tick, e.g. "I reviewed the load calculation." */
  attestation?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  cancelLabel?: string;
  /** Render in place, always open, without the modal layer. For /design only. */
  inline?: boolean;
  /** Keep the content in the page while closed, so a static copy (the design artifact) can open it. */
  keepMounted?: boolean;
  /** Set on the <dialog>, so a static copy can find it. */
  id?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  attestation,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel = "Cancel",
  inline,
  keepMounted,
  id,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [attested, setAttested] = useState(false);

  useEffect(() => {
    if (inline) return;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, inline]);

  useEffect(() => {
    if (!open) setAttested(false);
  }, [open]);

  const panel = (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-ink bg-accent px-card py-4">
        <h2 id={titleId} className="text-lg text-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          data-dialog-close=""
          className="-mr-2 flex size-8 items-center justify-center text-ink hov:bg-hover"
        >
          <X aria-hidden className="size-5" strokeWidth={2} />
          <span className="sr-only">Close</span>
        </button>
      </div>
      <div className="flex flex-col gap-5 p-card text-ink">
        {children}
        {attestation && (
          <Checkbox
            label={attestation}
            checked={attested}
            onChange={(e) => setAttested(e.currentTarget.checked)}
          />
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border px-card py-4">
        <Button variant="secondary" onClick={onClose} data-dialog-close="">
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          disabled={Boolean(attestation) && !attested}
          onClick={onConfirm}
          data-dialog-confirm=""
          data-needs-attestation={attestation ? "" : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  const frame = "w-full max-w-lg border border-ink bg-surface p-0 text-ink";

  if (inline) {
    return (
      <div role="dialog" aria-labelledby={titleId} className={frame}>
        {panel}
      </div>
    );
  }
  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cx(frame, "m-auto")}
    >
      {(open || keepMounted) && panel}
    </dialog>
  );
}
