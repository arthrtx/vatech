export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Filtra `itens` pelos campos devolvidos por `campos`; query vazia devolve tudo. */
export function filtrar<T>(itens: T[], query: string, campos: (item: T) => (string | null | undefined)[]): T[] {
  const q = normalizar(query);
  if (!q) return itens;
  return itens.filter((item) => campos(item).some((c) => c != null && normalizar(c).includes(q)));
}
