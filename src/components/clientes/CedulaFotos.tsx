import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FotoCedula = { path: string; name: string };
const bucket = "cedulas-clientes";
const maxFiles = 3;

async function optimizarImagen(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error("Elegí una imagen JPG, PNG o WebP de hasta 15 MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    if (!output || output.type !== "image/webp" || output.size > 2 * 1024 * 1024) {
      throw new Error("La imagen optimizada supera 2 MB. Probá con otra fotografía.");
    }
    return output;
  } finally {
    bitmap.close();
  }
}

export function CedulaFotos({ clienteId }: { clienteId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["cedula-fotos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("cedula_fotos").eq("id", clienteId).single();
      if (error) throw error;
      const fotos = (Array.isArray(data.cedula_fotos) ? data.cedula_fotos : []) as FotoCedula[];
      return Promise.all(fotos.map(async (foto) => {
        const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(foto.path, 3600);
        if (signError) throw signError;
        return { ...foto, url: signed.signedUrl };
      }));
    },
    staleTime: 30 * 60 * 1000,
  });

  const eliminar = useMutation({
    mutationFn: async (foto: FotoCedula) => {
      const remaining = fotos.filter((f) => f.path !== foto.path).map(({ path, name }) => ({ path, name }));
      const { error } = await supabase.from("clientes").update({ cedula_fotos: remaining }).eq("id", clienteId);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from(bucket).remove([foto.path]);
      if (storageError) throw storageError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cedula-fotos", clienteId] });
      toast.success("Imagen eliminada");
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["cedula-fotos", clienteId] });
      toast.error(error.message);
    },
  });

  async function agregar(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > maxFiles - fotos.length) {
      toast.error(`Solo se permiten ${maxFiles} fotos de cédula por cliente.`);
      return;
    }
    setSubiendo(true);
    const nuevos: FotoCedula[] = [];
    try {
      for (const file of files) {
        const blob = await optimizarImagen(file);
        const path = `${clienteId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/webp" });
        if (error) throw error;
        nuevos.push({ path, name: file.name });
      }
      const { error } = await supabase.from("clientes")
        .update({ cedula_fotos: [...fotos.map(({ path, name }) => ({ path, name })), ...nuevos] })
        .eq("id", clienteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cedula-fotos", clienteId] });
      toast.success("Fotos de cédula guardadas");
    } catch (error) {
      // Las cargas incompletas se limpian para no dejar archivos sin vínculo.
      if (nuevos.length) await supabase.storage.from(bucket).remove(nuevos.map((f) => f.path));
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las imágenes");
    } finally {
      setSubiendo(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider">Fotos de la cédula</h3>
          <p className="text-xs text-muted-foreground">Privadas · máximo {maxFiles} imágenes · se comprimen antes de subir</p>
        </div>
        <span className="text-xs text-muted-foreground">{fotos.length}/{maxFiles}</span>
      </div>
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((foto) => (
            <div key={foto.path} className="relative min-w-0 rounded-lg border overflow-hidden">
              <a href={foto.url} target="_blank" rel="noreferrer" aria-label={`Ver ${foto.name}`}>
                <img src={foto.url} alt={foto.name} className="w-full h-24 object-cover" />
                <ExternalLink className="absolute bottom-7 right-1 size-4 text-white drop-shadow" />
              </a>
              <p className="truncate px-1.5 py-1 text-[10px]">{foto.name}</p>
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 size-6"
                aria-label={`Eliminar ${foto.name}`} disabled={eliminar.isPending || subiendo} onClick={() => eliminar.mutate(foto)}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
          {fotos.length < maxFiles && (
            <button type="button" className="h-24 rounded-lg border border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground hover:border-gold"
              disabled={subiendo || eliminar.isPending} onClick={() => fileInput.current?.click()}>
              {subiendo ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              Agregar
            </button>
          )}
        </div>
      )}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
        onChange={(e) => void agregar(e.target.files)} />
    </div>
  );
}
