"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ApplicantEntry } from "@/components/apply/ApplicantEntry";
import { MyPermits } from "@/components/apply/MyPermits";
import { useApplicantId } from "@/lib/applicant";

function Apply() {
  const router = useRouter();
  // Where to go after signing in, e.g. the filing form someone started before signing in.
  const next = useSearchParams().get("next");
  const { id, ready, save } = useApplicantId();
  if (!ready) return null;
  if (id) return <MyPermits applicantId={id} />;
  return (
    <ApplicantEntry
      onEntered={(applicantId) => {
        save(applicantId);
        if (next?.startsWith("/apply/new")) router.push(next);
      }}
    />
  );
}

export default function ApplyPage() {
  return (
    <Suspense>
      <Apply />
    </Suspense>
  );
}
