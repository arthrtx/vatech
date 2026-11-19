import type { EstadoPedido, Pedido, User } from "./api";
import { tipos } from "./rotulos";

export interface Notificacao {
  /** Único por pedido+estado: o mesmo acontecimento não notifica duas vezes. */
  id: string;
  texto: string;
  quando: string; // ISO
  lida: boolean;
  /** Para onde o clique leva. */
  href: string;
}

export type Snapshot = Record<number, EstadoPedido>;

export interface EstadoNotificacoes {
  /** Estado dos pedidos na última leitura; null = ainda não houve leitura (não notifica o que já existia). */
  snapshot: Snapshot | null;
  itens: Notificacao[];
}

export const MAX_NOTIFICACOES = 30;

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const periodo = (p: Pedido) => (p.data_inicio === p.data_fim ? dm(p.data_inicio) : `${dm(p.data_inicio)} a ${dm(p.data_fim)}`);

/**
 * Compara os pedidos atuais com a leitura anterior.
 * Admin: pedidos pendentes novos de outras pessoas. Funcionário: os seus pedidos que passaram a aprovado/recusado.
 */
export function detetar(
  anterior: EstadoNotificacoes,
  pedidos: Pedido[],
  user: Pick<User, "id" | "papel">,
  agora: Date = new Date(),
): EstadoNotificacoes {
  const snapshot: Snapshot = Object.fromEntries(pedidos.map((p) => [p.id, p.estado]));
  if (anterior.snapshot === null) return { snapshot, itens: anterior.itens };

  const vistos = new Set(anterior.itens.map((n) => n.id));
  const novas: Notificacao[] = [];
  for (const p of pedidos) {
    const antes = anterior.snapshot[p.id];
    const href = `/?pedido=${p.id}`;
    if (user.papel === "admin") {
      if (antes === undefined && p.estado === "pendente" && p.user_id !== user.id) {
        novas.push({
          id: `${p.id}-novo`,
          texto: `${p.user?.nome ?? "Um funcionário"} pediu ${tipos[p.tipo].toLowerCase()} (${periodo(p)})`,
          quando: agora.toISOString(),
          lida: false,
          href,
        });
      }
    } else if (antes === "pendente" && p.estado !== "pendente") {
      const decisao = p.estado === "aprovado" ? "aprovado" : "recusado";
      novas.push({
        id: `${p.id}-${decisao}`,
        texto: `O seu pedido de ${tipos[p.tipo].toLowerCase()} (${periodo(p)}) foi ${decisao}${
          decisao === "recusado" && p.motivo_recusa ? `: ${p.motivo_recusa}` : ""
        }`,
        quando: agora.toISOString(),
        lida: false,
        href,
      });
    }
  }
  const frescas = novas.filter((n) => !vistos.has(n.id));
  return { snapshot, itens: [...frescas, ...anterior.itens].slice(0, MAX_NOTIFICACOES) };
}

const chave = (userId: number) => `vatech_notificacoes_${userId}`;

export function carregar(userId: number): EstadoNotificacoes {
  try {
    const bruto = localStorage.getItem(chave(userId));
    if (bruto) {
      const d = JSON.parse(bruto) as EstadoNotificacoes;
      if (Array.isArray(d.itens)) return { snapshot: d.snapshot ?? null, itens: d.itens };
    }
  } catch {
    // localStorage indisponível ou corrompido: recomeça vazio
  }
  return { snapshot: null, itens: [] };
}

export function guardar(userId: number, estado: EstadoNotificacoes) {
  try {
    localStorage.setItem(chave(userId), JSON.stringify(estado));
  } catch {
    // sem armazenamento: as notificações só duram esta sessão
  }
}
