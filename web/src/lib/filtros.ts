import type { EstadoPedido, Pedido, PedidoAgenda, TipoPedido } from "./api";

export type FiltrosPedidos = {
  estados: EstadoPedido[];
  tipos: TipoPedido[];
  de: string; // ISO YYYY-MM-DD, "" = sem limite
  ate: string;
  funcionarioId: number | null;
};

export type FiltrosAgenda = {
  tipos: TipoPedido[];
  estados: ("pendente" | "aprovado")[];
  funcionarioId: number | null;
};

export const filtrosVazios: FiltrosPedidos = { estados: [], tipos: [], de: "", ate: "", funcionarioId: null };

// AND entre grupos, OR dentro do grupo; grupo vazio = sem restricao.
function passa<T>(sel: T[], valor: T): boolean {
  return sel.length === 0 || sel.includes(valor);
}

function idFuncionario(p: { user_id?: number; user?: { id: number } }): number | undefined {
  return p.user_id ?? p.user?.id;
}

export function aplicarFiltrosPedidos(lista: Pedido[], f: FiltrosPedidos): Pedido[] {
  return lista.filter(
    (p) =>
      passa(f.estados, p.estado) &&
      passa(f.tipos, p.tipo) &&
      (f.funcionarioId === null || idFuncionario(p) === f.funcionarioId) &&
      // sobreposicao com [de, ate]; datas ISO comparam-se como texto
      (!f.de || p.data_fim >= f.de) &&
      (!f.ate || p.data_inicio <= f.ate),
  );
}

export function aplicarFiltrosAgenda(lista: PedidoAgenda[], f: FiltrosAgenda): PedidoAgenda[] {
  return lista.filter(
    (p) =>
      passa(f.tipos, p.tipo) &&
      passa<string>(f.estados, p.estado) &&
      (f.funcionarioId === null || idFuncionario(p) === f.funcionarioId),
  );
}

/** Nº de grupos com filtro ativo (o periodo conta como 1). */
export function contarAtivos(f: FiltrosPedidos | FiltrosAgenda): number {
  let n = 0;
  if (f.tipos.length) n++;
  if (f.estados.length) n++;
  if (f.funcionarioId !== null) n++;
  if ("de" in f && (f.de || f.ate)) n++;
  return n;
}
