import { NextRequest, NextResponse } from "next/server";
import { normalizeAuthEmail } from "@/lib/server/auth-user";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const email = normalizeAuthEmail(payload?.email);
  if (!email) {
    return NextResponse.json({ message: "Email invalide." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Si un compte existe pour cet email, les instructions de reinitialisation seront envoyees.",
  });
}
