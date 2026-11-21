"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FilePermitForm } from "@/components/apply/FilePermitForm";
import { useApplicantId } from "@/lib/applicant";

export default function NewPermitPage() {
  const router = useRouter();
  const { id, ready } = useApplicantId();
  useEffect(() => {
    if (ready && !id) router.replace("/apply");
  }, [ready, id, router]);
  if (!ready || !id) return null;
  return <FilePermitForm applicantId={id} />;
}
