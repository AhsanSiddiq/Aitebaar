import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ROLE_LABELS } from "@/lib/domain";
import { AppNav } from "@/components/app-nav";
import { Wordmark, LogoMark } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [openAlerts, pendingApprovals] = await Promise.all([
    prisma.alert.count({ where: { lenderId: user.lenderId, status: "OPEN" } }),
    prisma.listingLink.count({ where: { lenderId: user.lenderId, status: "PENDING" } }),
  ]);
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-emerald-deep px-3 py-5 lg:flex">
        <Link href="/" className="px-2">
          <Wordmark />
        </Link>
        <div className="mt-8">
          <AppNav variant="side" isAdmin={isAdmin} openAlerts={openAlerts} pendingApprovals={pendingApprovals} />
        </div>
        <div className="mt-auto rounded-lg bg-white/5 px-3 py-3 text-xs text-white/60">
          <div className="font-medium text-white/85">{user.lenderName}</div>
          <div className="mt-0.5">Single tenant view · SBP PRs</div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="lg:hidden">
              <LogoMark className="size-7" />
            </Link>
            <DemoBadge />
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="hidden text-xs text-ink-50 sm:block">{ROLE_LABELS[user.role]}</div>
              </div>
              <SignOutButton />
            </div>
          </div>
          <div className="border-t border-line px-2 py-1.5 lg:hidden">
            <AppNav variant="top" isAdmin={isAdmin} openAlerts={openAlerts} pendingApprovals={pendingApprovals} />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
