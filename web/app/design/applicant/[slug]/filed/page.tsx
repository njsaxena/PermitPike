import { ApplicantExample, exampleParams } from "../ApplicantExample";

export const metadata = { title: "Permit filed · PermitPike" };
export const generateStaticParams = exampleParams;

/** Straight after filing an example: the same permit, leading with the tracking code. */
export default async function ApplicantExampleFiledPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ApplicantExample slug={slug} justFiled />;
}
