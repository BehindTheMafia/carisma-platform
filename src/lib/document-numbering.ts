/** Identifica 0045 y 45 como el mismo número, sin alterar números alfanuméricos. */
export function claveNumeroDocumento(value: string | null | undefined): string {
  const text = (value ?? "").trim().toUpperCase();
  if (/^\d+$/.test(text)) return text.replace(/^0+(?=\d)/, "");
  return text;
}

export function numerosParaDocumento(
  tipo: string,
  data: { docNum?: string; facturaNum?: string; facturaModo?: string },
): string[] {
  const conceptOnly = tipo === "factura" && data.facturaModo === "conceptos";
  const numbers = [
    ...(!conceptOnly && data.docNum?.trim() ? [data.docNum.trim()] : []),
    ...(tipo === "factura" && data.facturaNum?.trim() ? [data.facturaNum.trim()] : []),
  ];
  return [...new Map(numbers.map((number) => [claveNumeroDocumento(number), number])).values()];
}
