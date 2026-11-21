"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { cx } from "@/lib/cx";
import { normalizeTrackingCode } from "@/lib/tracking-code";

/** Code entry. The server decides whether a code exists, so every miss gets the same answer. */
export function TrackLookup({ initial = "", className }: { initial?: string; className?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | undefined>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setError("Enter your tracking code.");
      return;
    }
    setError(undefined);
    // A clean URL when the code is well formed; anything else still goes to the server,
    // which gives every miss the same answer.
    router.push(`/track/${encodeURIComponent(normalizeTrackingCode(value) ?? value.toUpperCase())}`);
  }

  return (
    <form onSubmit={submit} noValidate className={cx("flex max-w-md flex-col gap-4", className)}>
      <Input
        label="Tracking code"
        mono
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
        required
      />
      <div>
        <Button type="submit">Look up</Button>
      </div>
    </form>
  );
}
