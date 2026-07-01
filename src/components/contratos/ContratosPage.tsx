import { useState, useEffect } from "react";
import { DocumentTabs } from "./DocumentTabs";
import { ContratoForm, type FormData } from "./ContratoForm";
import { PdfPreview } from "./PdfPreview";
import { generatePDF } from "@/utils/pdfGenerator";
import { FileSignature } from "lucide-react";

const initialFormData: FormData = {
  fechaDoc: new Date().toISOString().split("T")[0],
  facturaNum: "",
  ciudad: "Managua",
  cliente: "",
  ruc: "",
  correo: "",
  telefono: "",
  direccion: "",
  conductor: "",
  vehiculos: [{ id: Date.now(), name: "", model: "", days: 1, price: 0 }],
  vehiculo: "",
  tipoVehiculo: "SUV",
  modelo: "",
  transmision: "",
  placa: "",
  detalles: "",
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
  tasa: 36.5,
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
};

export function ContratosPage() {
  const [docType, setDocType] = useState("proforma");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (formData.frec && formData.fdev) {
      const d1 = new Date(formData.frec);
      const d2 = new Date(formData.fdev);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      if (diffDays > 0 && diffDays !== formData.dias) {
        setFormData((prev) => ({
          ...prev,
          dias: diffDays,
          choferDias: prev.choferDias === 0 ? diffDays : prev.choferDias,
          viaticosDias: prev.viaticosDias === 0 ? diffDays : prev.viaticosDias,
          hospedajeDias: prev.hospedajeDias === 0 ? diffDays : prev.hospedajeDias,
        }));
      }
    }
  }, [formData.frec, formData.fdev]);

  const handleFormChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehiculosChange = (vehiculos: FormData["vehiculos"]) => {
    setFormData((prev) => ({ ...prev, vehiculos }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    setTimeout(async () => {
      try {
        const doc = await generatePDF({ ...formData, docType });

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
        alert("Ocurrió un error al generar el PDF: " + (error as Error).message);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const fileName = `${docType.charAt(0).toUpperCase() + docType.slice(1)}_${formData.cliente.replace(/\s+/g, "_") || "Cliente"}.pdf`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileSignature className="size-7 text-gold" />
          Contratos
        </h1>
        <p className="text-sm text-muted-foreground">
          Generación de contratos, proformas, facturas y actas de confirmación en PDF.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Panel Izquierdo: Formulario */}
        <div className="w-full lg:w-7/12 xl:w-1/2 flex flex-col gap-6">
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
          />
        </div>

        {/* Panel Derecho: Vista Previa */}
        <div className="w-full lg:w-5/12 xl:w-1/2">
          <PdfPreview
            docType={docType}
            blobUrl={blobUrl}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            fileName={fileName}
          />
        </div>
      </div>
    </div>
  );
}
