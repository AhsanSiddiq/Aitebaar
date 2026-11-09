import type { Role } from "@/lib/domain";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string; role: Role; lenderId: string; lenderName: string };
  }
  interface User {
    id: string;
    role: Role;
    lenderId: string;
    lenderName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    lenderId: string;
    lenderName: string;
  }
}
