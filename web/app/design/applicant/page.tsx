import { Plus } from "lucide-react";
import { ButtonLink, PermitCard } from "@/components/ui";
import { toSummary } from "@/lib/summary";
import { DEMO_APPLICANT } from "../portal/demo-official";
import { loadPortalExamples } from "../portal/library";

export const metadata = { title: "Your permits · PermitPike" };

/** The electrician's home in the applicant demo: their permits, and filing a new one. */
export default function ApplicantHomePage() {
  const examples = loadPortalExamples();
  const permits = examples.map((e) => ({ slug: e.slug, permit: toSummary(e.detail.application) }));
  const waiting = permits.filter((p) => p.permit.status === "awaiting_official").length;
  const first = DEMO_APPLICANT.split(" ")[0];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title text-ink">Welcome back, {first}.</h1>
          <p className="text-lg text-ink">
            {waiting === 0 ? (
              "Nothing is waiting on the city."
            ) : (
              <>
                <strong className="font-semibold">
                  {waiting} {waiting === 1 ? "permit is" : "permits are"}
                </strong>{" "}
                waiting on the city.
              </>
            )}
          </p>
        </div>
        <ButtonLink href="/design/applicant/new" icon={<Plus aria-hidden className="size-4" strokeWidth={1.75} />}>
          File a permit
        </ButtonLink>
      </div>
      <section aria-labelledby="your-permits" className="flex flex-col gap-4">
        <h2 id="your-permits" className="text-lg text-ink">
          Your permits
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {permits.map((p) => (
            <li key={p.slug}>
              <PermitCard permit={p.permit} href={`/design/applicant/${p.slug}`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
