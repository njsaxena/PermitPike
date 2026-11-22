"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BostonDrawing, Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

/** The name goes into an httpOnly cookie and onto every permit this reviewer signs. */
export function ReviewerEntry() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ name?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErrors({ name: "Enter your name. It goes on every permit you sign." });
    setErrors({});
    setBusy(true);
    try {
      await api.createReviewerSession({ name: name.trim() });
      router.refresh();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not reach PermitPike. Try again." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate data-enter className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4 md:pt-12">
      <BostonDrawing kind="city-hall" className="mx-auto max-w-72" />
      <h1 className="text-center text-title text-ink">Review permits</h1>
      <Input
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      {errors.form && <p className="text-sm text-critical">{errors.form}</p>}
      <Button type="submit" loading={busy} className="w-full justify-center">
        Continue
      </Button>
    </form>
  );
}
