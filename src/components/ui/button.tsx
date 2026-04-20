import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium tracking-[-0.005em] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Primary: solid ink — main action */
        default: "bg-text text-[hsl(var(--text-inverse))] hover:bg-[#1f2128]",
        /* Destructive: red */
        destructive:
          "bg-status-red text-white hover:bg-status-red/90",
        /* Outline: surface + border — secondary actions */
        outline:
          "border border-border bg-surface text-text hover:bg-bg-subtle",
        /* Secondary: subtle chip */
        secondary:
          "bg-bg-subtle text-text border border-border hover:bg-bg-muted",
        /* Ghost: invisible until hover */
        ghost: "text-text-muted hover:bg-bg-subtle hover:text-text",
        /* Link: accent underline */
        link: "text-accent-text underline underline-offset-4 decoration-accent decoration-1 hover:text-accent",
        /* Accent: Linear indigo — primary-colored action */
        accent:
          "bg-accent text-[hsl(var(--accent-foreground))] hover:bg-accent-hover",
        /* Turquoise: legacy alias → maps to accent */
        turquoise:
          "bg-accent text-[hsl(var(--accent-foreground))] hover:bg-accent-hover",
        /* Soft: accent-tinted subtle chip */
        soft: "bg-accent-soft text-accent-text border border-transparent hover:bg-accent-soft/80",
      },
      size: {
        /* Linear sizes — md=30, sm=26, lg=36 (primitives.jsx:23) */
        default: "h-[30px] px-3 py-1 text-[13px]",
        sm: "h-[26px] px-2 text-[12px]",
        lg: "h-[36px] px-4 text-[13px]",
        icon: "h-[30px] w-[30px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
