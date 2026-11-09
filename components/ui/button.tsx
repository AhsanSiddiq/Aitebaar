import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-emerald text-white hover:bg-emerald-deep",
        outline: "border border-line bg-surface text-ink hover:bg-paper",
        ghost: "text-ink-70 hover:bg-paper hover:text-ink",
        danger: "bg-risk-alert text-white hover:opacity-90",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-11 px-5" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
