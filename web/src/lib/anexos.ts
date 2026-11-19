// Limites iguais aos do backend (AnexoController): 5 ficheiros por pedido, 5 MB cada.
export const MAX_ANEXOS = 5;
export const MAX_BYTES = 5 * 1024 * 1024;
export const EXTENSOES = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt"];
export const ACEITA = EXTENSOES.map((e) => `.${e}`).join(",");

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Devolve o motivo de recusa do ficheiro, ou null se for aceite. */
export function validarFicheiro(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSOES.includes(ext)) return `"${f.name}": tipo não permitido (use imagem, PDF, Word, Excel ou texto).`;
  if (f.size > MAX_BYTES) return `"${f.name}": passa os 5 MB.`;
  return null;
}
