import type { Limite } from "./api";

/** Dias úteis de férias por marcar (dias_ano + transitados - usados); null = sem limite. */
export function feriasPorMarcar(l: Limite | undefined): number | null {
  return l?.dias_ano == null ? null : Math.max(0, l.dias_ano + l.transitados - l.usados);
}

/** Depois do prazo (YYYY-MM-DD)? Datas ISO comparam-se como texto. */
export const passouPrazo = (hoje: string, prazo: string) => hoje > prazo;

export const diasTxt = (n: number) => `${n} ${n === 1 ? "dia útil" : "dias úteis"}`;

const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** «30 de abril» a partir de YYYY-MM-DD. */
export const prazoTxt = (prazo: string) => `${Number(prazo.slice(8, 10))} de ${meses[Number(prazo.slice(5, 7)) - 1]}`;
