import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileSignature, FileText, ExternalLink, Loader2, Printer } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

type ContratoRow = {
  id: string;
  numero: string;
  tipo: string;
  pdf_url: string | null;
  created_at: string;
};

export function RentaDetailTabContracts({ rentaId }: { rentaId: string }) {
  const navigate = useNavigate();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contrato-renta", rentaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, numero, tipo, pdf_url, created_at")
        .eq("renta_id", rentaId)
        .maybeSingle();
      return data as ContratoRow | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contract) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="size-4 text-gold" />
                {contract.numero}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {contract.tipo} · {formatDate(contract.created_at)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/documentos", search: { editId: contract.id, rentaId } })}
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              Abrir
            </Button>
          </div>
          {contract.pdf_url && (
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Printer className="size-3.5 mr-1.5" />
                  Ver PDF
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed p-6 text-center">
        <FileSignature className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          No hay contrato vinculado a esta renta
        </p>
        <Button
          onClick={() => navigate({ to: "/documentos", search: { editId: undefined, rentaId } })}
        >
          <FileSignature className="size-4 mr-1.5" />
          Crear Contrato
        </Button>
      </div>
    </div>
  );
}
