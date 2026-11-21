"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JOB_TYPE_LABELS } from "@permitpike/contract";
import { ButtonLink, Callout } from "@/components/ui";
import { PermitForm, type FiledPermit, type PermitFormInitial } from "@/components/apply/PermitForm";
import { streetLine } from "@/lib/format";

/*
 * The filing form in the applicant demo. Filing an example goes on to that example's
 * permit, already checked. Filing your own job shows what you filed: nothing is uploaded
 * or checked in the demo. Both results are in the markup so the static copy on the design
 * artifact works without React (it fills in the [data-own-value] spots itself).
 */
export function DemoFiling({
  initial,
  example,
}: {
  initial: PermitFormInitial;
  example?: { slug: string; title: string };
}) {
  const router = useRouter();
  const [filed, setFiled] = useState<FiledPermit | null>(null);
  const next = example ? `/design/applicant/${example.slug}/filed` : "";

  return (
    <>
      <div hidden={filed !== null} data-own-form>
        <PermitForm
          initial={initial}
          lookupProperty={false}
          demoNext={next}
          intro={
            example ? (
              <p className="text-sm text-muted">
                Filled in from the example <span className="font-semibold text-ink">{example.title}</span>, with its
                documents attached. Change anything before you file.
              </p>
            ) : (
              <p className="text-sm text-muted">Example form. Nothing you enter leaves this page.</p>
            )
          }
          onFile={async (permit) => {
            if (example) router.push(next);
            else setFiled(permit);
          }}
        />
      </div>
      {!example && <OwnFiled permit={filed} />}
    </>
  );
}

function OwnFiled({ permit }: { permit: FiledPermit | null }) {
  const docs = permit?.files.map((f) => f.chip.name) ?? [];
  return (
    <section data-own-filed hidden={permit === null} aria-labelledby="own-filed" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 id="own-filed" className="text-title text-ink" data-own-value="street">
          {permit ? streetLine(permit.address) : ""}
        </h1>
        <p className="text-sm text-muted">
          <span data-own-value="job">{permit ? JOB_TYPE_LABELS[permit.jobType] : ""}</span> ·{" "}
          <span data-own-value="zip">{permit?.address.zip}</span>
        </p>
      </div>
      <Callout title="Filed, as an example">
        In this demo nothing is uploaded and PermitPike doesn&apos;t check your documents. On the real site you get a
        tracking code straight away, and PermitPike reads your documents and runs the checks within a couple of
        minutes, before a building official reviews it.
      </Callout>
      <dl className="grid max-w-2xl gap-x-6 border-t border-ink sm:grid-cols-[12rem_minmax(0,1fr)]">
        <dt className="border-b border-border py-2.5 text-sm text-muted">Estimated cost</dt>
        <dd className="border-b border-border py-2.5 font-semibold text-ink" data-own-value="cost">
          {permit ? `$${permit.estimatedProjectCost.toLocaleString("en-US")}` : ""}
        </dd>
        <dt className="border-b border-border py-2.5 text-sm text-muted">Job description</dt>
        <dd className="border-b border-border py-2.5 text-ink" data-own-value="description">
          {permit?.jobDescription || "None"}
        </dd>
        <dt className="border-b border-border py-2.5 text-sm text-muted">Documents</dt>
        <dd className="border-b border-border py-2.5 font-semibold text-ink" data-own-value="documents">
          {docs.join(", ")}
        </dd>
      </dl>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/design/applicant/heat-pump-service-upgrade">See a permit PermitPike checked</ButtonLink>
        <ButtonLink href="/design/applicant/new" variant="secondary">
          File another
        </ButtonLink>
      </div>
    </section>
  );
}
