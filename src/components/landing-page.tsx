import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { INSPECTION_VEHICLE_TYPES, getVehicleTypeLabel } from "@/lib/vehicle-types";
import type { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Car, Calendar, MapPin, Users, Snowflake, Fuel,
  Shield, Headphones, ScrollText, Clock,
  Star, Search, Menu, X, Phone, ArrowRight, Check, Gauge,
  MessagesSquare, Building2, Mail, ChevronUp, ChevronLeft, ChevronRight,
  Compass, Layers, CarFront, Truck, Bus
} from "lucide-react";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const;
const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

type Vehiculo = Tables<"vehiculos">;
type Foto = { id: string; path: string; url: string; name: string };

const WHATSAPP_NUMBER = "50583866806";
const COMPANY_NAME = "TM RENT A CAR";
const COMPANY_EMAIL = "rentcartm26@gmail.com";
const COMPANY_PHONE = "8386-6806";
const COMPANY_ADDRESS = "BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E.";
const HERO_IMG = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1920&q=80";

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildWhatsAppMessage(vehiculo: Vehiculo, startDate?: string, endDate?: string): string {
  const lines = [
    `Hola, me interesa rentar el siguiente vehículo:`,
    ``,
    `🚗 ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
    ``,
    `Precio por día: ${formatCurrency(vehiculo.tarifa_diaria, vehiculo.moneda)}`,
  ];
  if (startDate && endDate) {
    lines.push(``, `Fechas:`);
    lines.push(`📅 Retiro: ${startDate}`);
    lines.push(`📅 Devolución: ${endDate}`);
  }
  lines.push(``, `¿Podrían confirmar la disponibilidad?`, `Gracias.`);
  return lines.join("\n");
}

function openWhatsApp(vehiculo: Vehiculo, startDate?: string, endDate?: string) {
  const msg = buildWhatsAppMessage(vehiculo, startDate, endDate);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
}

function openWhatsAppGeneral() {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
}

function getFirstPhoto(vehiculo: Vehiculo): string | null {
  const fotos = (vehiculo.fotos as Foto[]) ?? [];
  return fotos.length > 0 ? fotos[0].url : null;
}

function getAllPhotos(vehiculo: Vehiculo): Foto[] {
  return (vehiculo.fotos as Foto[]) ?? [];
}

function getEstadoBadge(estado: string) {
  if (estado === "disponible") return { label: "Disponible", class: "bg-success text-success-foreground" };
  if (estado === "rentado" || estado === "reservado") return { label: "No disponible", class: "bg-destructive text-destructive-foreground" };
  if (estado === "mantenimiento") return { label: "Mantenimiento", class: "bg-warning text-warning-foreground" };
  return { label: estado, class: "bg-muted text-muted-foreground" };
}

function getTipoVehiculoLabel(tipo: string | null): string {
  return getVehicleTypeLabel(tipo, "Vehículo");
}

const testimonios = [
  { nombre: "Carlos M.", texto: "Excelente servicio, vehículos en perfecto estado y muy puntuales en la entrega. Sin duda la mejor opción en Managua.", rating: 5 },
  { nombre: "María F.", texto: "Renté un SUV para un viaje familiar. Todo perfecto, el proceso muy rápido y el vehículo impecable. Muy recomendados.", rating: 5 },
  { nombre: "José A.", texto: "Profesionalismo de principio a fin. Precios justos y atención personalizada. Ya soy cliente recurrente.", rating: 5 },
  { nombre: "Ana L.", texto: "La atención fue increíble, me ayudaron a elegir el vehículo ideal para mi viaje. Volveré a rentar sin duda.", rating: 5 },
];

const faqs = [
  { q: "¿Qué requisitos necesito para rentar un vehículo?", a: "Debes ser mayor de 25 años, presentar cédula de identidad o pasaporte vigente, licencia de conducir al día y una tarjeta de crédito o débito para el depósito en garantía." },
  { q: "¿Qué incluye el precio de renta?", a: "El precio incluye seguro básico, kilometraje libre, mantenimiento preventivo y asistencia en carretera 24/7. No incluye combustible ni peajes." },
  { q: "¿Puedo devolver el vehículo en otra ciudad?", a: "Sí, ofrecemos opción de devolución en otra ciudad. Aplican cargos adicionales. Consulta con nuestro equipo para más detalles." },
  { q: "¿Qué tipos de seguro ofrecen?", a: "Ofrecemos seguro básico (incluido en la tarifa) y seguro premium con cobertura amplia sin deducible. Puedes contratarlo al momento de la reserva." },
  { q: "¿Puedo cancelar o modificar mi reserva?", a: "Sí, puedes cancelar o modificar tu reserva sin costo hasta 48 horas antes del inicio. Después de ese plazo puede aplicar un cargo." },
  { q: "¿Ofrecen servicio de chofer?", a: "Sí, contamos con servicio de chofer profesional disponible por día. Consulta tarifas con nuestro equipo." },
];

const categorias = ["Todas", ...INSPECTION_VEHICLE_TYPES, "Camioneta"];
const transmisiones = ["Todas", "Manual", "Automática"];
const combustibles = ["Todos", "Gasolina", "Diesel", "Híbrido", "Eléctrico"];

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "Todas": return Car;
    case "SUV": return Compass;
    case "Sedán": return CarFront;
    case "Pickup": return Truck;
    case "Microbús": return Bus;
    case "Camioneta": return Layers;
    default: return Car;
  }
}

function FadeInSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [transmissionFilter, setTransmissionFilter] = useState("Todas");
  const [fuelFilter, setFuelFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<"precio-asc" | "precio-desc" | "nombre">("nombre");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehiculo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [categoryHighlightStyle, setCategoryHighlightStyle] = useState<React.CSSProperties>({ transform: "translateX(0px)", width: 0, opacity: 0 });

  const handleNavLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (href === "#") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const id = href.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 64;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", () => setCurrentIndex(carouselApi.selectedScrollSnap()));
  }, [carouselApi]);

  useEffect(() => {
    const updateHighlight = () => {
      const selectedButton = categoryButtonRefs.current[categoryFilter];
      const container = categoryContainerRef.current;
      if (selectedButton && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        setCategoryHighlightStyle({
          transform: `translateX(${buttonRect.left - containerRect.left + container.scrollLeft}px)`,
          width: buttonRect.width,
          opacity: 1
        });
      }
    };

    updateHighlight();

    const container = categoryContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateHighlight);
    }

    window.addEventListener("resize", updateHighlight);

    const timer = setTimeout(updateHighlight, 100);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      if (container) {
        container.removeEventListener("scroll", updateHighlight);
      }
      clearTimeout(timer);
    };
  }, [categoryFilter]);

  const { data: vehiculos = [], isLoading, error } = useQuery({
    queryKey: ["landing-vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("*")
        .is("deleted_at", null)
        .neq("estado", "mantenimiento")
        .neq("estado", "fuera_servicio")
        .order("marca");
      if (error) throw error;
      return (data ?? []) as Vehiculo[];
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: rentedVehicleIds = [] } = useQuery({
    queryKey: ["landing-rented", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("rentas")
        .select("vehiculo_id")
        .in("estado", ["reservada", "activa"])
        .lt("fecha_inicio", e.toISOString())
        .gt("fecha_devolucion", s.toISOString())
        .is("deleted_at", null);
      return (data ?? []).map((r) => r.vehiculo_id);
    },
    enabled: !!startDate && !!endDate,
    refetchInterval: 30_000,
  });

  const availableVehicles = useMemo(() => {
    if (startDate && endDate && rentedVehicleIds.length > 0) {
      return vehiculos.filter((v) => !rentedVehicleIds.includes(v.id));
    }
    return vehiculos;
  }, [vehiculos, rentedVehicleIds, startDate, endDate]);

  const filteredVehicles = useMemo(() => {
    let result = [...availableVehicles];
    if (categoryFilter !== "Todas") {
      result = result.filter((v) => getTipoVehiculoLabel(v.tipo_vehiculo) === categoryFilter);
    }
    if (transmissionFilter !== "Todas") {
      result = result.filter((v) => {
        const t = v.transmision?.toLowerCase() || "";
        if (transmissionFilter === "Manual") return t === "manual";
        if (transmissionFilter === "Automática") return t === "automatica";
        return true;
      });
    }
    if (fuelFilter !== "Todos") {
      result = result.filter((v) => {
        const c = v.combustible?.toLowerCase() || "";
        if (fuelFilter === "Gasolina") return c === "gasolina";
        if (fuelFilter === "Diesel") return c === "diesel";
        if (fuelFilter === "Híbrido") return c === "hibrido";
        if (fuelFilter === "Eléctrico") return c === "electrico";
        return true;
      });
    }
    if (sortBy === "precio-asc") result.sort((a, b) => a.tarifa_diaria - b.tarifa_diaria);
    else if (sortBy === "precio-desc") result.sort((a, b) => b.tarifa_diaria - a.tarifa_diaria);
    else result.sort((a, b) => a.marca.localeCompare(b.marca));
    return result;
  }, [availableVehicles, categoryFilter, transmissionFilter, fuelFilter, sortBy]);

  const handleVehicleClick = useCallback((v: Vehiculo) => {
    setSelectedVehicle(v);
    setDetailOpen(true);
  }, []);

  const heroSlides = [
    { img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1920&q=80", subtitle: "SUV de lujo para toda ocasión" },
    { img: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1920&q=80", subtitle: "Pickups robustas para trabajo y aventura" },
    { img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1920&q=80", subtitle: "Sedanes elegantes para tu día a día" },
  ];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setHeroIdx((p) => (p + 1) % heroSlides.length), 6000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (detailOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [detailOpen]);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" onClick={(e) => handleNavLinkClick(e, "#")} className="flex items-center gap-2.5 group">
            <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.35_0.16_250)] text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[3deg]">
              <Car className="size-5" strokeWidth={2.4} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-foreground">
                TM <span className="text-gold">RENT</span>
              </span>
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">A Car</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {[
              { label: "Vehículos", href: "#vehiculos" },
              { label: "¿Por qué nosotros?", href: "#porque" },
              { label: "Opiniones", href: "#opiniones" },
              { label: "FAQ", href: "#faq" },
              { label: "Ubicación", href: "#ubicacion" },
            ].map((item) => (
              <a key={item.href} href={item.href} onClick={(e) => handleNavLinkClick(e, item.href)}
                className="relative text-muted-foreground hover:text-foreground transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-gold after:transition-all after:duration-200 after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:after:w-full">
                {item.label}
              </a>
            ))}
            <Button size="sm" className="gap-2 rounded-full bg-gold hover:bg-gold/90 text-gold-foreground transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]" onClick={openWhatsAppGeneral}>
              <Phone className="size-3.5" />
              Contáctanos
            </Button>
          </nav>

          <button className="md:hidden grid size-9 place-items-center rounded-lg hover:bg-muted transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menú">
            {mobileMenuOpen ? <X className="size-5 text-foreground" /> : <Menu className="size-5 text-foreground" />}
          </button>
        </div>

        <div className={cn("md:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
          <div className="border-t border-border/50 px-4 py-4 space-y-3 bg-background/95 backdrop-blur-xl">
            {[
              { label: "Vehículos", href: "#vehiculos" },
              { label: "¿Por qué nosotros?", href: "#porque" },
              { label: "Opiniones", href: "#opiniones" },
              { label: "FAQ", href: "#faq" },
              { label: "Ubicación", href: "#ubicacion" },
            ].map((item) => (
              <a key={item.href} href={item.href} onClick={(e) => handleNavLinkClick(e, item.href)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] select-none">
                {item.label}
              </a>
            ))}
            <Button className="w-full gap-2 rounded-full bg-gold hover:bg-gold/90 text-gold-foreground transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]" onClick={openWhatsAppGeneral}>
              <Phone className="size-4" />
              Contáctanos
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          {heroSlides.map((slide, i) => (
            <img key={i} src={slide.img} alt=""
              className={cn("absolute inset-0 h-full w-full object-cover transition-all duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)]", i === heroIdx ? "opacity-100 scale-100" : "opacity-0 scale-110")}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_SMOOTH }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium mb-6">
              <Star className="size-3 fill-gold text-gold" />
              Renta de vehículos en Managua
            </div>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: EASE_SMOOTH }}
            >
              Conduce el{" "}
              <span className="text-gold">vehículo</span>
              <br />
              de tus sueños
            </motion.h1>
            <motion.p
              className="mt-5 max-w-lg text-base sm:text-lg text-white/60 leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE_SMOOTH }}
            >
              Flota moderna, precios competitivos y el mejor servicio de renta de autos en Nicaragua.
              Reserva hoy y descubre una nueva forma de viajar.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-10 w-full max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE_SMOOTH }}
          >
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 sm:p-6 shadow-2xl shadow-black/20">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Calendar className="size-3" /> Fecha de retiro
                  </label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 [color-scheme:dark] focus:border-gold focus:ring-gold/30 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <Calendar className="size-3" /> Fecha de devolución
                  </label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 [color-scheme:dark] focus:border-gold focus:ring-gold/30 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    min={startDate || new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <MapPin className="size-3" /> Lugar de entrega
                  </label>
                  <Input type="text" value={deliveryPlace} onChange={(e) => setDeliveryPlace(e.target.value)}
                    placeholder="Managua"
                    className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-gold focus:ring-gold/30 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  />
                </div>
                <div className="flex items-end">
                  <Button size="lg" className="w-full h-10 bg-gold hover:bg-gold/90 text-gold-foreground font-semibold rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-lg hover:shadow-gold/20 active:scale-[0.96] cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById("vehiculos");
                      if (element) {
                        const headerOffset = 64;
                        const elementPosition = element.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                      }
                    }}
                  >
                    <Search className="size-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        {/* Hero dots */}
        <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setHeroIdx(i)}
              className={cn("rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer hover:scale-125", i === heroIdx ? "h-8 w-1.5 bg-gold" : "h-1.5 w-1.5 bg-white/40 hover:bg-white/60")}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* VEHÍCULOS */}
      <section id="vehiculos" className="relative z-10 -mt-1 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">NUESTRA FLOTA</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Vehículos <span className="text-gold">disponibles</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                {startDate && endDate
                  ? `Disponibles del ${formatDate(new Date(startDate))} al ${formatDate(new Date(endDate))}`
                  : "Explora nuestra flota de vehículos modernos y bien equipados"}
              </p>
            </div>
          </FadeInSection>

          {/* CATEGORY CHIPS WITH SLIDING HIGHLIGHT */}
          <div className="mb-6 relative">
            <div
              ref={categoryContainerRef}
              className="relative flex gap-2.5 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
            >
              <div
                className="absolute top-0 bottom-3 rounded-full bg-primary shadow-lg shadow-primary/20 pointer-events-none"
                style={{
                  ...categoryHighlightStyle,
                  transition: `transform 400ms ${EASE_CSS}, width 400ms ${EASE_CSS}, opacity 300ms ${EASE_CSS}`,
                }}
              />

              {categorias.map((c) => {
                const Icon = getCategoryIcon(c);
                const isSelected = categoryFilter === c;
                return (
                  <button
                    key={c}
                    ref={(el) => { categoryButtonRefs.current[c] = el; }}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      "relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0 border cursor-pointer select-none active:scale-[0.96]",
                      isSelected
                        ? "text-primary-foreground border-transparent"
                        : "bg-card text-muted-foreground border-border/80 hover:border-muted-foreground/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                    <span>{c === "Todas" ? "Todos" : getTipoVehiculoLabel(c)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECONDARY FILTERS */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-card/45 backdrop-blur-md border border-border/50 p-4 rounded-2xl">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1">Filtros:</span>
              <Select value={transmissionFilter} onValueChange={setTransmissionFilter}>
                <SelectTrigger className="w-[145px] h-9 text-xs bg-background border-border/60 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/30">
                  <SelectValue placeholder="Transmisión" />
                </SelectTrigger>
                <SelectContent>
                  {transmisiones.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={fuelFilter} onValueChange={setFuelFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-background border-border/60 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/30">
                  <SelectValue placeholder="Combustible" />
                </SelectTrigger>
                <SelectContent>
                  {combustibles.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">Ordenar:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[155px] h-9 text-xs bg-background border-border/60 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/30">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre">Nombre A-Z</SelectItem>
                  <SelectItem value="precio-asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="precio-desc">Precio: mayor a menor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RESULTS */}
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: EASE_PREMIUM }}
                >
                  <Card className="overflow-hidden border-border/60 rounded-2xl">
                    <Skeleton className="h-52 w-full rounded-none" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_PREMIUM }}
            >
              <div className="size-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <X className="size-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Error al cargar vehículos</h3>
              <p className="text-muted-foreground mt-1">Intenta de nuevo más tarde</p>
              <Button variant="outline" className="mt-4 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </motion.div>
          ) : filteredVehicles.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_PREMIUM }}
            >
              <div className="size-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Car className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No hay vehículos disponibles</h3>
              <p className="text-muted-foreground mt-1">
                {startDate && endDate
                  ? "No hay vehículos disponibles para las fechas seleccionadas. Intenta con otras fechas."
                  : "No hay vehículos disponibles en este momento."}
              </p>
            </motion.div>
          ) : (
            <>
              <motion.p
                className="text-xs font-semibold text-muted-foreground mb-4 tracking-wide uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_PREMIUM }}
              >
                {filteredVehicles.length} vehículo{filteredVehicles.length !== 1 ? "s" : ""} encontrado{filteredVehicles.length !== 1 ? "s" : ""}
              </motion.p>
              <div
                key={`${categoryFilter}-${transmissionFilter}-${fuelFilter}-${sortBy}`}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredVehicles.map((v, index) => {
                  const foto = getFirstPhoto(v);
                  const badge = getEstadoBadge(v.estado);
                  return (
                    <motion.div
                      key={v.id}
                      layoutId={`vehicle-container-${v.id}`}
                      className="group overflow-hidden border border-border/50 bg-card rounded-2xl cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-elevated hover:border-gold/30 hover:-translate-y-1"
                      onClick={() => handleVehicleClick(v)}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.04, ease: EASE_PREMIUM, layout: { duration: 0.5, ease: EASE_PREMIUM } }}
                    >
                      <div className="relative h-52 bg-muted overflow-hidden">
                        {foto ? (
                          <motion.img
                            layoutId={`vehicle-image-${v.id}`}
                            src={foto}
                            alt={`${v.marca} ${v.modelo}`}
                            className="h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-gold/5 blur-xl" />
                            <div className="absolute -left-8 -top-8 size-32 rounded-full bg-primary/10 blur-xl" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                              <div className="size-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-3 shadow-lg transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[3deg] group-hover:bg-white/10 group-hover:border-gold/20">
                                <Car className="size-7 text-gold" strokeWidth={1.5} />
                              </div>
                              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-gold/80 mb-0.5">TM RENT A CAR</span>
                              <span className="text-[10px] text-white/40 font-medium">Foto en preparación</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />

                        <div className="absolute top-3 left-3">
                          <Badge className={cn("text-[10px] font-bold tracking-wide border-0 shadow-lg px-2.5 py-1 backdrop-blur-md bg-opacity-95 rounded-full flex items-center gap-1.5", badge.class)}>
                            <span className={cn("size-1.5 rounded-full", v.estado === "disponible" ? "bg-emerald-400" : "bg-red-400")} />
                            {badge.label}
                          </Badge>
                        </div>
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="text-[10px] font-bold bg-background/85 backdrop-blur-md shadow-lg rounded-full border border-border/30">
                            {getTipoVehiculoLabel(v.tipo_vehiculo)}
                          </Badge>
                        </div>
                      </div>

                      <motion.div
                        layoutId={`vehicle-content-${v.id}`}
                        className="p-5 flex flex-col justify-between min-h-[220px]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-base text-foreground group-hover:text-gold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] leading-snug">
                                {v.marca} {v.modelo}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{v.anio}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-extrabold text-gold leading-none">{formatCurrency(v.tarifa_diaria, v.moneda)}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Por día</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/20 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-muted/60">
                              <Gauge className="size-3.5 text-primary/70 shrink-0" />
                              <span className="truncate font-medium">
                                {v.transmision === "automatica" ? "Aut." : v.transmision === "manual" ? "Man." : v.transmision || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/20 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-muted/60">
                              <Users className="size-3.5 text-primary/70 shrink-0" />
                              <span className="truncate font-medium">{v.capacidad || "—"} pas.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/20 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-muted/60">
                              <Snowflake className="size-3.5 text-primary/70 shrink-0" />
                              <span className="truncate font-medium">A/C</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/20 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-muted/60">
                              <Fuel className="size-3.5 text-primary/70 shrink-0" />
                              <span className="truncate font-medium">
                                {v.combustible ? v.combustible.charAt(0).toUpperCase() + v.combustible.slice(1) : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Separator className="my-4 bg-border/40" />
                          <Button
                            className={cn(
                              "w-full gap-2 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] font-semibold active:scale-[0.96] cursor-pointer",
                              v.estado === "disponible"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(v, startDate ? formatDate(new Date(startDate)) : undefined, endDate ? formatDate(new Date(endDate)) : undefined);
                            }}
                          >
                            <MessagesSquare className="size-4 shrink-0" />
                            {v.estado === "disponible" ? "Reservar por WhatsApp" : "Consultar Disponibilidad"}
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* WHY US */}
      <section id="porque" className="bg-card border-y border-border/60 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">¿POR QUÉ NOSOTROS?</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                La mejor <span className="text-gold">experiencia</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Más de 10 años brindando el mejor servicio de renta de vehículos en Nicaragua</p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: "Flota moderna", desc: "Vehículos recientes con mantenimiento preventivo y seguro incluido." },
              { icon: Headphones, title: "Soporte 24/7", desc: "Asistencia en carretera y atención al cliente los 365 días del año." },
              { icon: ScrollText, title: "Sin sorpresas", desc: "Precios transparentes, sin cargos ocultos. Pagas lo que ves." },
              { icon: Clock, title: "Reserva rápida", desc: "Proceso 100% digital. Reserva en minutos por WhatsApp o web." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: EASE_PREMIUM }}
              >
                <Card className="group border-border/60 text-center p-6 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-elevated hover:-translate-y-1.5 h-full">
                  <div className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[3deg] group-hover:from-primary/20 group-hover:to-primary/10">
                    <item.icon className="size-6 text-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="opiniones" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">OPINIONES</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Lo que dicen <span className="text-gold">nuestros clientes</span>
              </h2>
            </div>
          </FadeInSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonios.map((t, i) => (
              <motion.div
                key={t.nombre}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: EASE_PREMIUM }}
              >
                <Card className="group border-border/60 p-6 rounded-2xl relative transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-elevated hover:-translate-y-1">
                  <div className="text-gold/20 absolute top-4 right-4 text-4xl font-serif leading-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-gold/40 group-hover:scale-110">"</div>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (<Star key={i} className="size-4 fill-gold text-gold" />))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.texto}"</p>
                  <p className="text-sm font-semibold text-foreground">— {t.nombre}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-card border-y border-border/60 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <FadeInSection>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">FAQ</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Preguntas <span className="text-gold">frecuentes</span>
              </h2>
            </div>
          </FadeInSection>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/60">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:text-gold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-left py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* LOCATION */}
      <section id="ubicacion" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">UBICACIÓN</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Visítanos en <span className="text-gold">Managua</span>
              </h2>
            </div>
          </FadeInSection>

          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <motion.div
              className="rounded-2xl overflow-hidden border border-border/60 h-[300px] sm:h-[400px] shadow-elevated"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE_PREMIUM }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3900.5!2d-86.25!3d12.15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDA5JzAwLjAiTiA4NsKwMTUnMDAuMCJX!5e0!3m2!1ses!2sni!4v1"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title="Ubicación TM RENT A CAR"
              />
            </motion.div>
            <div className="space-y-5">
              {[
                { icon: MapPin, title: "Dirección", value: COMPANY_ADDRESS, href: null },
                { icon: Phone, title: "Teléfono", value: `+${WHATSAPP_NUMBER.slice(0, 3)} ${WHATSAPP_NUMBER.slice(3)}`, href: `tel:+${WHATSAPP_NUMBER}` },
                { icon: Mail, title: "Correo electrónico", value: COMPANY_EMAIL, href: `mailto:${COMPANY_EMAIL}` },
                { icon: Clock, title: "Horario de atención", value: "Lun-Sáb: 8:00 AM — 6:00 PM\nDom: 9:00 AM — 2:00 PM", href: null },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="flex items-start gap-4 group"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: EASE_PREMIUM }}
                >
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:from-primary/20 group-hover:to-primary/10">
                    <item.icon className="size-5 text-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                    {item.href ? (
                      <a href={item.href} className="text-sm text-gold hover:underline mt-0.5 block transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]">{item.value}</a>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{item.value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-sidebar text-sidebar-foreground px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5 mb-4 group">
                <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-gold to-[oklch(0.55_0.1_75)] text-gold-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:rotate-[3deg]">
                  <Car className="size-5" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-base font-bold tracking-tight text-sidebar-foreground">TM <span className="text-gold">RENT</span></span>
                  <span className="text-[0.55rem] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">A Car</span>
                </div>
              </div>
              <p className="text-sm text-sidebar-foreground/50 leading-relaxed">Renta de vehículos en Managua. Flota moderna, precios competitivos y el mejor servicio.</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-sidebar-foreground mb-4">Enlaces</h4>
              <ul className="space-y-2.5 text-sm text-sidebar-foreground/50">
                {[{ label: "Vehículos", href: "#vehiculos" }, { label: "¿Por qué nosotros?", href: "#porque" }, { label: "Opiniones", href: "#opiniones" }, { label: "FAQ", href: "#faq" }].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} onClick={(e) => handleNavLinkClick(e, l.href)} className="hover:text-gold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-0.5 inline-block">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-sidebar-foreground mb-4">Contacto</h4>
              <ul className="space-y-2.5 text-sm text-sidebar-foreground/50">
                <li className="flex items-start gap-2"><MapPin className="size-3.5 mt-0.5 shrink-0" />{COMPANY_ADDRESS}</li>
                <li><a href={`tel:+${WHATSAPP_NUMBER}`} className="hover:text-gold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center gap-2 hover:translate-x-0.5"><Phone className="size-3.5" />+{WHATSAPP_NUMBER.slice(0, 3)} {WHATSAPP_NUMBER.slice(3)}</a></li>
                <li><a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-gold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center gap-2 hover:translate-x-0.5"><Mail className="size-3.5" />{COMPANY_EMAIL}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-sidebar-foreground mb-4">Síguenos</h4>
              <div className="flex gap-3 mb-6">
                {[
                  { icon: "facebook", href: "#", label: "Facebook" },
                  { icon: "instagram", href: "#", label: "Instagram" },
                ].map((s) => (
                  <a key={s.icon} href={s.href}
                    className="size-10 rounded-xl bg-sidebar-accent flex items-center justify-center hover:bg-gold/20 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:-translate-y-0.5 active:scale-95"
                    aria-label={s.label}
                  >
                    <i className={cn(`fa-brands fa-${s.icon}`, "text-base text-sidebar-foreground/50")} />
                  </a>
                ))}
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="size-10 rounded-xl bg-sidebar-accent flex items-center justify-center hover:bg-gold/20 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:-translate-y-0.5 active:scale-95"
                  aria-label="WhatsApp"
                >
                  <i className="fa-brands fa-whatsapp text-base text-sidebar-foreground/50" />
                </a>
              </div>
              <Button variant="outline" size="sm"
                className="border-sidebar-border text-sidebar-foreground/50 hover:text-gold text-xs rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]"
                onClick={() => window.location.href = "/auth"}
              >
                <Building2 className="size-3 mr-1.5" />
                Acceso administrador
              </Button>
            </div>
          </div>

          <Separator className="my-8 bg-sidebar-border/50" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-sidebar-foreground/30">
            <p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* SCROLL TO TOP */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn("fixed bottom-6 right-6 z-40 size-11 rounded-2xl bg-primary text-primary-foreground shadow-elevated flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary/90 hover:scale-110 active:scale-90",
          showScrollTop ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-75 pointer-events-none"
        )}
        aria-label="Volver arriba"
      >
        <ChevronUp className="size-5" />
      </button>

      {/* VEHICLE DETAIL OVERLAY */}
      <AnimatePresence>
        {detailOpen && selectedVehicle && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_PREMIUM }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
              onClick={() => setDetailOpen(false)}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-0 sm:p-6 pointer-events-none"
            >
              <div className="pointer-events-auto flex flex-col md:grid md:grid-cols-12 w-full max-w-4xl h-full max-h-[100dvh] sm:h-auto sm:max-h-[90vh] bg-card sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-border/50 relative"
              >
                {/* LEFT SIDE: Image */}
                <div className="w-full h-[35dvh] min-h-40 sm:h-[300px] md:h-auto md:col-span-6 shrink-0 relative bg-muted overflow-hidden">
                  {getFirstPhoto(selectedVehicle) ? (
                    <motion.img
                      src={getFirstPhoto(selectedVehicle)!}
                      alt={`${selectedVehicle.marca} ${selectedVehicle.modelo}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 relative">
                      <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-gold/5 blur-xl" />
                      <div className="absolute -left-8 -top-8 size-32 rounded-full bg-primary/10 blur-xl" />
                      <div className="size-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-3">
                        <Car className="size-7 text-gold" strokeWidth={1.5} />
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-gold/80 mb-0.5">TM RENT A CAR</span>
                      <span className="text-[10px] text-white/40 font-medium">Foto en preparación</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4, ease: EASE_PREMIUM }}
                    className="absolute bottom-0 left-0 p-5 text-white z-10"
                  >
                    <h2 className="text-2xl font-bold">{selectedVehicle.marca} {selectedVehicle.modelo}</h2>
                    <p className="text-white/85 text-xs font-semibold uppercase tracking-wider mt-1">{selectedVehicle.anio}</p>
                  </motion.div>
                </div>

                {/* CLOSE BUTTON (over content panel) */}
                <button
                  onClick={() => setDetailOpen(false)}
                  className="absolute top-5 right-5 z-50 size-11 rounded-full bg-white/10 backdrop-blur-[14px] text-white/80 border border-white/20 shadow-sm shadow-black/10 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/20 hover:text-white hover:border-white/30 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md hover:shadow-black/15 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 sm:top-6 sm:right-6"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>

                {/* RIGHT SIDE: Details */}
                <motion.div
                  className="flex-1 md:col-span-6 p-5 sm:p-6 overflow-y-auto max-h-full space-y-6 bg-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1, ease: EASE_PREMIUM }}
                >
                  {getAllPhotos(selectedVehicle).length > 1 && (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.4, ease: EASE_PREMIUM }}
                    >
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Galeria de Fotos</h4>
                      <Carousel setApi={setCarouselApi} className="w-full">
                        <CarouselContent>
                          {getAllPhotos(selectedVehicle).map((foto, idx) => (
                            <CarouselItem key={foto.id} className="basis-1/3">
                              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-85 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border border-border/20">
                                <img src={foto.url} alt={`${selectedVehicle.marca} - Foto ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                      </Carousel>
                      <div className="flex justify-center gap-1.5 pt-1">
                        {getAllPhotos(selectedVehicle).map((_, idx) => (
                          <button key={idx} onClick={() => carouselApi?.scrollTo(idx)}
                            className={cn("h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer hover:scale-125", idx === currentIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4, ease: EASE_PREMIUM }}
                  >
                    <div>
                      <p className="text-3xl font-extrabold text-gold leading-none">{formatCurrency(selectedVehicle.tarifa_diaria, selectedVehicle.moneda)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">Por día</p>
                    </div>
                    <Badge className={cn("text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-full border-0 shadow-sm flex items-center gap-1.5", getEstadoBadge(selectedVehicle.estado).class)}>
                      <span className={cn("size-1.5 rounded-full", selectedVehicle.estado === "disponible" ? "bg-emerald-400" : "bg-red-400")} />
                      {getEstadoBadge(selectedVehicle.estado).label}
                    </Badge>
                  </motion.div>

                  <motion.div
                    className="grid grid-cols-2 gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4, ease: EASE_PREMIUM }}
                  >
                    {[
                      { label: "Transmisión", value: selectedVehicle.transmision === "automatica" ? "Automática" : selectedVehicle.transmision === "manual" ? "Manual" : selectedVehicle.transmision || "—" },
                      { label: "Pasajeros", value: String(selectedVehicle.capacidad || "—") },
                      { label: "Combustible", value: selectedVehicle.combustible ? selectedVehicle.combustible.charAt(0).toUpperCase() + selectedVehicle.combustible.slice(1) : "—" },
                      { label: "Aire acondicionado", value: "Sí" },
                      { label: "Tipo", value: getTipoVehiculoLabel(selectedVehicle.tipo_vehiculo) },
                      { label: "Categoría", value: selectedVehicle.categoria || "—" },
                      { label: "Color", value: selectedVehicle.color || "—" },
                      { label: "Kilometraje", value: `${(selectedVehicle.kilometraje ?? 0).toLocaleString()} km` },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-muted/40 border border-border/20 px-3.5 py-2.5">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70">{s.label}</p>
                        <p className="text-sm font-semibold text-foreground mt-1 leading-none">{s.value}</p>
                      </div>
                    ))}
                  </motion.div>

                  {selectedVehicle.notas && (
                    <motion.div
                      className="bg-muted/20 border border-border/20 p-4 rounded-xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4, ease: EASE_PREMIUM }}
                    >
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1.5">Descripción</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{selectedVehicle.notas}</p>
                    </motion.div>
                  )}

                  <motion.div
                    className="rounded-2xl bg-muted/20 border border-border/30 p-5 space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4, ease: EASE_PREMIUM }}
                  >
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Shield className="size-4 text-gold" /> Condiciones de renta
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {["Incluye seguro básico", "Kilometraje libre", "Asistencia en carretera 24/7", "Depósito en garantía", "Combustible no incluido", "Devolución en Managua"].map((cond) => (
                        <li key={cond} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="size-3.5 text-emerald-500 mt-0.5 shrink-0" /> {cond}
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {startDate && endDate && (
                    <motion.div
                      className="flex items-center gap-4 text-xs bg-muted/30 rounded-2xl p-4 border border-border/60"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4, ease: EASE_PREMIUM }}
                    >
                      <div><p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Retiro</p><p className="font-semibold text-foreground mt-0.5">{formatDate(new Date(startDate))}</p></div>
                      <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      <div><p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Devolución</p><p className="font-semibold text-foreground mt-0.5">{formatDate(new Date(endDate))}</p></div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4, ease: EASE_PREMIUM }}
                  >
                    <Button className="w-full h-12 text-base gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] font-semibold active:scale-[0.96] shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 cursor-pointer"
                      onClick={() => openWhatsApp(selectedVehicle, startDate ? formatDate(new Date(startDate)) : undefined, endDate ? formatDate(new Date(endDate)) : undefined)}
                    >
                      <MessagesSquare className="size-5 shrink-0" />
                      {selectedVehicle.estado === "disponible" ? "Reservar por WhatsApp" : "Consultar Disponibilidad"}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
