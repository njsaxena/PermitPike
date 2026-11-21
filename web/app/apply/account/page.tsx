import type { Metadata } from "next";
import { ApplicantAccount } from "@/components/apply/ApplicantAccount";

export const metadata: Metadata = { title: "Your account · PermitPike" };

export default function AccountPage() {
  return <ApplicantAccount />;
}
