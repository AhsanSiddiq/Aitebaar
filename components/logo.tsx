/** Aitebaar mark: a trust seal — emerald shield with a gold ring. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#013D2B" />
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#C9A227" strokeWidth="1.2" />
      <path d="M16 8.5 L22 11 V16 C22 19.6 19.4 22.3 16 23.5 C12.6 22.3 10 19.6 10 16 V11 Z" fill="#046A38" />
      <path d="M13.2 16.1 L15.3 18.2 L19 14" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[17px] font-semibold tracking-tight text-white">Aitebaar</span>
        <span className="block text-[11px] text-white/60" lang="ur">اعتبار</span>
      </span>
    </span>
  );
}
