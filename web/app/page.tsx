import { HardHat, Landmark } from "lucide-react";
import { RoleChoiceCard } from "@/components/ui";

/** Entry screen. People pick a side here and stay on it; "Leave" brings them back. */
export default function EntryPage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      {/* The sentence is the title: the wordmark is already in the header, and no subtitle. */}
      <h1 className="max-w-3xl text-display text-ink">
        Boston electrical permits, checked against the code before an official signs.
      </h1>
      <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
        <RoleChoiceCard icon={HardHat} label="I'm filing a permit" drawing="triple-decker" href="/apply" />
        <RoleChoiceCard icon={Landmark} label="I'm reviewing permits" drawing="city-hall" href="/review" />
      </div>
    </div>
  );
}
