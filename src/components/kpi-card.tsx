import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "gold" | "info";
}

const TONES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
  gold: "bg-gold/15 text-gold",
  info: "bg-info/12 text-info",
};

export function KpiCard({ label, value, icon: Icon, hint, tone = "default" }: KpiCardProps) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-card)]">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
      </CardContent>
    </Card>
  );
}