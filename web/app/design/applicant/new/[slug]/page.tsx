import { notFound } from "next/navigation";
import { JobType } from "@permitpike/contract";
import { exampleInitial } from "@/lib/example-filing";
import { loadPortalExamples } from "../../../portal/library";
import { DemoFiling } from "./DemoFiling";

export const metadata = { title: "File a permit · PermitPike" };

export function generateStaticParams() {
  return [
    ...loadPortalExamples().map((e) => ({ slug: e.slug })),
    ...JobType.options.map((job) => ({ slug: `own-${job}` })),
  ];
}

/** The filing form in the demo: filled in from an example, or empty for your own job. */
export default async function DemoFilingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug.startsWith("own-")) {
    const job = JobType.safeParse(slug.slice(4));
    if (!job.success) notFound();
    return <DemoFiling initial={{ jobType: job.data }} />;
  }
  const example = loadPortalExamples().find((e) => e.slug === slug);
  if (!example) notFound();
  return <DemoFiling initial={exampleInitial(example)} example={{ slug, title: example.title }} />;
}
