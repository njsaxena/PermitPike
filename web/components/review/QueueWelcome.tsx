import type { ReactNode } from "react";

/** The queue's title: who is signed in and how much is waiting on them. */
export function QueueWelcome({ name, waiting, children }: { name: string; waiting: number; children?: ReactNode }) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title text-ink">Welcome back, {first}.</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-lg text-ink">
          {waiting === 0 ? (
            "Nothing is waiting for your review."
          ) : (
            <>
              There {waiting === 1 ? "is" : "are"}{" "}
              <strong className="font-semibold">
                {waiting} {waiting === 1 ? "permit" : "permits"}
              </strong>{" "}
              waiting for your review.
            </>
          )}
        </p>
        {children}
      </div>
    </div>
  );
}
