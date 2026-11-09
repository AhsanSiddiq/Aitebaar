import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-ink-50">That page or borrower is not in your book.</p>
      <Link href="/" className="mt-2 text-sm font-medium text-emerald hover:underline">Back to portfolio</Link>
    </main>
  );
}
