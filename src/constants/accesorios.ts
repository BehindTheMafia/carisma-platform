export interface AccesorioItem {
  key: string;
  label: string;
}

export const ALL_ACCESORIOS: AccesorioItem[] = [
  { key: "circulacion", label: "Circulación" },
  { key: "seguro", label: "Seguro" },
  { key: "llave", label: "Llave principal" },
  { key: "radio", label: "Radio / Multimedia" },
  { key: "camara", label: "Cámara de retroceso" },
  { key: "bocina", label: "Bocina de retroceso" },
  { key: "antivuelco", label: "Antivuelco" },
  { key: "baca", label: "Baca" },
  { key: "alogenos", label: "Par de alógenos" },
  { key: "traba", label: "Traba tuercas" },
  { key: "herramientas", label: "Herramientas básicas" },
  { key: "gata", label: "Gata hidráulica" },
  { key: "repuesto", label: "Llanta de repuesto" },
  { key: "triangulos", label: "Triángulos de seguridad" },
];

export type AccesoriosMap = Record<string, boolean>;

export function accesoriosFromArray(keys: string[]): AccesoriosMap {
  const map: AccesoriosMap = {};
  for (const item of ALL_ACCESORIOS) {
    map[item.key] = keys.includes(item.key);
  }
  return map;
}
