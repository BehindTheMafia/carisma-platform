import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { vehicleDamageSchema, type VehicleDamageFormValues } from "./schema";
import { DEFAULT_COMPANY_INFO, DEFAULT_REPORT, ZONA_LABEL, type ZonaDanio, type CompanyInfo } from "./types";
import { getVehicleImageUrl } from "./vehicle-image";

const DRAFT_KEY = "tm:vehicle-damage-report:draft";

function loadImageDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function useVehicleDamage() {
  const [isSaving, setIsSaving] = useState(false);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved">("idle");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<VehicleDamageFormValues>({
    resolver: zodResolver(vehicleDamageSchema),
    defaultValues: DEFAULT_REPORT,
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    async function loadCompanyInfo() {
      try {
        const { data, error } = await supabase
          .from("configuracion_empresa")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setCompanyInfo({
            nombre: data.nombre || DEFAULT_COMPANY_INFO.nombre,
            ruc: data.ruc || DEFAULT_COMPANY_INFO.ruc,
            telefono: data.telefono || DEFAULT_COMPANY_INFO.telefono,
            correo: data.correo || DEFAULT_COMPANY_INFO.correo,
            direccion: data.direccion || DEFAULT_COMPANY_INFO.direccion,
            logo_url: data.logo_url || DEFAULT_COMPANY_INFO.logo_url,
          });
        }
      } catch {
        // Usar valores predeterminados
      }
    }
    loadCompanyInfo();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<VehicleDamageFormValues>;
      form.reset({ ...DEFAULT_REPORT, ...parsed });
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    setDraftState("saving");
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
      setDraftState("saved");
    }, 800);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [isDirty, form]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftState("idle");
  }, []);

  const newReport = useCallback(() => {
    form.reset({ ...DEFAULT_REPORT });
    clearDraft();
  }, [clearDraft, form]);

  const loadById = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("informes_danos")
        .select("form_data")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data?.form_data) {
        form.reset({ ...DEFAULT_REPORT, ...(data.form_data as Partial<VehicleDamageFormValues>) });
        clearDraft();
      }
    },
    [form, clearDraft],
  );

  const save = async (id?: string) => {
    const valid = vehicleDamageSchema.safeParse(form.getValues());
    if (!valid.success) {
      toast.error(valid.error.issues[0]?.message ?? "Completa los campos requeridos");
      return null;
    }

    setIsSaving(true);
    try {
      const payload = { form_data: valid.data };
      let savedId: string;
      if (id) {
        const { error } = await supabase.from("informes_danos").update(payload).eq("id", id);
        if (error) throw error;
        savedId = id;
      } else {
        const { data, error } = await supabase
          .from("informes_danos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
      form.reset(form.getValues());
      clearDraft();
      toast.success("Informe guardado correctamente");
      return savedId;
    } catch (err) {
      toast.error((err as Error).message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const exportJSON = () => {
    const data = form.getValues();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-danos-${data.fecha ?? "sin-fecha"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Informe exportado como JSON");
  };

  const generatePDF = async () => {
    const v = form.getValues();
    const company = companyInfo || DEFAULT_COMPANY_INFO;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const ML = 15;
    let y = 12;

    // --- ENCABEZADO DE EMPRESA (Rent a Car) ---
    const logoImg = await loadImageDataUrl(company.logo_url || "/logorent.png");
    if (logoImg) {
      doc.addImage(logoImg, "PNG", ML, y, 22, 22);
    }

    // Datos de la Empresa (Alineados a la derecha)
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 74, 140);
    doc.text(company.nombre, W - ML, y + 4, { align: "right" });

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    let companyY = y + 8.5;
    if (company.ruc) {
      doc.text(`RUC: ${company.ruc}`, W - ML, companyY, { align: "right" });
      companyY += 4;
    }
    if (company.telefono) {
      doc.text(`Teléfono: ${company.telefono}`, W - ML, companyY, { align: "right" });
      companyY += 4;
    }
    if (company.correo) {
      doc.text(`Correo: ${company.correo}`, W - ML, companyY, { align: "right" });
      companyY += 4;
    }
    if (company.direccion) {
      doc.text(company.direccion, W - ML, companyY, { align: "right" });
      companyY += 4;
    }

    y = Math.max(y + 24, companyY + 2);

    // Línea azul separadora
    doc.setDrawColor(26, 74, 140);
    doc.setLineWidth(0.3);
    doc.line(ML, y, W - ML, y);
    y += 6;

    // Título del Documento
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(26, 74, 140);
    doc.text("INFORME DE DAÑOS DEL VEHÍCULO", ML, y);

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Fecha: ${v.fecha || "—"}   Hora: ${v.hora || "—"}`, W - ML, y, { align: "right" });

    y += 6;

    // --- TABLA CLIENTE ---
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { font: "times", fontSize: 8.5, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 74, 140], textColor: [255, 255, 255], fontStyle: "bold" },
      body: [
        [
          {
            content: "DATOS DEL CLIENTE",
            colSpan: 2,
            styles: { fontStyle: "bold", fillColor: [232, 240, 254], textColor: [26, 74, 140] },
          },
        ],
        ["Nombre del Cliente", v.cliente.nombre || "—"],
        ["No. Documento / Cédula", v.cliente.documento || "—"],
        ["Teléfono de Contacto", v.cliente.telefono || "—"],
        ["Dirección", v.cliente.direccion || "—"],
      ],
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // --- TABLA VEHÍCULO ---
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { font: "times", fontSize: 8.5, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 74, 140], textColor: [255, 255, 255], fontStyle: "bold" },
      body: [
        [
          {
            content: "DATOS DEL VEHÍCULO",
            colSpan: 2,
            styles: { fontStyle: "bold", fillColor: [232, 240, 254], textColor: [26, 74, 140] },
          },
        ],
        ["Marca / Modelo", `${v.vehiculo.marca || ""} ${v.vehiculo.modelo || ""}`.trim() || "—"],
        ["Placa", v.vehiculo.placa || "—"],
        ["Color", v.vehiculo.color || "—"],
        ["Combustible", v.vehiculo.combustible === "diesel" ? "Diésel" : v.vehiculo.combustible === "gasolina" ? "Gasolina" : "—"],
      ],
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // --- TABLA DAÑOS ---
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { font: "times", fontSize: 8.5, cellPadding: 1.5 },
      headStyles: { fillColor: [26, 74, 140], textColor: [255, 255, 255], fontStyle: "bold" },
      body: [
        [
          {
            content: "DETALLE DE DAÑOS REGISTRADOS",
            colSpan: 2,
            styles: { fontStyle: "bold", fillColor: [232, 240, 254], textColor: [26, 74, 140] },
          },
        ],
        ["Zonas Afectadas", (v.zonas ?? []).map((z) => ZONA_LABEL[z]).join(", ") || "—"],
        ["Descripción del Daño", v.descripcion || "—"],
        ["Observaciones Adicionales", v.observaciones || "Sin observaciones"],
      ],
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    // Diagrama del Vehículo — siempre en segunda página
    const vehicleImg = await loadImageDataUrl(getVehicleImageUrl(v.vehiculo.tipoVehiculo));
    if (vehicleImg) {
      doc.addPage();
      y = 15;
      const img = new Image();
      img.src = vehicleImg;
      await new Promise<void>((r) => {
        img.onload = () => r();
        img.onerror = () => r();
      });
      const imgW = 140;
      const imgH = (img.height / img.width) * imgW;
      const imgX = (W - imgW) / 2;
      doc.addImage(vehicleImg, "PNG", imgX, y, imgW, imgH);

      // Dibujar zonas seleccionadas sobre la imagen
      const zonasSeleccionadas = v.zonas ?? [];
      if (zonasSeleccionadas.length > 0) {
        const ZONE_AREAS: { zone: ZonaDanio; x: number; y: number; w: number; h: number }[] = [
          { zone: "delantera", x: 45, y: 28, w: 90, h: 80 },
          { zone: "trasera", x: 265, y: 28, w: 90, h: 80 },
          { zone: "interior", x: 162, y: 28, w: 76, h: 144 },
          { zone: "izquierda", x: 30, y: 114, w: 120, h: 58 },
          { zone: "derecha", x: 250, y: 114, w: 120, h: 58 },
        ];
        const scaleX = imgW / 400;
        const scaleY = imgH / 200;

        for (const area of ZONE_AREAS) {
          if (!zonasSeleccionadas.includes(area.zone)) continue;
          const rx = imgX + area.x * scaleX;
          const ry = y + area.y * scaleY;
          const rw = area.w * scaleX;
          const rh = area.h * scaleY;

          // Fondo semitransparente
          doc.setFillColor(37, 99, 235);
          doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.25 }));
          doc.roundedRect(rx, ry, rw, rh, 1.5, 1.5, "F");

          // Borde
          doc.setDrawColor(37, 99, 235);
          doc.setLineWidth(0.4);
          doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.9 }));
          doc.roundedRect(rx, ry, rw, rh, 1.5, 1.5, "S");

          // Etiqueta
          const label = ZONA_LABEL[area.zone];
          doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 1 }));
          doc.setFont("times", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(30, 64, 175);
          doc.text(label, rx + rw / 2, ry + rh / 2 + 1, { align: "center" });
        }
        doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 1 }));
      }

      y += imgH + 5;
    }

    // Conclusión
    if (y + 25 > H - 50) {
      doc.addPage();
      y = 15;
    }

    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 74, 140);
    doc.text("DECLARACIÓN Y CONCLUSIÓN:", ML, y);
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const conclusionLines = doc.splitTextToSize(v.conclusion || "", W - 2 * ML);
    doc.text(conclusionLines, ML, y + 4.5);

    y += 6 + conclusionLines.length * 4;

    // --- BLOQUE DE FIRMAS FORMAL ---
    if (y + 40 > H - 20) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    const colW = (W - 2 * ML - 15) / 2;
    const col1X = ML;
    const col2X = ML + colW + 15;
    const sigLineY = y + 20;

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(26, 74, 140);
    doc.text("REPRESENTANTE TM RENT A CAR", col1X + colW / 2, y, { align: "center" });
    doc.text("CLIENTE / ARRENDATARIO", col2X + colW / 2, y, { align: "center" });

    // Firma Representante
    if (v.firmas.representante.firmaUrl) {
      doc.addImage(v.firmas.representante.firmaUrl, "PNG", col1X + (colW - 40) / 2, y + 2, 40, 16);
    } else {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.3);
      doc.line(col1X + 5, sigLineY, col1X + colW - 5, sigLineY);
    }

    // Firma Cliente
    if (v.firmas.cliente.firmaUrl) {
      doc.addImage(v.firmas.cliente.firmaUrl, "PNG", col2X + (colW - 40) / 2, y + 2, 40, 16);
    } else {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.3);
      doc.line(col2X + 5, sigLineY, col2X + colW - 5, sigLineY);
    }

    const repNombre = v.firmas.representante.nombre || company.nombre;
    const repDoc = v.firmas.representante.documento ? `ID: ${v.firmas.representante.documento}` : `RUC: ${company.ruc || "—"}`;
    const repFecha = v.firmas.representante.fecha ? `Fecha: ${v.firmas.representante.fecha}` : `Fecha: ${v.fecha || "—"}`;

    const cliNombre = v.firmas.cliente.nombre || v.cliente.nombre || "Nombre del Cliente";
    const cliDoc = v.firmas.cliente.documento || v.cliente.documento ? `Doc: ${v.firmas.cliente.documento || v.cliente.documento}` : "";
    const cliFecha = v.firmas.cliente.fecha ? `Fecha: ${v.firmas.cliente.fecha}` : `Fecha: ${v.fecha || "—"}`;

    const infoY = sigLineY + 4;

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(repNombre, col1X + colW / 2, infoY, { align: "center" });
    doc.text(cliNombre, col2X + colW / 2, infoY, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(repDoc, col1X + colW / 2, infoY + 4, { align: "center" });
    if (cliDoc) doc.text(cliDoc, col2X + colW / 2, infoY + 4, { align: "center" });

    doc.text(repFecha, col1X + colW / 2, infoY + 8, { align: "center" });
    doc.text(cliFecha, col2X + colW / 2, infoY + 8, { align: "center" });

    doc.save(`informe-danos-${v.vehiculo.placa || "vehiculo"}-${v.fecha || "fecha"}.pdf`);
    toast.success("PDF generado correctamente");
  };

  const print = () => {
    window.print();
  };

  return {
    form,
    isDirty,
    draftState,
    isSaving,
    companyInfo,
    save,
    loadById,
    newReport,
    exportJSON,
    generatePDF,
    print,
  };
}
