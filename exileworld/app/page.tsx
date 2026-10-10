import { connection } from "next/server";

import { Atlas } from "@/components/atlas";
import { readPins } from "@/lib/pin-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connection();
  const pins = await readPins().catch(() => null);

  if (pins === null) {
    return (
      <main className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs tracking-[0.22em] text-primary uppercase">
            Shared atlas
          </p>
          <h1 className="mt-3 font-heading text-4xl text-foreground">
            The atlas could not be opened
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Exile World keeps every home in one database on Cloudflare. That
            database could not be read. Reload the page in a moment.
          </p>
        </div>
      </main>
    );
  }

  return <Atlas initialPins={pins} />;
}
