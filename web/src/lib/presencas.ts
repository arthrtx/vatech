import type { Presenca } from "./api";

const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** "09:05" a partir de um ISO8601 do servidor; "" se vazio. */
export const horaDe = (iso: string | null) => (iso ? hora.format(new Date(iso)) : "");

/** Total entre entrada e saída, ex.: "7 h 30 min"; "" se ainda sem saída. */
export function totalHoras(p: Pick<Presenca, "entrada" | "saida">): string {
  if (!p.saida) return "";
  const min = Math.max(0, Math.round((Date.parse(p.saida) - Date.parse(p.entrada)) / 60000));
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

export const dataPt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
