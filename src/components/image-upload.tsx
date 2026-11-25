import { useState } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export type Foto = {
  id: string;
  path: string;
  url: string;
  name: string;
};

interface ImageUploadProps {
  value?: Foto[];
  onChange?: (value: Foto[]) => void;
  bucket?: string;
  maxImages?: number;
}

export function ImageUpload({
  value = [],
  onChange,
  bucket = "vehiculo-fotos",
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onChange) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const id = crypto.randomUUID();
      const path = `${id}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);

      onChange([...value, { id, path, url: publicUrl, name: file.name }]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (foto: Foto) => {
    if (!onChange) return;
    await supabase.storage.from(bucket).remove([foto.path]);
    onChange(value.filter((f) => f.id !== foto.id));
  };

  const remaining = maxImages - value.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {value.map((foto) => (
          <Card key={foto.id} className="group relative overflow-hidden">
            <CardContent className="p-0">
              <img src={foto.url} alt={foto.name} className="h-28 w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(foto)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
              <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{foto.name}</p>
            </CardContent>
          </Card>
        ))}
        {remaining > 0 && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="mt-1 text-[11px]">Agregar</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
