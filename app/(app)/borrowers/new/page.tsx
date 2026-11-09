import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { NewBorrowerForm } from "./new-borrower-form";

export default async function NewBorrowerPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-50 hover:text-ink">
          <ChevronLeft className="size-4" /> Portfolio
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add borrower</h1>
        <p className="mt-1 text-sm text-ink-50">Start typing and Aitebaar checks the PSX listing for you.</p>
      </div>
      <Card>
        <CardContent className="py-5">
          {can(user.role, "borrower.create") ? <NewBorrowerForm /> : <p className="text-sm text-ink-70">Only RMs and Analysts can add borrowers.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
