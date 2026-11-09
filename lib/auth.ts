import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ROLES, type Role } from "@/lib/domain";
import { can, type Permission } from "@/lib/rbac";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { lender: true } });
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        const role = z.enum(ROLES).parse(user.role);
        return { id: user.id, name: user.name, email: user.email, role, lenderId: user.lenderId, lenderName: user.lender.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.lenderId = user.lenderId;
        token.lenderName = user.lenderName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.uid,
        name: token.name ?? "",
        email: token.email ?? "",
        role: token.role,
        lenderId: token.lenderId,
        lenderName: token.lenderName,
      };
      return session;
    },
  },
};

export type SessionUser = { id: string; name: string; email: string; role: Role; lenderId: string; lenderName: string };

/** Current user or redirect to login. Every tenant query must use `user.lenderId`. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.lenderId) redirect("/login");
  return session.user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new Error(`Forbidden: ${user.role} cannot ${permission}`);
  return user;
}
