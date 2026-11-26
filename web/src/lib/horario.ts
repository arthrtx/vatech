/** Minutos como «1 h», «30 min» ou «1 h 30 min». */
export function duracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

const HHMM = /^\d{2}:\d{2}$/;
const paraMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Minutos de trabalho da jornada (saída - entrada - almoço); null se a janela for inválida. */
export function jornadaMin(entrada: string, saida: string, almocoMin: number): number | null {
  if (!HHMM.test(entrada) || !HHMM.test(saida)) return null;
  const t = paraMin(saida) - paraMin(entrada) - almocoMin;
  return t > 0 ? t : null;
}

/** Fim do almoço = início + duração (HH:MM); null se o início for inválido. */
export function fimAlmoco(inicio: string, min: number): string | null {
  if (!HHMM.test(inicio)) return null;
  const t = (paraMin(inicio) + min) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** «almoço das 12:00 às 13:00» ou «sem almoço». */
export function textoAlmoco(inicio: string, min: number): string {
  const fim = min > 0 ? fimAlmoco(inicio, min) : null;
  return fim ? `almoço das ${inicio} às ${fim}` : "sem almoço";
}
