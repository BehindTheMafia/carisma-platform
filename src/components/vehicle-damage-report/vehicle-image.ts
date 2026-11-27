import suvImgUrl from "@/assets/SUV.png";
import pickupImgUrl from "@/assets/PICKUP.png";
import sedanImgUrl from "@/assets/SEDAN.png";
import microbusImgUrl from "@/assets/MICROBUS.png";
import camionImgUrl from "@/assets/CAMION.png";
import { getInspectionVehicleType } from "@/lib/vehicle-types";
import type { TipoVehiculo } from "./types";

export function getVehicleImageUrl(tipo: TipoVehiculo | string | undefined): string {
  const category = getInspectionVehicleType(tipo);
  if (category === "Pickup") return pickupImgUrl;
  if (category === "Sedán") return sedanImgUrl;
  if (category === "Microbús") return microbusImgUrl;
  if (category.startsWith("Camión")) return camionImgUrl;
  return suvImgUrl;
}
