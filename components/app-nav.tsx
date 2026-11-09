"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CheckSquare, FileUp, LayoutDashboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Portfolio", icon: LayoutDashboard, match: (p: string) => p === "/" || p.startsWith("/borrowers") },
  { href: "/alerts", label: "Alerts", icon: Bell, match: (p: string) => p.startsWith("/alerts") },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, match: (p: string) => p.startsWith("/approvals") },
  { href: "/upload", label: "Upload financials", icon: FileUp, match: (p: string) => p.startsWith("/upload") },
  { href: "/admin", label: "Admin", icon: Settings2, match: (p: string) => p.startsWith("/admin"), adminOnly: true },
];

export function AppNav({ isAdmin, openAlerts, pendingApprovals = 0, variant }: { isAdmin: boolean; openAlerts: number; pendingApprovals?: number; variant: "side" | "top" }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav className={variant === "side" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto"}>
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
              variant === "side"
                ? active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                : active ? "bg-emerald-50 text-emerald-deep" : "text-ink-70 hover:bg-paper",
            )}
          >
            <Icon className="size-4" />
            {label}
            {href === "/approvals" && pendingApprovals > 0 && (
              <span className="num ml-auto rounded-full bg-gold px-1.5 text-[11px] font-semibold text-ink">{pendingApprovals}</span>
            )}
            {href === "/alerts" && openAlerts > 0 && (
              <span className="num ml-auto rounded-full bg-risk-alert px-1.5 text-[11px] font-semibold text-white">{openAlerts}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
