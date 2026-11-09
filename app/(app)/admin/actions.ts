"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth";
import { seedDemo } from "@/lib/db/seed";

/**
 * Admin "reset demo" (§15): wipes and reseeds Demo Lender Ltd so a pilot can
 * be re-run cleanly. Tenant and user ids are stable, so sessions stay valid.
 */
export async function resetDemo(): Promise<{ ok: true; borrowers: number } | { ok: false; error: string }> {
  try {
    await requirePermission("admin.resetDemo");
    const r = await seedDemo(prisma);
    revalidatePath("/", "layout");
    return { ok: true, borrowers: r.borrowers };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reset failed" };
  }
}
