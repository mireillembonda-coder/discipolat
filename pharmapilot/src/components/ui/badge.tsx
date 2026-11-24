import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-50 text-emerald-800",
        warning: "border-transparent bg-amber-50 text-amber-800",
        serious: "border-transparent bg-orange-50 text-orange-800",
        destructive: "border-transparent bg-red-50 text-red-700",
        info: "border-transparent bg-blue-50 text-blue-800",
        pending: "border-dashed border-slate-300 bg-slate-50 text-slate-600",
        demo: "border-transparent bg-amber-100 text-amber-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
