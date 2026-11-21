import { ApplicantStatus } from "@/components/apply/ApplicantStatus";

export default async function ApplicantStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filed?: string }>;
}) {
  const [{ id }, { filed }] = await Promise.all([params, searchParams]);
  return <ApplicantStatus id={id} justFiled={filed === "1"} />;
}
