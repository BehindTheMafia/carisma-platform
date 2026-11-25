import { supabase } from "@/integrations/supabase/client";

export async function logRentaEvent(
  rentaId: string,
  accion: string,
  descripcion?: string,
): Promise<void> {
  try {
    await (supabase as any)
      .rpc("log_renta_event", {
        p_renta_id: rentaId,
        p_accion: accion,
        p_descripcion: descripcion ?? null,
      })
      .then(() => {})
      .catch(() => {});
  } catch {
    // Silently fail — logging should never block the main action
  }
}
