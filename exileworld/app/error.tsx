"use client";

import { Button } from "@/components/ui/button";

export default function AtlasError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs tracking-[0.22em] text-primary uppercase">
          Shared atlas
        </p>
        <h1 className="mt-3 font-heading text-4xl">The map did not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The shared atlas hit a problem while rendering. The pins already
          saved on the server are still there.
        </p>
        <Button className="mt-6 h-10 px-4" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
