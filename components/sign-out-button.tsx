"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md p-1.5 text-ink-50 hover:bg-paper hover:text-ink" title="Sign out">
      <LogOut className="size-4" />
      <span className="sr-only">Sign out</span>
    </button>
  );
}
