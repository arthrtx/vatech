import type { PedidoAgenda as Pedido, Presenca, TipoPedido } from "./api";

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

/** Id da pessoa: pedidos de colegas chegam sem user_id, so com user.id. */
export const quemE = (p: Pedido) => p.user_id ?? p.user?.id;

/** Pedido de colega: a API so envia os campos reduzidos (sem user_id). */
export const reduzido = (p: Pedido) => p.user_id === undefined;

/** Intervalo a pedir a API: o grid completo do mes (inclui dias de fora). */
export function intervaloDoMes(m: Mes): { de: string; ate: string } {
  const c = celulasDoMes(m);
  return { de: c[0].iso, ate: c[c.length - 1].iso };
}

/** "10:00 às 12:00" quando o pedido (ausência) tem horas; senão vazio. */
export const horasDoPedido = (p: { hora_inicio?: string | null; hora_fim?: string | null }) =>
  p.hora_inicio && p.hora_fim ? `${p.hora_inicio} às ${p.hora_fim}` : "";

/** Recusados nunca aparecem na agenda. */
export const visiveis = (pedidos: Pedido[]) => pedidos.filter((p) => p.estado !== "recusado" && p.estado !== "cancelado");

/** Dias de calendario do pedido, inclusive (inicio e fim contam). */
export const diasDoPedido = (p: Pedido) =>
  Math.round((Date.parse(`${p.data_fim}T00:00:00Z`) - Date.parse(`${p.data_inicio}T00:00:00Z`)) / 86400000) + 1;

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
    (p) => (!f.tipo || p.tipo === f.tipo) && (f.userId === undefined || quemE(p) === f.userId),
  );
}

/** Dia com 2 ou mais pessoas diferentes fora: aviso, nunca bloqueio (DECISIONS: avisos). */
export function haSobreposicao(pedidosDoDia: Pedido[]): boolean {
  return new Set(pedidosDoDia.map(quemE)).size > 1;
}

const diaUtc = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD". */
export function somaDias(iso: string, n: number): string {
  const d = diaUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDe(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Segunda-feira da semana do dia dado. */
export const inicioSemana = (iso: string) => somaDias(iso, -((diaUtc(iso).getUTCDay() + 6) % 7));

export const diasSemanaLongos = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;

/** "2026-11-19" -> "Quinta-feira, 19 de novembro" */
export const nomeDoDia = (iso: string) =>
  `${diasSemanaLongos[diaUtc(iso).getUTCDay()]}, ${Number(iso.slice(8, 10))} de ${mesesPt[Number(iso.slice(5, 7)) - 1].toLowerCase()}`;

/** Período de estágio de uma pessoa (datas Y-m-d); sem datas = ainda não definido. */
export interface Estagio {
  id: number;
  nome: string;
  inicio: string | null;
  fim: string | null;
}

/** Estagiários com nome, a partir de utilizadores da API (só papel estagiario). */
export const estagiosDe = (
  utilizadores: { id: number; nome: string; papel: string; estagio_inicio?: string | null; estagio_fim?: string | null }[],
): Estagio[] =>
  utilizadores
    .filter((u) => u.papel === "estagiario")
    .map((u) => ({ id: u.id, nome: u.nome, inicio: u.estagio_inicio ?? null, fim: u.estagio_fim ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));

/** O dia cai dentro do período do estágio (limites inclusivos). */
export const estagioCobre = (e: Estagio, iso: string) => !!e.inicio && !!e.fim && e.inicio <= iso && iso <= e.fim;

/** Presenças do dia (compara só a parte da data). */
export const presencasDoDia = (lista: Presenca[], iso: string) => lista.filter((p) => p.data.slice(0, 10) === iso);
