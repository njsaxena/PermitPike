import { HomeActions } from "@/components/home/HomeActions";

/** Entry screen: file a permit, open the staff portal, or check a permit with its tracking code. */
export default function EntryPage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      {/* The sentence is the title: the wordmark is already in the header, and no subtitle. */}
      <h1 className="max-w-3xl text-display text-ink">
        Boston electrical permits, checked against the code before an official signs.
      </h1>
      <HomeActions />
    </div>
  );
}
