import type { Pedido } from "@/lib/api";
import { subtipos, tipos } from "@/lib/rotulos";

const estados = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado" } as const;

export default function ListaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) return <p className="text-zinc-700">Ainda não há pedidos.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {pedidos.map((p) => (
        <li key={p.id} className="rounded-md border border-zinc-300 bg-white p-4">
          <p className="font-medium">
            {tipos[p.tipo]}
            {p.subtipo ? ` (${subtipos[p.subtipo]})` : ""} · {estados[p.estado]}
          </p>
          <p className="text-sm text-zinc-700">
            {p.data_inicio} a {p.data_fim}
          </p>
          {p.observacao && <p className="mt-1 break-words text-sm">{p.observacao}</p>}
          {p.estado === "recusado" && p.motivo_recusa && (
            <p className="mt-1 break-words text-sm">Motivo da recusa: {p.motivo_recusa}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
