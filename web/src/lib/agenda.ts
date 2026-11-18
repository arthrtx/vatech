import type { Pedido, TipoPedido } from "./api";

// Datas como "YYYY-MM-DD": comparam-se como texto, sem fusos horarios.
export interface Mes {
  ano: number;
  mes: number; // 1 a 12
}

export interface Celula {
  iso: string;
  dia: number;
  doMes: boolean;
}

export const mesesPt = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const p2 = (n: number) => String(n).padStart(2, "0");
export const isoDe = (ano: number, mes: number, dia: number) => `${ano}-${p2(mes)}-${p2(dia)}`;

export function hojeIso(d = new Date()): string {
  return isoDe(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function mesDe(iso: string): Mes {
  return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
}

export function mesAnterior({ ano, mes }: Mes): Mes {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

export function mesSeguinte({ ano, mes }: Mes): Mes {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export const diasNoMes = ({ ano, mes }: Mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Semanas completas (segunda a domingo) que cobrem o mes; dias de fora marcados com doMes=false. */
export function celulasDoMes(m: Mes): Celula[] {
  const primeiro = new Date(Date.UTC(m.ano, m.mes - 1, 1));
  const recuo = (primeiro.getUTCDay() + 6) % 7; // segunda = 0
  const total = Math.ceil((recuo + diasNoMes(m)) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(m.ano, m.mes - 1, 1 - recuo + i));
    const ano = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    return { iso: isoDe(ano, mes, d.getUTCDate()), dia: d.getUTCDate(), doMes: ano === m.ano && mes === m.mes };
  });
}

/** Recusados nunca aparecem na agenda. */
export const visiveis = (pedidos: Pedido[]) => pedidos.filter((p) => p.estado !== "recusado");

export const cobreDia = (p: Pedido, iso: string) => p.data_inicio <= iso && iso <= p.data_fim;

/** Um pedido que atravessa meses conta nos dois. */
export function tocaMes(p: Pedido, m: Mes): boolean {
  return p.data_inicio <= isoDe(m.ano, m.mes, diasNoMes(m)) && p.data_fim >= isoDe(m.ano, m.mes, 1);
}

export interface Filtros {
  tipo?: TipoPedido;
  userId?: number;
}

export function filtrar(pedidos: Pedido[], f: Filtros): Pedido[] {
  return visiveis(pedidos).filter(
    (p) => (!f.tipo || p.tipo === f.tipo) && (f.userId === undefined || p.user_id === f.userId),
  );
}

/** Dia com 2 ou mais pessoas diferentes fora: aviso, nunca bloqueio (DECISIONS: avisos). */
export function haSobreposicao(pedidosDoDia: Pedido[]): boolean {
  return new Set(pedidosDoDia.map((p) => p.user_id)).size > 1;
}
