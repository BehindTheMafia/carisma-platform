import { type LucideIcon, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="border-dashed border-border/70">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-7" />
          </div>
          <h2 className="text-lg font-semibold">Módulo en preparación</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Este módulo es parte del plan de implementación de TM RENT A CAR. Se entregará completo en las próximas fases junto con todas sus operaciones CRUD.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}