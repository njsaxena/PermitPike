"use client";

import { useState, type FormEvent } from "react";
import { BostonDrawing, Button, Input } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";

/** Name and license number, no password. Reuses the applicant with the same license. */
export function ApplicantEntry({ onEntered }: { onEntered: (applicantId: string) => void }) {
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [errors, setErrors] = useState<{ name?: string; license?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Enter your name.",
      license: license.trim() ? undefined : "Enter your electrician license number.",
    };
    setErrors(next);
    if (next.name || next.license) return;
    setBusy(true);
    try {
      const { applicant } = await api.createApplicant({ name: name.trim(), licenseNumber: license.trim() });
      onEntered(applicant.id);
    } catch (err) {
      setErrors({ form: err instanceof ApiRequestError ? err.message : "Could not reach PermitPike. Try again." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4 md:pt-12">
      <BostonDrawing kind="triple-decker" className="mx-auto max-w-56" />
      <h1 className="text-center text-title text-ink">File permits</h1>
      <Input
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label="Electrician license number"
        mono
        autoCapitalize="characters"
        autoComplete="off"
        value={license}
        onChange={(e) => setLicense(e.target.value)}
        error={errors.license}
        required
      />
      {errors.form && <p className="text-sm text-critical">{errors.form}</p>}
      <Button type="submit" loading={busy} className="w-full justify-center">
        Continue
      </Button>
    </form>
  );
}
