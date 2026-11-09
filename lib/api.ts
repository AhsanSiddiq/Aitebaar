import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, type SessionUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";

/** Route-handler guard: returns the user, or a 401/403 response. */
export async function apiUser(permission?: Permission): Promise<SessionUser | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.lenderId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (permission && !can(session.user.role, permission)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return session.user;
}
