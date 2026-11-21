"use client";

import { useState } from "react";
import { Button, ConfirmDialog } from "@/components/ui";

const SUMMARY = (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
    <dt className="text-muted">Permit</dt>
    <dd className="font-mono">EL-2026-04417</dd>
    <dt className="text-muted">Address</dt>
    <dd>118 Marlborough St, Back Bay</dd>
    <dt className="text-muted">Decision</dt>
    <dd className="font-semibold">Approve</dd>
  </dl>
);

/** /design only: the dialog drawn in place, plus a button that opens the real modal. */
export function DialogDemo({ live }: { live?: boolean }) {
  const [open, setOpen] = useState(false);
  const props = {
    title: "Sign and approve this permit?",
    attestation: "I reviewed the checks and PermitPike's recommendation myself.",
    confirmLabel: "Sign and approve",
    children: SUMMARY,
  };
  if (!live) {
    return <ConfirmDialog inline open onClose={() => {}} onConfirm={() => {}} {...props} />;
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open the dialog
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        {...props}
      />
    </>
  );
}
