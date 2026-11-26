import { datasDoAno, versaoFeriados } from "./feriados";

const feriadosPorAno = new Map<number, Set<string>>();
let versaoVista = -1;
function feriadosNacionais(ano: number): Set<string> {
  if (versaoVista !== versaoFeriados()) {
    feriadosPorAno.clear(); // chegaram feriados da API
    versaoVista = versaoFeriados();
  }
  let s = feriadosPorAno.get(ano);
  if (!s) {
    s = new Set(datasDoAno(ano).filter((d) => d.tipo === "feriado").map((d) => d.iso));
    feriadosPorAno.set(ano, s);
  }
  return s;
}

/** Dias úteis (seg-sex, sem feriados nacionais) de [inicio, fim] inclusivo; mesmo critério de LimiteFerias.php. */
export function diasUteis(inicioIso: string, fimIso: string): number {
  const dia = new Date(`${inicioIso}T00:00:00Z`);
  const fim = Date.parse(`${fimIso}T00:00:00Z`);
  let total = 0;
  for (; dia.getTime() <= fim; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const sem = dia.getUTCDay();
    if (sem !== 0 && sem !== 6 && !feriadosNacionais(dia.getUTCFullYear()).has(dia.toISOString().slice(0, 10))) total++;
  }
  return total;
}
