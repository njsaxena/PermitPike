import { ApplicantExample, exampleParams } from "./ApplicantExample";

export const metadata = { title: "Your permit · PermitPike" };
export const generateStaticParams = exampleParams;

export default async function ApplicantExamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ApplicantExample slug={slug} justFiled={false} />;
}
