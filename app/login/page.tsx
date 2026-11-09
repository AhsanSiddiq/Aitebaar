import { LoginForm } from "./login-form";
import { LogoMark } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-emerald-deep p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <div className="font-display text-xl font-semibold">Aitebaar</div>
            <div className="text-sm text-white/60" lang="ur">اعتبار</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">Know your borrower&apos;s risk — before it&apos;s too late.</h1>
          <p className="mt-4 text-white/70">
            SBP-native credit origination, analysis and monitoring for Pakistani lenders. ICRR ratings, R-8 classification, IFRS 9 staging and early-warning signals in one workbench.
          </p>
        </div>
        <div className="text-xs text-white/40">Incubated at NIC · Pilot build</div>
        <svg className="pointer-events-none absolute -right-24 -bottom-24 size-[420px] opacity-[0.07]" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="15" fill="none" stroke="#C9A227" strokeWidth="0.6" />
          <circle cx="16" cy="16" r="11" fill="none" stroke="#fff" strokeWidth="0.4" />
        </svg>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-9" />
            <span className="font-display text-xl font-semibold">Aitebaar</span>
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-ink-50">Demo Lender Ltd · pick a role to explore</p>
          <div className="mt-3"><DemoBadge /></div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
