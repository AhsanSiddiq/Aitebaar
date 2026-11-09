import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      clear: "bg-risk-clear-bg text-risk-clear",
      watch: "bg-risk-watch-bg text-risk-watch-ink",
      alert: "bg-risk-alert-bg text-risk-alert",
      neutral: "bg-paper text-ink-70 ring-1 ring-inset ring-line",
      brand: "bg-emerald-50 text-emerald",
      gold: "bg-[#f8f0d4] text-[#7a6114]",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
