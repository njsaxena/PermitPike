import { notFound } from "next/navigation";
import { loadPortalExamples } from "../library";
import { PortalPermit } from "./PortalPermit";

export function generateStaticParams() {
  return loadPortalExamples().map((e) => ({ slug: e.slug }));
}

export default async function PortalPermitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const example = loadPortalExamples().find((e) => e.slug === slug);
  if (!example) notFound();
  return <PortalPermit example={example} />;
}
