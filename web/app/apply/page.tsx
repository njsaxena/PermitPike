"use client";

import { ApplicantEntry } from "@/components/apply/ApplicantEntry";
import { MyPermits } from "@/components/apply/MyPermits";
import { useApplicantId } from "@/lib/applicant";

export default function ApplyPage() {
  const { id, ready, save } = useApplicantId();
  if (!ready) return null;
  return id ? <MyPermits applicantId={id} /> : <ApplicantEntry onEntered={save} />;
}
