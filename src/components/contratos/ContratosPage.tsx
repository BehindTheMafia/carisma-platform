import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { DocumentTabs } from "./DocumentTabs";
import { ContratoForm, type FormData } from "./ContratoForm";
import { PdfPreview } from "./PdfPreview";
import { CalibrationMode } from "./CalibrationMode";
import { generatePDF } from "@/utils/pdfGenerator";
import { generateFacturaPreprinted } from "@/utils/pdfGeneratorPreprinted";
import { hasActiveCalibration, getCalibrationOffsets } from "@/utils/calibrationStorage";
import { logRentaEvent } from "@/lib/renta-log";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileSignature, Printer, Loader2 } from "lucide-react";
import { accesoriosFromArray } from "@/constants/accesorios";
import { COMPANY } from "@/utils/pdfGenerator";
import { formatCurrency } from "@/lib/format";
import { differenceInCalendarDays, addDays } from "date-fns";
import { supabase as sbAuth } from "@/integrations/supabase/client";
import { esFacturaPorConceptos, facturaConceptosSchema } from "@/lib/factura-conceptos";
import { numerosParaDocumento } from "@/lib/document-numbering";
import { verificarNumerosDisponibles } from "@/lib/document-numbering-query";

type AvailableVehicle = {
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
};

type AvailableClient = {
  id: string;
  nombre: string;
  documento: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dateInputFromDate = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};

const initialFormData: FormData = {
  facturaModo: "renta",
  monedaConceptos: "USD",
  conceptosFactura: [],
  fechaDoc: getTodayStr(),
  facturaNum: "",
  docNum: "",
  ciudad: "Managua",
  cliente: "",
  ruc: "",
  correo: "",
  telefono: "",
  direccion: "",
  conductor: "",
  vehiculos: [{ id: Date.now(), name: "", model: "", days: 1, price: 0, color: "" }],
  vehiculo: "",
  tipoVehiculo: "SUV",
  modelo: "",
  transmision: "",
  placa: "",
  detalles: "",
  color: "",
  lugRec: "Managua",
  lugDev: "Managua",
  frec: "",
  fdev: "",
  hrec: "08:00",
  hdev: "08:00",
  dias: 0,
  precio: 0,
  deposito: 0,
  hasOtrosServicios: false,
  choferDias: 0,
  choferPrecio: 0,
  viaticosDias: 0,
  viaticosPrecio: 0,
  hospedajeDias: 0,
  hospedajePrecio: 0,
  viajeDias: 0,
  viajePrecio: 0,
  viajeOrigen: "",
  viajeDestino: "",
  viajeHoraInicio: "",
  viajeHoraFin: "",
  tasa: 36.6243,
  nota: "El pago total deberá ser cancelado al finalizar el contrato.",
  obs: "",
  nivelCombustible: "",
  obsEntrega: "",
  accesorios: {
    circulacion: true,
    seguro: true,
    llave: true,
    radio: true,
    camara: false,
    bocina: false,
    antivuelco: false,
    baca: false,
    alogenos: false,
    traba: true,
    herramientas: true,
    gata: true,
    repuesto: true,
    triangulos: true,
  },
  sinFirma: false,
  sinNotaCredito: false,
  validezDias: 10,
  datosEmpresa: { ...COMPANY },
};

const emptyFormData: FormData = {
  facturaModo: "renta",
  monedaConceptos: "USD",
  conceptosFactura: [],
  fechaDoc: getTodayStr(),
  facturaNum: "",
  docNum: "",
  ciudad: "",
  cliente: "",
  ruc: "",
  correo: "",
  telefono: "",
  direccion: "",
  conductor: "",
  vehiculos: [],
  vehiculo: "",
  tipoVehiculo: "",
  modelo: "",
  transmision: "",
  placa: "",
  detalles: "",
  color: "",
  lugRec: "",
  lugDev: "",
  frec: "",
  fdev: "",
  hrec: "",
  hdev: "",
  dias: 0,
  precio: 0,
  deposito: 0,
  hasOtrosServicios: false,
  choferDias: 0,
  choferPrecio: 0,
  viaticosDias: 0,
  viaticosPrecio: 0,
  hospedajeDias: 0,
  hospedajePrecio: 0,
  viajeDias: 0,
  viajePrecio: 0,
  viajeOrigen: "",
  viajeDestino: "",
  viajeHoraInicio: "",
  viajeHoraFin: "",
  tasa: 36.6243,
  nota: "El pago total deberá ser cancelado al finalizar el contrato.",
  obs: "",
  nivelCombustible: "",
  obsEntrega: "",
  accesorios: {
    circulacion: false,
    seguro: false,
    llave: false,
    radio: false,
    camara: false,
    bocina: false,
    antivuelco: false,
    baca: false,
    alogenos: false,
    traba: false,
    herramientas: false,
    gata: false,
    repuesto: false,
    triangulos: false,
  },
  sinFirma: false,
  sinNotaCredito: false,
  validezDias: 10,
  datosEmpresa: { ...COMPANY },
};

const tipoLabel: Record<string, string> = {
  proforma: "Proforma",
  confirmacion: "Confirmación",
  factura: "Factura",
  contrato: "Contrato",
};

export function ContratosPage({ editId, rentaId }: { editId?: string; rentaId?: string }) {
  const navigate = useNavigate();
  const [docType, setDocType] = useState("proforma");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedDocTypes, setSavedDocTypes] = useState<Set<string>>(new Set());
  const [savedDocIds, setSavedDocIds] = useState<Record<string, string>>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [preprintedMode, setPreprintedMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const { data: availableVehicles = [] } = useQuery<AvailableVehicle[]>({
    queryKey: ["vehiculos-contrato"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehiculos")
        .select(
          "id, codigo, placa, marca, modelo, anio, color, tipo_vehiculo, transmision, tarifa_diaria, accesorios",
        )
        .is("deleted_at", null)
        .order("marca");
      return (data ?? []) as unknown as AvailableVehicle[];
    },
  });

  const { data: availableClients = [] } = useQuery<AvailableClient[]>({
    queryKey: ["clientes-contrato"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, documento, correo, telefono, direccion, ciudad")
        .is("deleted_at", null)
        .order("nombre");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (formData.frec && formData.fdev) {
      const hrec = formData.hrec || "08:00";
      const hdev = formData.hdev || "08:00";
      const start = new Date(`${formData.frec}T${hrec}`);
      const end = new Date(`${formData.fdev}T${hdev}`);

      let diffDays = 1;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        // Lógica de 24 horas: 24 horas exactas = 1 día. Si excede 24h, cuenta el siguiente día
        diffDays = Math.max(1, Math.ceil(diffHours / 24));
      } else {
        const d1 = parseLocalDate(formData.frec);
        const d2 = parseLocalDate(formData.fdev);
        diffDays = Math.max(1, differenceInCalendarDays(d2, d1));
      }

      if (diffDays !== formData.dias) {
        setFormData((prev) => ({
          ...prev,
          dias: diffDays,
          choferDias: prev.choferDias === 0 ? diffDays : prev.choferDias,
          viaticosDias: prev.viaticosDias === 0 ? diffDays : prev.viaticosDias,
          hospedajeDias: prev.hospedajeDias === 0 ? diffDays : prev.hospedajeDias,
        }));
      }
    }
  }, [formData.frec, formData.fdev, formData.hrec, formData.hdev]);

  useEffect(() => {
    if (!editId) return;

    setEditLoading(true);
    setBlobUrl(null);
    setShouldGenerate(false);

    const controller = new AbortController();

    supabase
      .from("contratos")
      .select("*")
      .eq("id", editId)
      .single()
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error || !data) {
          toast.error("No se pudo cargar el documento para editar");
          setEditLoading(false);
          return;
        }

        const contract = data as { tipo: string; form_data: Record<string, unknown>; fecha: string };
        const savedData = contract.form_data || {};

        const rawFecha = (savedData.fechaDoc as string) || contract.fecha || initialFormData.fechaDoc;
        const cleanFechaDoc = typeof rawFecha === "string" ? rawFecha.slice(0, 10) : getTodayStr();

        setDocType(contract.tipo);
        setSavedDocTypes(new Set());
        setSavedDocIds({ [contract.tipo]: editId });
        setFormData({
          ...initialFormData,
          ...savedData,
          fechaDoc: cleanFechaDoc,
          accesorios: {
            ...initialFormData.accesorios,
            ...((savedData.accesorios as Record<string, boolean>) || {}),
          },
        } as FormData);
        setEditLoading(false);
        setShouldGenerate(true);
      });

    return () => controller.abort();
  }, [editId]);

  useEffect(() => {
    if (!rentaId || editId) return;

    (async () => {
      const { data: renta, error } = await supabase
        .from("rentas")
        .select("*, clientes(*), vehiculos(*)")
        .eq("id", rentaId)
        .single();

      if (error || !renta) return;

      const c = renta.clientes as Record<string, unknown> | null;
      const v = renta.vehiculos as Record<string, unknown> | null;

      const vehicleAcc = (v?.accesorios as string[]) ?? [];
      const transRaw = ((v?.transmision as string) ?? "").toLowerCase();

      const expNum = (renta.numero_oficial as string) ?? "";
      const rentaFecha = (renta.fecha_inicio as string)?.slice(0, 10) || (renta.created_at as string)?.slice(0, 10);
      setDocType("contrato");
      setFormData((prev) => ({
        ...prev,
        fechaDoc: prev.fechaDoc || rentaFecha || getTodayStr(),
        docNum: expNum,
        facturaNum: expNum || prev.facturaNum,
        cliente: (c?.nombre as string) ?? "",
        ruc: (c?.documento as string) ?? "",
        correo: (c?.correo as string) ?? "",
        telefono: (c?.telefono as string) ?? "",
        direccion: (c?.direccion as string) ?? "",
        ciudad: (c?.ciudad as string) ?? "Managua",
        vehiculo: v ? `${v.marca as string} ${v.modelo as string}` : "",
        modelo: v ? `${v.modelo as string} ${String(v.anio ?? "")}` : "",
        transmision:
          transRaw === "manual" ? "Manual" : transRaw === "automatica" ? "Automática" : "",
        placa: (v?.placa as string) ?? "",
        color: (v?.color as string) ?? "",
        frec: (renta.fecha_inicio as string)?.slice(0, 10) ?? "",
        fdev: (renta.fecha_devolucion as string)?.slice(0, 10) ?? "",
        dias: (renta.dias as number) ?? 1,
        precio: (renta.tarifa as number) ?? 0,
        deposito: (renta.deposito as number) ?? 0,
        accesorios: accesoriosFromArray(vehicleAcc),
      }));
    })();
  }, [rentaId, editId]);

  useEffect(() => {
    if (shouldGenerate) {
      setShouldGenerate(false);
      handleGenerate();
    }
  }, [shouldGenerate]);

  const handleFormChange = (name: string, value: unknown) => {
    setBlobUrl(null);
    setSavedDocTypes((prev) => {
      const next = new Set(prev);
      next.delete(docType);
      return next;
    });
    if (name === "dias") {
      const n = Math.max(0, Math.floor(Number(value) || 0));
      const inicio = formData.frec ? parseLocalDate(formData.frec) : null;
      setFormData((prev) => ({
        ...prev,
        dias: n,
        // 1 día desde el 12/07 -> 13/07 | 15 días desde el 25/06 -> 10/07
        fdev: inicio && n > 0 ? dateInputFromDate(addDays(inicio, n)) : prev.fdev,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehiculosChange = (vehiculos: FormData["vehiculos"]) => {
    setBlobUrl(null);
    setSavedDocTypes((prev) => {
      const next = new Set(prev);
      next.delete(docType);
      return next;
    });
    setFormData((prev) => ({ ...prev, vehiculos }));
  };

  const handleGenerate = async () => {
    if (!validarConceptos()) return;
    setIsGenerating(true);

    setTimeout(async () => {
      try {
        const calibrationOffsets =
          docType === "factura" && hasActiveCalibration() ? getCalibrationOffsets() : undefined;

        const dataForPdf =
          docType === "factura" && !esFacturaPorConceptos(formData)
            ? {
                ...formData,
                docType,
                obs: [
                  formData.vehiculo && `Vehículo: ${formData.vehiculo}`,
                  formData.transmision && `Transmisión: ${formData.transmision}`,
                  formData.placa && `Placa: ${formData.placa}`,
                ]
                  .filter(Boolean)
                  .join(" | ") +
                  (formData.obs ? `\n${formData.obs}` : ""),
              }
            : { ...formData, docType };

        let doc;
        if (docType === "factura" && preprintedMode) {
          doc = await generateFacturaPreprinted(dataForPdf, calibrationOffsets);
        } else {
          doc = await generatePDF(dataForPdf, calibrationOffsets);
        }

        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }

        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        if (window.innerWidth < 1024) {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.error("Ocurrió un error al generar el PDF");
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleSaveToDB = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await persistDocument();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("No se pudo guardar el documento. Intentá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const validarConceptos = () => {
    if (docType !== "factura" || !esFacturaPorConceptos(formData)) return true;
    const result = facturaConceptosSchema.safeParse(formData);
    if (!result.success) toast.error(result.error.issues[0].message);
    return result.success;
  };

  const persistDocument = async () => {
    if (!validarConceptos()) return;
    if (!esFacturaPorConceptos(formData) && formData.hasOtrosServicios && (Number(formData.viajeDias) > 0 || Number(formData.viajePrecio) > 0)) {
      if (!Number.isInteger(Number(formData.viajeDias)) || Number(formData.viajeDias) <= 0 || Number(formData.viajePrecio) <= 0 || !formData.viajeOrigen?.trim() || !formData.viajeDestino?.trim() || !formData.viajeHoraInicio || !formData.viajeHoraFin) {
        toast.error("Completá días, precio por día, lugares y horas del viaje antes de guardar");
        return;
      }
    }
    if (docType === "factura" && !formData.facturaNum.trim()) {
      toast.error("Escribí el número de factura antes de guardar");
      return;
    }
    const conceptOnly = docType === "factura" && esFacturaPorConceptos(formData);
    const effectiveRentaId = conceptOnly ? null : rentaId ?? null;
    const documentId = savedDocIds[docType];
    const numbers = numerosParaDocumento(docType, formData);
    let occupiedNumber: string | null;
    try {
      occupiedNumber = await verificarNumerosDisponibles(numbers, effectiveRentaId, documentId ?? null);
    } catch (error) {
      console.error("Error checking document numbers:", error);
      toast.error("No se pudo verificar la numeración. Intentá de nuevo.");
      return;
    }
    if (occupiedNumber) {
      toast.error(`El número ${occupiedNumber} ya está utilizado por otra factura o expediente`);
      return;
    }
    const effectiveFechaDoc = formData.fechaDoc ? formData.fechaDoc.slice(0, 10) : getTodayStr();
    const { cliente, fechaDoc, ...rest } = formData;
    const form_data = {
      cliente,
      fechaDoc: effectiveFechaDoc,
      ...rest,
      docNum: conceptOnly ? "" : formData.docNum.trim(),
      facturaNum: formData.facturaNum.trim(),
      datosEmpresa: formData.datosEmpresa ? { ...formData.datosEmpresa } : undefined,
      emitidoEn: formData.emitidoEn,
      emitidoPor: formData.emitidoPor,
      emitidoPorNombre: formData.emitidoPorNombre,
    } as never;

    const numToSave = formData.docNum.trim() || formData.facturaNum.trim();

    if (documentId) {
      const updatePayload: Record<string, unknown> = {
        tipo: docType,
        form_data,
        pdf_url: null,
        fecha: effectiveFechaDoc,
      };
      updatePayload.renta_id = effectiveRentaId;

      const { error: dbError } = await supabase
        .from("contratos")
        .update(updatePayload as never)
        .eq("id", documentId)
        .select("id")
        .single();

      if (dbError) {
        console.error("Error updating contract in DB:", dbError);
        toast.error(`No se pudo actualizar: ${dbError.message}`);
        return;
      }
      setSavedDocTypes((prev) => new Set(prev).add(docType));
      toast.success(`${tipoLabel[docType]} actualizada en el sistema`);
      if (effectiveRentaId && numToSave) {
        const { error } = await supabase.from("rentas").update({ numero_oficial: numToSave }).eq("id", effectiveRentaId);
        if (error) toast.error(`Documento actualizado, pero no se pudo actualizar el expediente: ${error.message}`);
      }
    } else {
      const now = new Date().toISOString();
      const { data: userData } = await sbAuth.auth.getUser();
      const userName = userData?.user?.email ?? userData?.user?.id ?? "desconocido";

      const payload: Record<string, unknown> = {
        tipo: docType,
        form_data: {
          cliente,
          fechaDoc: effectiveFechaDoc,
          ...rest,
          docNum: conceptOnly ? "" : formData.docNum.trim(),
          facturaNum: formData.facturaNum.trim(),
          datosEmpresa: formData.datosEmpresa ? { ...formData.datosEmpresa } : undefined,
          emitidoEn: now,
          emitidoPor: userData?.user?.id,
          emitidoPorNombre: userName,
        } as never,
        estado: "emitido",
        emitido_en: now,
        emitido_por: userData?.user?.id,
        fecha: effectiveFechaDoc,
      };
      if (effectiveRentaId) payload.renta_id = effectiveRentaId;

      const { data: inserted, error: dbError } = await supabase
        .from("contratos")
        .insert(payload)
        .select("id")
        .single();

      if (dbError) {
        console.error("Error saving contract to DB:", dbError);
        toast.error(`No se pudo guardar: ${dbError.message}`);
        return;
      }
      if (effectiveRentaId && inserted) {
        logRentaEvent(effectiveRentaId, "contrato_generado", `Contrato tipo ${docType} creado`);
      }
      setSavedDocIds((prev) => ({ ...prev, [docType]: inserted.id }));
      setFormData((prev) => ({
        ...prev,
        emitidoEn: now,
        emitidoPor: userData?.user?.id,
        emitidoPorNombre: userName,
      }));
      setSavedDocTypes((prev) => new Set(prev).add(docType));
      toast.success(`${tipoLabel[docType]} guardada en el sistema`);
      if (effectiveRentaId && numToSave) {
        const { error } = await supabase.from("rentas").update({ numero_oficial: numToSave }).eq("id", effectiveRentaId);
        if (error) toast.error(`Documento guardado, pero no se pudo actualizar el expediente: ${error.message}`);
      }
      if (effectiveRentaId && !editId) {
        setTimeout(() => navigate({ to: "/rentas", search: { clienteId: undefined, pagarRentaId: rentaId } }), 1200);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["contratos"] });
    queryClient.invalidateQueries({ queryKey: ["historial"] });
    queryClient.invalidateQueries({ queryKey: ["historial-contratos"] });
    if (rentaId) {
      queryClient.invalidateQueries({ queryKey: ["documentos-renta", rentaId] });
    }
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const fileName = `${docType.charAt(0).toUpperCase() + docType.slice(1)}_${formData.cliente.replace(/\s+/g, "_") || "Cliente"}.pdf`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-3">
          <FileSignature className="size-7 text-gold" />
          Documentos
          {rentaId && (
            <button
              onClick={() => navigate({ to: "/rentas", search: { clienteId: undefined, pagarRentaId: undefined } })}
              className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-semibold hover:bg-blue-500/25 transition-colors"
            >
              ← Renta vinculada
            </button>
          )}
          {editLoading && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-semibold">
              <Loader2 className="size-3 animate-spin" /> Cargando documento...
            </span>
          )}
          {editId && !editLoading && (
            <span className="inline-flex items-center rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-semibold">
              Editando documento
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {editId
            ? "Modificá los datos y generá el PDF nuevamente para reimprimir."
            : "Generación de contratos, proformas, facturas y actas de confirmación en PDF."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Panel Izquierdo: Formulario */}
        <div className="w-full min-w-0 lg:w-7/12 xl:w-1/2 flex flex-col gap-6">
          <DocumentTabs
            activeTab={docType}
            onTabChange={(type) => {
              setDocType(type);
              setBlobUrl(null);
            }}
          />

          <ContratoForm
            docType={docType}
            formData={formData}
            onChange={handleFormChange}
            onVehiculosChange={handleVehiculosChange}
            availableVehicles={availableVehicles}
            availableClients={availableClients}
          />
        </div>

        {/* Panel Derecho: Vista Previa */}
        <div className="w-full min-w-0 lg:w-5/12 xl:w-1/2">
          <PdfPreview
            docType={docType}
            blobUrl={blobUrl}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            fileName={fileName}
            onSave={handleSaveToDB}
            isSaving={isSaving}
            saved={savedDocTypes.has(docType)}
            onViewHistory={() => navigate({ to: "/historial" })}
            onClear={() => {
              setFormData(emptyFormData);
              setBlobUrl(null);
              setSavedDocTypes(new Set());
              setSavedDocIds({});
              if (editId) navigate({ to: "/documentos", search: { editId: undefined, rentaId: undefined } });
            }}
            sinFirma={formData.sinFirma}
            onToggleSinFirma={() => {
              handleFormChange("sinFirma", !formData.sinFirma);
            }}
            sinNotaCredito={formData.sinNotaCredito}
            onToggleSinNotaCredito={() => {
              handleFormChange("sinNotaCredito", !formData.sinNotaCredito);
            }}
            onCalibrate={blobUrl ? () => setIsCalibrating(true) : undefined}
            preprintedMode={preprintedMode}
            onTogglePreprinted={() => setPreprintedMode((prev) => !prev)}
          />
        </div>
      </div>

      {isCalibrating && blobUrl && (
        <CalibrationMode
          initialBlobUrl={blobUrl}
          formData={formData}
          docType={docType}
          onClose={() => setIsCalibrating(false)}
          onSave={() => {
            setIsCalibrating(false);
            handleGenerate();
          }}
        />
      )}
    </div>
  );
}
