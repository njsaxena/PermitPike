import { ApplicantStatus } from "@/components/apply/ApplicantStatus";

export default async function ApplicantStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicantStatus id={id} />;
}
