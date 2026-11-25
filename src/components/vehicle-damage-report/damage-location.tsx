import { MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { UseFormReturn } from "react-hook-form";
import type { VehicleDamageFormValues } from "./schema";
import type { ZonaDanio } from "./types";
import { ZONAS_DANIO, ZONA_LABEL } from "./types";
import { getVehicleImageUrl } from "./vehicle-image";
import { Section } from "./section";

interface Props {
  form: UseFormReturn<VehicleDamageFormValues>;
}

interface ZoneDef {
  zone: ZonaDanio;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Coordenadas calculadas exactamente para las 5 vistas de la imagen de inspección (aspect ratio 400x200):
// 1. VISTA FRONTAL (arriba a la izquierda): delantera
// 2. VISTA SUPERIOR (centro a lo largo): interior / techo / cabina
// 3. VISTA TRASERA (arriba a la derecha): trasera
// 4. VISTA LATERAL IZQUIERDA (abajo a la izquierda): izquierda
// 5. VISTA LATERAL DERECHA (abajo a la derecha): derecha
const ZONE_AREAS: ZoneDef[] = [
  { zone: "delantera", x: 45, y: 28, w: 90, h: 80 },
  { zone: "trasera", x: 265, y: 28, w: 90, h: 80 },
  { zone: "interior", x: 162, y: 28, w: 76, h: 144 },
  { zone: "izquierda", x: 30, y: 114, w: 120, h: 58 },
  { zone: "derecha", x: 250, y: 114, w: 120, h: 58 },
];

function VehicleDiagram({
  imageUrl,
  selected,
  onToggle,
}: {
  imageUrl: string;
  selected: ZonaDanio[];
  onToggle: (z: ZonaDanio) => void;
}) {
  const isSel = (z: ZonaDanio) => selected.includes(z);

  return (
    <div className="w-full rounded-lg border border-border bg-muted/20 p-4">
      <div className="relative w-full overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt="Diagrama del vehículo"
          className="w-full select-none"
          draggable={false}
        />
        <svg
          viewBox="0 0 400 200"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          {ZONE_AREAS.map((a) => {
            const active = isSel(a.zone);
            return (
              <g key={a.zone} className="cursor-pointer" onClick={() => onToggle(a.zone)}>
                <rect
                  x={a.x}
                  y={a.y}
                  width={a.w}
                  height={a.h}
                  rx="6"
                  fill={active ? "rgba(37,99,235,0.22)" : "rgba(0,0,0,0.01)"}
                  stroke={active ? "#2563EB" : "rgba(37,99,235,0.3)"}
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={active ? "none" : "3,3"}
                  className="transition-all hover:fill-blue-500/20 hover:stroke-blue-600"
                />
                {active && (
                  <text
                    x={a.x + a.w / 2}
                    y={a.y + a.h / 2 + 3}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#1E40AF"
                    fontWeight="bold"
                    className="pointer-events-none select-none drop-shadow-xs"
                  >
                    {ZONA_LABEL[a.zone]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Haz clic en la zona del vehículo para marcarla / desmarcarla
      </p>
    </div>
  );
}

export function DamageLocation({ form }: Props) {
  const zonas = form.watch("zonas") ?? [];
  const tipo = form.watch("vehiculo.tipoVehiculo");

  const toggle = (z: ZonaDanio) => {
    const current = [...zonas];
    if (current.includes(z)) {
      form.setValue(
        "zonas",
        current.filter((x) => x !== z),
        { shouldDirty: true },
      );
    } else {
      form.setValue("zonas", [...current, z], { shouldDirty: true });
    }
  };

  return (
    <Section
      icon={MapPin}
      title="Ubicación del Daño"
      subtitle="Selecciona dónde se encuentra el daño en el vehículo"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ZONAS_DANIO.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs text-foreground transition-colors hover:border-primary/40"
            >
              <Checkbox checked={zonas.includes(value)} onCheckedChange={() => toggle(value)} />
              {label}
            </label>
          ))}
        </div>
        <VehicleDiagram imageUrl={getVehicleImageUrl(tipo)} selected={zonas} onToggle={toggle} />
      </div>
    </Section>
  );
}
