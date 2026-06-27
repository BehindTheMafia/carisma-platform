import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, variant = "light", size = "md" }: BrandLogoProps) {
  const iconSize = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";
  const textSize = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-md",
          size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-8",
          variant === "light"
            ? "bg-gradient-to-br from-primary to-[oklch(0.35_0.16_250)] text-primary-foreground"
            : "bg-gradient-to-br from-gold to-[oklch(0.55_0.1_75)] text-gold-foreground",
        )}
      >
        <Car className={iconSize} strokeWidth={2.4} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-tight", textSize)}>
          TM <span className="text-gold">RENT</span>
        </span>
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.18em] opacity-70">
          A Car
        </span>
      </div>
    </div>
  );
}