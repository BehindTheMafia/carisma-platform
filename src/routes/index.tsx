import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "TM RENT A CAR — Renta de Vehículos en Managua" },
      { name: "description", content: "Renta de vehículos en Managua, Nicaragua. Flota moderna, precios competitivos, seguro incluido y reserva rápida por WhatsApp." },
      { name: "keywords", content: "renta de autos, renta de vehículos, Managua, Nicaragua, alquiler de coches, SUV, Pickup, Sedán, Microbús" },
      { name: "author", content: "TM RENT A CAR" },
      { property: "og:title", content: "TM RENT A CAR — Renta de Vehículos en Managua" },
      { property: "og:description", content: "Flota moderna, precios competitivos y el mejor servicio de renta de autos en Nicaragua." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tmrentacar.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://tmrentacar.com" },
    ],
  }),
  component: LandingPage,
});
