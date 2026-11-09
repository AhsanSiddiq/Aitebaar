import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { getPsxSource } from "@/lib/integrations/psx";
import { syncCompany, syncLinkedCompanies, syncSymbols } from "@/lib/psx/sync";

const body = z.object({ kind: z.enum(["symbols", "company", "linked"]), symbol: z.string().optional() });

/** POST /api/psx/sync { kind: "symbols" | "company" | "linked", symbol? } — Admin only. */
export async function POST(req: Request) {
  const user = await apiUser("admin.psxSync");
  if (user instanceof NextResponse) return user;
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const src = getPsxSource();
  try {
    const { kind, symbol } = parsed.data;
    const result =
      kind === "symbols" ? await syncSymbols(prisma, src, user.email)
      : kind === "company" ? await syncCompany(prisma, src, (symbol ?? "").toUpperCase(), user.email)
      : await syncLinkedCompanies(prisma, src, user.email);
    return NextResponse.json({ source: src.source, result });
  } catch (e) {
    return NextResponse.json({ source: src.source, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
