import {
  Calendar,
  User,
  Car,
  MapPin,
  DollarSign,
  FileEdit,
  ShipWheel,
  Plus,
  X,
  Info,
} from "lucide-react";
import { INSPECTION_VEHICLE_TYPES, getInspectionVehicleType } from "@/lib/vehicle-types";
import { Combobox } from "@/components/ui/combobox";
import { ALL_ACCESORIOS, accesoriosFromArray, type AccesoriosMap } from "@/constants/accesorios";
import { calcularTotalConceptos, nuevoConceptoFactura, type ConceptoFactura } from "@/lib/factura-conceptos";
import { ConceptosFacturaForm } from "./ConceptosFacturaForm";

interface Vehiculo {
  id: number;
  name: string;
  model: string;
  days: number;
  price: number;
  color: string;
}

export interface CompanyData {
  NAME: string;
  EMAIL: string;
  PHONE: string;
  ADDRESS: string;
  RUC: string;
}

export interface FormData {
  facturaModo?: "renta" | "conceptos";
  monedaConceptos?: "USD" | "NIO";
  conceptosFactura?: ConceptoFactura[];
  fechaDoc: string;
  facturaNum: string;
  docNum: string;
  ciudad: string;
  cliente: string;
  ruc: string;
  correo: string;
  telefono: string;
  direccion: string;
  conductor: string;
  vehiculos: Vehiculo[];
  vehiculo: string;
  tipoVehiculo: string;
  modelo: string;
  transmision: string;
  placa: string;
  detalles: string;
  color: string;
  lugRec: string;
  lugDev: string;
  frec: string;
  fdev: string;
  hrec: string;
  hdev: string;
  dias: number;
  precio: number;
  deposito: number;
  hasOtrosServicios: boolean;
  choferDias: number;
  choferPrecio: number;
  viaticosDias: number;
  viaticosPrecio: number;
  hospedajeDias: number;
  hospedajePrecio: number;
  tasa: number;
  nota: string;
  obs: string;
  nivelCombustible: string;
  obsEntrega: string;
  accesorios: AccesoriosMap;
  sinFirma: boolean;
  sinNotaCredito: boolean;
  validezDias?: number;
  depositoLabel?: string;
  choferLabel?: string;
  viaticosLabel?: string;
  hospedajeLabel?: string;
  datosEmpresa?: CompanyData;
  emitidoEn?: string;
  emitidoPor?: string;
  emitidoPorNombre?: string;
}

interface AvailableVehicle {
  id: string;
  codigo: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  tipo_vehiculo: string | null;
  transmision: string | null;
  tarifa_diaria: number;
  accesorios: string[] | null;
}

interface AvailableClient {
  id: string;
  nombre: string;
  documento: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
}

interface ContratoFormProps {
  docType: string;
  formData: FormData;
  onChange: (name: string, value: unknown) => void;
  onVehiculosChange: (vehiculos: Vehiculo[]) => void;
  availableVehicles: AvailableVehicle[];
  availableClients: AvailableClient[];
}

export function ContratoForm({
  docType,
  formData,
  onChange,
  onVehiculosChange,
  availableVehicles,
  availableClients,
}: ContratoFormProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const addVehicle = () => {
    onVehiculosChange([
      ...formData.vehiculos,
      { id: Date.now(), name: "", model: "", days: 1, price: 0, color: "" },
    ]);
  };

  const removeVehicle = (id: number) => {
    onVehiculosChange(formData.vehiculos.filter((v) => v.id !== id));
  };

  const handleVehicleChange = (id: number, field: string, value: string | number) => {
    onVehiculosChange(formData.vehiculos.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const v = availableVehicles.find((v) => v.id === vehicleId);
    if (!v) return;

    onChange("vehiculo", `${v.marca} ${v.modelo}`);
    onChange("modelo", `${v.modelo} ${v.anio}`);
    onChange("tipoVehiculo", getInspectionVehicleType(v.tipo_vehiculo));
    const trans = v.transmision?.toLowerCase() || "";
    if (trans === "manual") onChange("transmision", "Manual");
    else if (trans === "automatica") onChange("transmision", "Automática");
    else onChange("transmision", "");
    onChange("placa", v.placa);
    onChange("detalles", v.color || "");
    onChange("color", v.color || "");
    onChange("precio", v.tarifa_diaria);
    if (v.accesorios) {
      onChange("accesorios", accesoriosFromArray(v.accesorios));
    }
  };

  const handleSelectClient = (clientId: string) => {
    const c = availableClients.find((c) => c.id === clientId);
    if (!c) return;

    onChange("cliente", c.nombre);
    onChange("ruc", c.documento);
    onChange("correo", c.correo || "");
    onChange("telefono", c.telefono || "");
    onChange("direccion", c.direccion || "");
    if (c.ciudad) {
      onChange("ciudad", c.ciudad);
    }
  };

  const handleSelectProformaVehicle = (id: number, vehicleId: string) => {
    const v = availableVehicles.find((v) => v.id === vehicleId);
    if (!v) return;
    onVehiculosChange(
      formData.vehiculos.map((veh) =>
        veh.id === id
          ? {
              ...veh,
              name: `${v.marca} ${v.modelo}`,
              model: `${v.modelo} ${v.anio}`,
              price: v.tarifa_diaria,
              color: v.color || "",
            }
          : veh,
      ),
    );
  };

  const isProforma = docType === "proforma";
  const isConceptos = docType === "factura" && formData.facturaModo === "conceptos";
  const conceptos = formData.conceptosFactura ?? [];
  const monedaConceptos = formData.monedaConceptos ?? "USD";

  let subtotal = 0;
  if (isConceptos) {
    subtotal = calcularTotalConceptos(conceptos);
  } else if (isProforma) {
    subtotal = formData.vehiculos.reduce(
      (acc, v) => acc + parseFloat(String(v.days || 0)) * parseFloat(String(v.price || 0)),
      0,
    );
  } else {
    subtotal = parseFloat(String(formData.dias || 0)) * parseFloat(String(formData.precio || 0));
  }

  let extraCost = 0;
  if (!isConceptos && formData.hasOtrosServicios) {
    extraCost +=
      (parseFloat(String(formData.choferDias)) || 0) *
      (parseFloat(String(formData.choferPrecio)) || 0);
    extraCost +=
      (parseFloat(String(formData.viaticosDias)) || 0) *
      (parseFloat(String(formData.viaticosPrecio)) || 0);
    extraCost +=
      (parseFloat(String(formData.hospedajeDias)) || 0) *
      (parseFloat(String(formData.hospedajePrecio)) || 0);
  }

  const tasa = parseFloat(String(formData.tasa)) || 0;
  const totalUSD = isConceptos && monedaConceptos === "NIO"
    ? (tasa > 0 ? subtotal / tasa : 0)
    : subtotal + (isConceptos ? 0 : (parseFloat(String(formData.deposito)) || 0) + extraCost);
  const totalNIO = isConceptos && monedaConceptos === "NIO" ? subtotal : totalUSD * tasa;

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-8">
      {docType === "factura" && (
        <section>
          <label htmlFor="factura-modo" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tipo de factura</label>
          <select
            id="factura-modo"
            value={formData.facturaModo ?? "renta"}
            onChange={(e) => {
              onChange("facturaModo", e.target.value);
              if (e.target.value === "conceptos" && conceptos.length === 0) onChange("conceptosFactura", [nuevoConceptoFactura()]);
            }}
            className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="renta">Renta de vehículo</option>
            <option value="conceptos">Factura por conceptos</option>
          </select>
          {isConceptos && (
            <div className="mt-3 space-y-1.5">
              <label htmlFor="moneda-conceptos" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moneda de los conceptos</label>
              <select id="moneda-conceptos" value={monedaConceptos} onChange={(e) => onChange("monedaConceptos", e.target.value)} className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm">
                <option value="USD">Dólares (USD)</option>
                <option value="NIO">Córdobas (C$)</option>
              </select>
              <p className="text-xs text-muted-foreground">Los precios se ingresan en la moneda seleccionada. Cambiarla no convierte los importes escritos.</p>
            </div>
          )}
        </section>
      )}
      {/* Datos del Documento */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
          <Calendar className="size-4" /> Datos del Documento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Fecha de Emisión
            </label>
            <input
              type="date"
              name="fechaDoc"
              value={formData.fechaDoc}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
            />
          </div>
          {!isConceptos && <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              N.º de Expediente
            </label>
            <input
              type="text"
              name="docNum"
              value={formData.docNum}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="0012"
            />
          </div>}
          {isProforma && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Validez de la Proforma (Días)
              </label>
              <input
                type="number"
                name="validezDias"
                value={formData.validezDias ?? 10}
                onChange={handleChange}
                min="1"
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="10"
              />
            </div>
          )}
          {docType === "factura" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                N.º de Factura *
              </label>
              <input
                type="text"
                name="facturaNum"
                value={formData.facturaNum}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="001-001"
              />
            </div>
          )}
          {docType === "contrato" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Ciudad del Contrato
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="Managua"
              />
            </div>
          )}
        </div>
      </section>

      {/* Datos del Cliente */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
          <User className="size-4" /> Datos del Cliente
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableClients && availableClients.length > 0 && (
            <div className="sm:col-span-2 bg-muted/30 p-3 rounded-lg border border-border/60 mb-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Buscar / Seleccionar Cliente del Sistema (opcional)
              </label>
              <Combobox
                options={availableClients.map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.documento})`,
                }))}
                value={availableClients.find((c) => c.nombre === formData.cliente)?.id}
                onSelect={handleSelectClient}
                placeholder="— Seleccionar cliente existente —"
                searchPlaceholder="Buscar por nombre o documento..."
                emptyText="No se encontró cliente"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="cliente"
              value={formData.cliente}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Cédula / RUC
            </label>
            <input
              type="text"
              name="ruc"
              value={formData.ruc}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="001-000000-0000X"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Teléfono
            </label>
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="+505 8888-0000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              placeholder="Dirección del cliente"
            />
          </div>
        </div>

        {docType === "contrato" && (
          <div className="mt-4 bg-muted/50 p-4 rounded-xl border border-border">
            <h3 className="text-xs font-bold text-foreground uppercase mb-3 flex items-center gap-1">
              <ShipWheel className="size-3.5" /> Datos del Conductor
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Persona que conducirá
                </label>
                <input
                  type="text"
                  name="conductor"
                  value={formData.conductor}
                  onChange={handleChange}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                  placeholder="Nombre del conductor"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Vehículos (PROFORMA MÚLTIPLE) */}
      {isProforma && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
            <Car className="size-4" /> Detalle de Vehículos
          </h2>
          <div className="space-y-3">
            {formData.vehiculos.map((v, index) => (
              <div key={v.id} className="bg-muted/50 border border-border rounded-xl p-4 relative">
                <h4 className="text-xs font-bold text-gold mb-3">Vehículo {index + 1}</h4>
                {formData.vehiculos.length > 1 && (
                  <button
                    onClick={() => removeVehicle(v.id)}
                    className="absolute top-3 right-3 text-destructive hover:text-destructive/80 bg-destructive/10 p-1 rounded-md"
                  >
                    <X className="size-4" />
                  </button>
                )}
                {availableVehicles && availableVehicles.length > 0 && (
                  <div className="sm:col-span-2 bg-muted/30 p-3 rounded-lg border border-border/60 mb-3">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Buscar / Seleccionar Vehículo del Sistema (opcional)
                    </label>
                    <Combobox
                      options={availableVehicles.map((av) => ({
                        value: av.id,
                        label: `${av.codigo} · ${av.placa} — ${av.marca} ${av.modelo} (${av.anio})`,
                      }))}
                      value={availableVehicles.find((av) => `${av.marca} ${av.modelo}` === v.name)?.id}
                      onSelect={(vehicleId) => handleSelectProformaVehicle(v.id, vehicleId)}
                      placeholder="— Seleccionar vehículo existente —"
                      searchPlaceholder="Buscar vehículo..."
                      emptyText="No se encontró vehículo"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Vehículo
                    </label>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleVehicleChange(v.id, "name", e.target.value)}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      placeholder="Ej. Toyota Hilux"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Modelo/Año
                    </label>
                    <input
                      type="text"
                      value={v.model}
                      onChange={(e) => handleVehicleChange(v.id, "model", e.target.value)}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Días
                    </label>
                    <input
                      type="number"
                      value={v.days}
                      onChange={(e) => handleVehicleChange(v.id, "days", e.target.value)}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Precio/Día ($)
                    </label>
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) => handleVehicleChange(v.id, "price", e.target.value)}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addVehicle}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-gold/60 text-gold rounded-xl font-bold text-sm hover:bg-gold/5 transition-colors flex justify-center items-center gap-2"
          >
            <Plus className="size-4" /> Agregar otro vehículo
          </button>
        </section>
      )}

      {/* Vehículo Único (NO PROFORMA) */}
      {!isProforma && !isConceptos && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
            <Car className="size-4" /> Datos del Vehículo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableVehicles && availableVehicles.length > 0 && (
              <div className="sm:col-span-2 bg-muted/30 p-3 rounded-lg border border-border/60 mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Buscar / Seleccionar Vehículo del Sistema (opcional)
                </label>
                <Combobox
                  options={availableVehicles.map((v) => ({
                    value: v.id,
                    label: `${v.codigo} · ${v.placa} — ${v.marca} ${v.modelo} (${v.anio})`,
                  }))}
                  value={availableVehicles.find((av) => `${av.marca} ${av.modelo}` === formData.vehiculo)?.id}
                  onSelect={handleSelectVehicle}
                  placeholder="— Seleccionar vehículo existente —"
                  searchPlaceholder="Buscar vehículo..."
                  emptyText="No se encontró vehículo"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Vehículo
              </label>
              <input
                type="text"
                name="vehiculo"
                value={formData.vehiculo}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="Toyota Hilux 4x4"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Modelo / Año
              </label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="2024"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Tipo de Vehículo
              </label>
              <select
                name="tipoVehiculo"
                value={formData.tipoVehiculo}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              >
                {INSPECTION_VEHICLE_TYPES.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Transmisión
              </label>
              <select
                name="transmision"
                value={formData.transmision}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              >
                <option value="">— Seleccionar —</option>
                <option value="Automática">Automática</option>
                <option value="Manual">Manual</option>
                <option value="CVT">CVT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Placa
              </label>
              <input
                type="text"
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="M-123456"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Detalles / Color / Accesorios
              </label>
              <input
                type="text"
                name="detalles"
                value={formData.detalles}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                placeholder="Color blanco, incluye llanta de repuesto..."
              />
            </div>
          </div>
        </section>
      )}

      {/* Reserva (NO PROFORMA) */}
      {!isProforma && !isConceptos && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
            <MapPin className="size-4" /> Detalles de la Reserva
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Lugar de Recogida
              </label>
              <input
                type="text"
                name="lugRec"
                value={formData.lugRec}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Lugar de Devolución
              </label>
              <input
                type="text"
                name="lugDev"
                value={formData.lugDev}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Fecha Recogida
              </label>
              <input
                type="date"
                name="frec"
                value={formData.frec}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Fecha Devolución
              </label>
              <input
                type="date"
                name="fdev"
                value={formData.fdev}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Hora Recogida
              </label>
              <input
                type="time"
                name="hrec"
                value={formData.hrec}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Hora Devolución
              </label>
              <input
                type="time"
                name="hdev"
                value={formData.hdev}
                onChange={handleChange}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              />
            </div>
          </div>
        </section>
      )}

      {/* Accesorios y Entrega (Solo Contrato) */}
      {docType === "contrato" && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
            <Car className="size-4" /> Estado y Accesorios (Entrega)
          </h2>
          <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nivel de Combustible
                </label>
                <input
                  type="text"
                  name="nivelCombustible"
                  value={formData.nivelCombustible}
                  onChange={handleChange}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                  placeholder="Ej. Lleno, 3/4, 1/2..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Observaciones de Entrega
                </label>
                <input
                  type="text"
                  name="obsEntrega"
                  value={formData.obsEntrega}
                  onChange={handleChange}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                  placeholder="Detalles de carrocería, pintura..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-foreground uppercase mb-3">
                Accesorios Incluidos
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ACCESORIOS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!(formData.accesorios && formData.accesorios[key])}
                      onChange={(e) => {
                        onChange("accesorios", {
                          ...formData.accesorios,
                          [key]: e.target.checked,
                        });
                      }}
                      className="size-4 text-primary rounded border-muted-foreground/30 focus:ring-primary"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Montos */}
      {isConceptos && <ConceptosFacturaForm conceptos={conceptos} moneda={monedaConceptos} onChange={(items) => onChange("conceptosFactura", items)} />}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
          <DollarSign className="size-4" /> Resumen de Montos
        </h2>

        {!isProforma && !isConceptos && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-muted/50 p-4 rounded-xl border border-border">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Días de Renta
              </label>
              <input
                type="number"
                name="dias"
                value={formData.dias}
                onChange={handleChange}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Monto por Día (USD)
              </label>
              <input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subtotal Renta (USD)
              </label>
              <div className="w-full bg-muted border border-transparent text-muted-foreground font-semibold rounded-lg px-3 py-2.5 text-sm cursor-not-allowed">
                ${subtotal.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {!isConceptos && <>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Depósito / Anticipo (USD)
            </label>
            <input
              type="number"
              name="deposito"
              value={formData.deposito}
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Nombre de Depósito personalizado (opcional)
            </label>
            <input
              type="text"
              name="depositoLabel"
              value={formData.depositoLabel || ""}
              placeholder="Depósito en Garantía"
              onChange={handleChange}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => onChange("hasOtrosServicios", !formData.hasOtrosServicios)}
            className={`py-2 px-4 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
              formData.hasOtrosServicios
                ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            }`}
          >
            {formData.hasOtrosServicios ? <X className="size-4" /> : <Plus className="size-4" />}
            {formData.hasOtrosServicios
              ? "Desactivar Servicios Extra"
              : "Añadir Servicios Extra (Chofer, Viáticos, Hospedaje)"}
          </button>
        </div>

        {formData.hasOtrosServicios && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Chofer */}
              <div className="bg-card p-3 rounded-lg border border-border shadow-xs">
                <h4 className="text-xs font-bold text-foreground uppercase mb-2">
                  Servicio de Chofer
                </h4>
                <div className="flex gap-2 mb-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Días
                    </label>
                    <input
                      type="number"
                      name="choferDias"
                      value={formData.choferDias}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      min="0"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Precio/Día ($)
                    </label>
                    <input
                      type="number"
                      name="choferPrecio"
                      value={formData.choferPrecio}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">
                    Nombre personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    name="choferLabel"
                    value={formData.choferLabel || ""}
                    placeholder="Servicio de Chofer"
                    onChange={handleChange}
                    className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-xs outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                  />
                </div>
              </div>

              {/* Viáticos */}
              <div className="bg-card p-3 rounded-lg border border-border shadow-xs">
                <h4 className="text-xs font-bold text-foreground uppercase mb-2">Viáticos</h4>
                <div className="flex gap-2 mb-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Días
                    </label>
                    <input
                      type="number"
                      name="viaticosDias"
                      value={formData.viaticosDias}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      min="0"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Precio/Día ($)
                    </label>
                    <input
                      type="number"
                      name="viaticosPrecio"
                      value={formData.viaticosPrecio}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">
                    Nombre personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    name="viaticosLabel"
                    value={formData.viaticosLabel || ""}
                    placeholder="Viáticos"
                    onChange={handleChange}
                    className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-xs outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                  />
                </div>
              </div>

              {/* Hospedaje */}
              <div className="bg-card p-3 rounded-lg border border-border shadow-xs">
                <h4 className="text-xs font-bold text-foreground uppercase mb-2">Hospedaje</h4>
                <div className="flex gap-2 mb-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Días
                    </label>
                    <input
                      type="number"
                      name="hospedajeDias"
                      value={formData.hospedajeDias}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      min="0"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">
                      Precio/Día ($)
                    </label>
                    <input
                      type="number"
                      name="hospedajePrecio"
                      value={formData.hospedajePrecio}
                      onChange={handleChange}
                      className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">
                    Nombre personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    name="hospedajeLabel"
                    value={formData.hospedajeLabel || ""}
                    placeholder="Hospedaje"
                    onChange={handleChange}
                    className="w-full bg-background border border-input text-foreground rounded-lg px-2 py-1 text-xs outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        </>}
        {/* Totales */}
        <div className="mt-4 p-5 bg-primary text-primary-foreground rounded-xl shadow-inner flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <p className="text-xs text-primary-foreground/70 font-bold uppercase tracking-wider mb-1">
              Total a Pagar
            </p>
            <p className="text-3xl font-extrabold text-gold">{isConceptos && monedaConceptos === "NIO" ? `C$${totalNIO.toFixed(2)}` : `$${totalUSD.toFixed(2)}`}</p>
          </div>

          {!isProforma && (
            <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-primary-foreground/20 pt-4 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-3 mb-2">
                <label className="text-xs text-primary-foreground/70 font-bold uppercase">
                  Tasa (C$)
                </label>
                <input
                  type="number"
                  name="tasa"
                  value={formData.tasa}
                  onChange={handleChange}
                  className="w-24 h-8 px-2 py-1 text-xs text-foreground bg-background border border-input rounded outline-none focus:border-gold"
                  step="0.01"
                />
              </div>
              <p className="text-xl font-bold text-right">{isConceptos && monedaConceptos === "NIO" ? `$${totalUSD.toFixed(2)} USD` : `C$${totalNIO.toFixed(2)}`}</p>
            </div>
          )}
        </div>
      </section>

      {/* Notas */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
          <FileEdit className="size-4" /> Notas y Observaciones
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Notas (Aparece en todos los docs)
            </label>
            <textarea
              name="nota"
              value={formData.nota}
              onChange={handleChange}
              rows={2}
              className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs resize-none"
              placeholder="Condiciones especiales, detalles extra..."
            />
          </div>
          {docType === "factura" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Observaciones (Solo Factura)
              </label>
              <textarea
                name="obs"
                value={formData.obs}
                onChange={handleChange}
                rows={2}
                className="w-full bg-muted/50 border border-input text-foreground rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-xs resize-none"
                placeholder="Observaciones internas o adicionales..."
              />
            </div>
          )}
        </div>
        {isProforma && (
          <p className="text-xs text-muted-foreground italic mt-2 flex items-center gap-1">
            <Info className="size-3" /> La proforma incluirá: "Proforma válida por {formData.validezDias ?? 10} días a partir de la fecha emitida."
          </p>
        )}
      </section>
    </div>
  );
}
