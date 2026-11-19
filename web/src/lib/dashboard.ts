import type { Pedido, PedidoAgenda } from "./api";
import { cobreDia, isoDe } from "./agenda";

/** Soma dias a uma data "YYYY-MM-DD", sem fusos horarios. */
export function maisDias(iso: string, n: number): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000);
  return isoDe(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export const aprovados = <T extends PedidoAgenda>(pedidos: T[]): T[] =>
  pedidos.filter((p) => p.estado === "aprovado").sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));

/** Admin: aprovados que cobrem hoje, e os que comecam nos proximos `dias` dias. */
export function ausenciasAdmin(agenda: PedidoAgenda[], hoje: string, dias = 30) {
  const ap = aprovados(agenda);
  const limite = maisDias(hoje, dias);
  return {
    hoje: ap.filter((p) => cobreDia(p, hoje)),
    proximos: ap.filter((p) => p.data_inicio > hoje && p.data_inicio <= limite),
  };
}

export function contarPorEstado(pedidos: Pedido[]) {
  return {
    pendente: pedidos.filter((p) => p.estado === "pendente").length,
    aprovado: pedidos.filter((p) => p.estado === "aprovado").length,
    recusado: pedidos.filter((p) => p.estado === "recusado").length,
  };
}

export const proximasAusencias = (pedidos: Pedido[], hoje: string) =>
  aprovados(pedidos).filter((p) => p.data_fim >= hoje);
