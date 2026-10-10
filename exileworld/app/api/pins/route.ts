import { addPin, readPins } from "@/lib/pin-store";
import { parsePinInput } from "@/lib/pins";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pins = await readPins();
    return Response.json(
      { pins },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "The atlas could not be read." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "That pin could not be read." },
      { status: 400 },
    );
  }

  const parsed = parsePinInput(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const pin = await addPin(parsed.value);
    return Response.json(
      { pin },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "The atlas is full."
        ? "The atlas is full for now. Five hundred homes are already marked."
        : "The pin could not be saved.";
    const status = message.startsWith("The atlas is full") ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
