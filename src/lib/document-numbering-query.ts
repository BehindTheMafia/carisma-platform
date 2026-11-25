import { supabase } from "@/integrations/supabase/client";
import { claveNumeroDocumento, numerosParaDocumento } from "./document-numbering";

/** Consulta tanto las rentas como los documentos antes de guardar. */
export async function verificarNumerosDisponibles(
  numbers: string[], rentaId: string | null, documentId: string | null = null,
): Promise<string | null> {
  for (const number of numbers) {
    const key = claveNumeroDocumento(number);
    const search = /^\d+$/.test(key) ? key : number.trim();
    const pattern = JSON.stringify(`%${search}%`);
    const [rentals, documents] = await Promise.all([
      supabase.from("rentas").select("id, numero_oficial").ilike("numero_oficial", `%${search}%`),
      supabase.from("contratos").select("id, renta_id, tipo, numero, form_data")
        .or(`numero.ilike.${pattern},form_data->>docNum.ilike.${pattern},form_data->>facturaNum.ilike.${pattern}`),
    ]);
    if (rentals.error) throw rentals.error;
    if (documents.error) throw documents.error;
    if ((rentals.data ?? []).some((r) => r.id !== rentaId && claveNumeroDocumento(r.numero_oficial) === key)) return number;
    if ((documents.data ?? []).some((c) => {
      if (c.id === documentId || (rentaId && c.renta_id === rentaId)) return false;
      const saved = c.form_data && typeof c.form_data === "object" && !Array.isArray(c.form_data)
        ? c.form_data as { docNum?: string; facturaNum?: string; facturaModo?: string }
        : {};
      return numerosParaDocumento(c.tipo, saved).some((n) => claveNumeroDocumento(n) === key)
        || (c.tipo === "factura" && claveNumeroDocumento(c.numero) === key);
    })) return number;
  }
  return null;
}
