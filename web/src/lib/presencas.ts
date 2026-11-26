import type { Presenca } from "./api";

const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });

/** "09:05" a partir de um ISO8601 do servidor; "" se vazio. */
export const horaDe = (iso: string | null) => (iso ? hora.format(new Date(iso)) : "");

/** Total entre entrada e saída sem o almoço, ex.: "7 h 30 min"; "" se ainda sem saída. */
export function totalHoras(p: Pick<Presenca, "entrada" | "saida" | "almoco_min">): string {
  const min = minutosPeriodo(p);
  return min === null ? "" : duracaoTexto(min);
}

export const dataPt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

type Periodo = Pick<Presenca, "entrada" | "saida" | "almoco_min">;

/** Minutos de um período fechado, sem o almoço; null se ainda em curso. */
export function minutosPeriodo(p: Periodo): number | null {
  if (!p.saida) return null;
  const bruto = Math.round((Date.parse(p.saida) - Date.parse(p.entrada)) / 60000);
  return Math.max(0, bruto - (p.almoco_min ?? 0));
}

/** 270 -> "4 h 30 min". */
export const duracaoTexto = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;

/** Soma dos períodos fechados (sem almoço); os em curso não contam. */
export const totalMinutos = (ps: Periodo[]) => ps.reduce((s, p) => s + (minutosPeriodo(p) ?? 0), 0);

/** "08:00 às 12:00 · 4 h 00 min" ou "14:00 · em curso". */
export function textoPeriodo(p: Periodo): string {
  const min = minutosPeriodo(p);
  return min === null ? `${horaDe(p.entrada)} · em curso` : `${horaDe(p.entrada)} às ${horaDe(p.saida)} · ${duracaoTexto(min)}`;
}

export interface GrupoDia {
  chave: string;
  data: string;
  user: Presenca["user"];
  user_id: number;
  periodos: Presenca[];
  minutos: number;
  emCurso: boolean;
}

/** Agrupa os períodos por dia e pessoa: dias recentes primeiro, nome A-Z, períodos por hora de entrada. */
export function agruparPorDia(linhas: Presenca[]): GrupoDia[] {
  const mapa = new Map<string, GrupoDia>();
  for (const p of linhas) {
    const chave = `${p.data}|${p.user_id}`;
    let g = mapa.get(chave);
    if (!g) {
      g = { chave, data: p.data, user: p.user, user_id: p.user_id, periodos: [], minutos: 0, emCurso: false };
      mapa.set(chave, g);
    }
    g.periodos.push(p);
  }
  const grupos = [...mapa.values()];
  for (const g of grupos) {
    g.periodos.sort((a, b) => Date.parse(a.entrada) - Date.parse(b.entrada));
    g.minutos = totalMinutos(g.periodos);
    g.emCurso = g.periodos.some((p) => !p.saida);
  }
  return grupos.sort((a, b) => b.data.localeCompare(a.data) || (a.user?.nome ?? "").localeCompare(b.user?.nome ?? ""));
}
