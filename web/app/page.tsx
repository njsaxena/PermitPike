import { HardHat, Landmark } from "lucide-react";
import { RoleChoiceCard } from "@/components/ui";

/** Entry screen. People pick a side here and stay on it; "Leave" brings them back. */
export default function EntryPage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-display tracking-tight text-ink">PermitPike</h1>
        <p className="text-lg text-ink">
          Boston residential electrical permits, checked against the code before an official signs.
        </p>
      </div>
      <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
        <RoleChoiceCard icon={HardHat} label="I'm filing a permit" drawing="triple-decker" href="/apply" />
        <RoleChoiceCard icon={Landmark} label="I'm reviewing permits" drawing="city-hall" href="/review" />
      </div>
    </div>
  );
}
