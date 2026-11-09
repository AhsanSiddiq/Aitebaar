"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { SECTORS } from "@/lib/domain";
import { normalizeName, scoreMatch } from "@/lib/psx/fuzzy";
import { searchPsx } from "@/lib/psx/search";
import { getPsxSource } from "@/lib/integrations/psx";
import { syncCompany } from "@/lib/psx/sync";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sector: z.enum(SECTORS),
  symbol: z.string().trim().toUpperCase().max(12).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
});

/** Score server-side; never trust a score sent by the browser. */
async function proposeLink(lenderId: string, borrowerId: string, borrowerName: string, symbol: string, user: { id: string; name: string }) {
  const sym = await prisma.psxSymbol.findUnique({ where: { symbol } });
  if (!sym) throw new Error(`Unknown PSX symbol ${symbol}`);
  const m = scoreMatch(borrowerName, sym) ?? { score: 0, matchType: "MANUAL" };
  await prisma.listingLink.updateMany({ where: { borrowerId, status: "PENDING" }, data: { status: "REJECTED", decisionNote: "Superseded by a newer proposal", decidedAt: new Date() } });
  const link = await prisma.listingLink.create({
    data: { lenderId, borrowerId, symbol, matchScore: m.score, matchType: m.matchType, requestedBy: user.name, requestedById: user.id },
  });
  await prisma.auditLog.create({ data: { lenderId, actor: user.name, action: "LISTING_PROPOSED", entity: "ListingLink", entityId: link.id, after: JSON.stringify({ symbol, score: m.score }) } });
  return link;
}

export async function createBorrower(_: unknown, form: FormData): Promise<{ error?: string }> {
  const user = await requirePermission("borrower.create");
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please give a company name (2+ characters) and a sector." };
  const { name, sector, description } = parsed.data;

  // Duplicate check on the normalised name ("Summit Cement Ltd" = "Summit Cement Limited").
  const existing = await prisma.borrower.findMany({ where: { lenderId: user.lenderId }, select: { name: true } });
  const dup = existing.find((e) => normalizeName(e.name) === normalizeName(name));
  if (dup) return { error: `${dup.name} is already in your book.` };
  let symbol = parsed.data.symbol || "";

  // Detect a listing even if the user didn't pick one: auto-propose only a high-confidence match.
  let autoDetected = false;
  if (!symbol && form.get("noMatch") !== "on") {
    const [top] = await searchPsx(name, 1);
    if (top && top.score >= 0.9) {
      symbol = top.candidate.symbol;
      autoDetected = true;
    }
  }

  const b = await prisma.borrower.create({
    data: { lenderId: user.lenderId, ownerId: user.role === "RM" ? user.id : null, name, sector, description: description || null, listed: false, financialsSource: "UPLOAD" },
  });
  await prisma.auditLog.create({ data: { lenderId: user.lenderId, actor: user.name, action: "BORROWER_CREATED", entity: "Borrower", entityId: b.id, after: JSON.stringify({ name, sector, autoDetected }) } });
  if (symbol) await proposeLink(user.lenderId, b.id, name, symbol, user);
  revalidatePath("/", "layout");
  redirect(`/borrowers/${b.id}`);
}

export async function proposeListing(borrowerId: string, symbol: string): Promise<{ error?: string }> {
  const user = await requirePermission("listing.propose");
  const b = await prisma.borrower.findFirst({ where: { id: borrowerId, lenderId: user.lenderId } });
  if (!b) return { error: "Borrower not found" };
  if (!symbol) return { error: "Pick a PSX symbol" };
  try {
    await proposeLink(user.lenderId, b.id, b.name, symbol.toUpperCase(), user);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not propose link" };
  }
  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/approvals");
  return {};
}

export async function decideListing(linkId: string, decision: "APPROVED" | "REJECTED", note: string): Promise<{ error?: string; message?: string }> {
  const user = await requirePermission("listing.approve");
  const link = await prisma.listingLink.findFirst({ where: { id: linkId, lenderId: user.lenderId, status: "PENDING" }, include: { borrower: true } });
  if (!link) return { error: "This request is no longer pending." };
  if (link.requestedById === user.id) return { error: "Maker-checker: you cannot approve your own proposal." };
  if (decision === "REJECTED" && !note.trim()) return { error: "Give a reason for rejecting." };

  await prisma.listingLink.update({ where: { id: link.id }, data: { status: decision, decidedBy: user.name, decidedAt: new Date(), decisionNote: note.trim() || null } });
  await prisma.auditLog.create({
    data: { lenderId: user.lenderId, actor: user.name, action: `LISTING_${decision}`, entity: "ListingLink", entityId: link.id, before: JSON.stringify({ ticker: link.borrower.ticker, listed: link.borrower.listed }), after: JSON.stringify({ symbol: link.symbol }) },
  });

  let message: string | undefined;
  if (decision === "APPROVED") {
    // Listed borrower: financials come from PSX, so the client isn't asked for statements.
    await prisma.borrower.update({ where: { id: link.borrowerId }, data: { listed: true, ticker: link.symbol, financialsSource: "PSX" } });
    try {
      const r = await syncCompany(prisma, getPsxSource(), link.symbol, user.email);
      message = `Linked to ${link.symbol}. Pulled ${r.statements} year(s) of PSX financials and ${r.events} announcement(s).`;
    } catch (e) {
      message = `Linked to ${link.symbol}. PSX data could not be fetched yet (${e instanceof Error ? e.message : "error"}); it will load on the next sync.`;
    }
  }
  revalidatePath("/", "layout");
  return { message };
}
