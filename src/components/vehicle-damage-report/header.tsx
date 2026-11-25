import { DEFAULT_COMPANY_INFO, type CompanyInfo } from "./types";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

interface HeaderProps {
  fecha?: string;
  hora?: string;
  onFechaChange?: (v: string) => void;
  onHoraChange?: (v: string) => void;
  companyInfo?: CompanyInfo | null;
}

export function Header({ fecha, hora, onFechaChange, onHoraChange, companyInfo }: HeaderProps) {
  const company = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      {/* Información de la Empresa de Rent a Car */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-4">
        <div className="flex items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-primary/10 p-2">
            <img
              src={company.logo_url || "/logorent.png"}
              alt={company.nombre}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {company.nombre}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {company.ruc && (
                <span className="bg-muted px-2 py-0.5 rounded font-mono font-medium text-foreground text-[11px]">
                  RUC: {company.ruc}
                </span>
              )}
              {company.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-muted-foreground" />
                  {company.telefono}
                </span>
              )}
              {company.correo && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground" />
                  {company.correo}
                </span>
              )}
            </div>
            {company.direccion && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                <span>{company.direccion}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Título del Informe y Controles de Fecha/Hora */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Informe de Daños <span className="text-orange-500">del Vehículo</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Acta de constancia de inspección y estado físico del vehículo
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-64 sm:flex-1">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => onFechaChange?.(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hora
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => onHoraChange?.(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
