import { FileText, Plus, X } from "lucide-react";
import { calcularImporteConcepto, nuevoConceptoFactura, type ConceptoFactura } from "@/lib/factura-conceptos";

export function ConceptosFacturaForm({ conceptos, moneda, onChange }: {
  conceptos: ConceptoFactura[];
  moneda: "USD" | "NIO";
  onChange: (conceptos: ConceptoFactura[]) => void;
}) {
  const update = (id: string, field: keyof ConceptoFactura, value: string | number) => {
    onChange(conceptos.map((concepto) => concepto.id === id ? { ...concepto, [field]: value } : concepto));
  };
  const inputClass = "w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold";

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-primary border-b-2 border-gold pb-2 mb-4 uppercase tracking-wide">
        <FileText className="size-4" /> Conceptos de la factura
      </h2>
      <div className="space-y-3">
        {conceptos.map((concepto, index) => (
          <div key={concepto.id} className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gold">Concepto {index + 1}</h3>
              <button type="button" aria-label={`Eliminar concepto ${index + 1}`} onClick={() => onChange(conceptos.filter((item) => item.id !== concepto.id))} className="text-destructive p-1 rounded-md hover:bg-destructive/10"><X className="size-4" /></button>
            </div>
            <div>
              <label htmlFor={`concepto-${concepto.id}`} className="block text-xs font-semibold mb-1.5">Descripción</label>
              <textarea id={`concepto-${concepto.id}`} value={concepto.descripcion} maxLength={500} rows={2} placeholder="Ej. Traslado aeropuerto–hotel del 11 de octubre" onChange={(e) => update(concepto.id, "descripcion", e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`cantidad-${concepto.id}`} className="block text-xs font-semibold mb-1.5">Cantidad</label>
                <input id={`cantidad-${concepto.id}`} type="number" min="0.01" max="1000000" step="0.01" value={concepto.cantidad} onChange={(e) => update(concepto.id, "cantidad", Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`precio-${concepto.id}`} className="block text-xs font-semibold mb-1.5">Precio unitario ({moneda === "NIO" ? "C$" : "USD"})</label>
                <input id={`precio-${concepto.id}`} type="number" min="0" max="1000000" step="0.01" value={concepto.precioUnitario} onChange={(e) => update(concepto.id, "precioUnitario", Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <span className="block text-xs font-semibold mb-1.5">Importe ({moneda === "NIO" ? "C$" : "USD"})</span>
                <output className="block px-3 py-2 text-sm font-semibold">{moneda === "NIO" ? "C$" : "$"}{calcularImporteConcepto(concepto).toFixed(2)}</output>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" disabled={conceptos.length >= 20} onClick={() => onChange([...conceptos, nuevoConceptoFactura()])} className="mt-3 w-full py-2.5 border-2 border-dashed border-gold/60 text-gold rounded-xl font-bold text-sm hover:bg-gold/5 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
        <Plus className="size-4" /> Agregar concepto
      </button>
    </section>
  );
}
