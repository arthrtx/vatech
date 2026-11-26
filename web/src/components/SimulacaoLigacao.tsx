import Link from "next/link";
import type { Pedido } from "@/lib/api";
import { botaoSec } from "./ui";

/** Ligação ao calendário anual com a simulação deste pedido; os dados vêm do próprio pedido, sem chamadas à API. */
export default function SimulacaoLigacao({ pedido }: { pedido: Pick<Pedido, "id" | "user_id" | "tipo" | "data_inicio" | "data_fim"> }) {
  const q = new URLSearchParams({
    simular: String(pedido.id),
    de: pedido.data_inicio.slice(0, 10),
    ate: pedido.data_fim.slice(0, 10),
    tipo: pedido.tipo,
    user: String(pedido.user_id),
  });
  return (
    <Link href={`/calendario?${q}`} className={`${botaoSec} inline-flex min-h-9 items-center px-3 py-1`}>
      Ver no calendário
    </Link>
  );
}
