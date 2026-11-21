"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import type { ApplicantRecord } from "@permitpike/contract";
import { Button, Input } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import { clearApplicantId, useApplicantId } from "@/lib/applicant";

/*
 * The signed-in electrician's account: the details form on the left, and on the right who
 * is signed in and Sign out. The license number is who they are (there is no
 * password), so it is shown, not edited: a different license is a different electrician.
 */
export function ApplicantAccount() {
  const router = useRouter();
  const { id, ready } = useApplicantId();
  const { data, error, mutate } = useSWR(id ? ["applicant", id] : null, () => api.getApplicant(id!));

  useEffect(() => {
    if (ready && !id) router.replace("/apply");
  }, [ready, id, router]);
  if (!ready || !id) return null;

  function signOut() {
    clearApplicantId();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-title text-ink">Your account</h1>
      {error && !data && <p className="text-critical">Could not load your details. Reload to try again.</p>}
      {data && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ProfileForm applicant={data.applicant} onSaved={(applicant) => void mutate({ applicant }, false)} />

          <aside aria-label="Signed in" className="flex flex-col border border-border bg-surface">
            <div className="flex flex-col gap-1 p-card">
              <p className="text-lg text-ink">{data.applicant.name}</p>
              {data.applicant.company && <p className="text-muted">{data.applicant.company}</p>}
              <p className="font-mono text-sm text-ink">{data.applicant.licenseNumber}</p>
            </div>
            <div className="border-t border-border p-card">
              <Button
                variant="secondary"
                onClick={signOut}
                icon={<LogOut aria-hidden className="size-4" strokeWidth={1.75} />}
                className="w-full"
              >
                Sign out
              </Button>
            </div>
          </aside>
        </div>
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
    <form onSubmit={submit} noValidate className="flex flex-col border border-border bg-surface">
      <h2 className="border-b border-border px-card py-4 text-lg text-ink">Your details</h2>
      <div className="flex flex-col gap-6 p-card">
        <div className="grid gap-6 sm:grid-cols-2">
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
        </div>
        <Input label="Electrician license number" mono readOnly value={applicant.licenseNumber} />
        {errors.form && <p className="text-sm text-critical">{errors.form}</p>}
      </div>
      <div className="flex items-center justify-end gap-4 border-t border-border px-card py-4">
        <span role="status" className="text-sm text-muted">
          {saved && !changed ? "Saved" : ""}
        </span>
        <Button type="submit" loading={busy} disabled={!changed && !busy}>
          Save details
        </Button>
      </div>
    </form>
  );
}
