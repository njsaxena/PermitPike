"use client";

import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { ApplicantRecord } from "@permitpike/contract";
import { Button, Input } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import { useApplicantId } from "@/lib/applicant";

/*
 * The signed-in electrician's details, and signing out on this device.
 * The license number is who they are (there is no password), so it is shown, not edited:
 * a different license is a different electrician, reached by signing out.
 */
export function ApplicantAccount() {
  const router = useRouter();
  const { id, ready } = useApplicantId();
  const { data, error, mutate } = useSWR(id ? ["applicant", id] : null, () => api.getApplicant(id!));

  useEffect(() => {
    if (ready && !id) router.replace("/apply");
  }, [ready, id, router]);
  if (!ready || !id) return null;

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-title text-ink">Your account</h1>
        <Link href="/apply" className="pp-link text-sm">
          Your permits
        </Link>
      </div>

      {error && !data && <p className="text-critical">Could not load your details. Reload to try again.</p>}
      {data && (
        <ProfileForm applicant={data.applicant} onSaved={(applicant) => void mutate({ applicant }, false)} />
      )}

    </div>
  );
}

function ProfileForm({
  applicant,
  onSaved,
}: {
  applicant: ApplicantRecord;
  onSaved: (applicant: ApplicantRecord) => void;
}) {
  const [name, setName] = useState(applicant.name);
  const [company, setCompany] = useState(applicant.company ?? "");
  const [errors, setErrors] = useState<{ name?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const changed = name.trim() !== applicant.name || (company.trim() || null) !== applicant.company;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Enter your name." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await api.updateApplicant(applicant.id, { name: name.trim(), company: company.trim() || null });
      setName(res.applicant.name);
      setCompany(res.applicant.company ?? "");
      onSaved(res.applicant);
      setSaved(true);
    } catch (err) {
      setErrors({ form: err instanceof ApiRequestError ? err.message : "Could not save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <h2 className="text-lg text-ink">Your details</h2>
      <Input
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        error={errors.name}
        required
      />
      <Input
        label="Company (optional)"
        autoComplete="organization"
        value={company}
        onChange={(e) => {
          setCompany(e.target.value);
          setSaved(false);
        }}
      />
      <Input label="Electrician license number" mono readOnly value={applicant.licenseNumber} />
      {errors.form && <p className="text-sm text-critical">{errors.form}</p>}
      <div className="flex items-center gap-4">
        <Button type="submit" loading={busy} disabled={!changed && !busy}>
          Save details
        </Button>
        <span role="status" className="text-sm text-muted">
          {saved && !changed ? "Saved" : ""}
        </span>
      </div>
    </form>
  );
}
