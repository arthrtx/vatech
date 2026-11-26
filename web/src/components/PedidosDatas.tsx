import type { Pedido } from "@/lib/api";
import { horasDoPedido } from "@/lib/agenda";
import { diasUteis } from "@/lib/diasUteis";
import { formatarData } from "@/lib/rotulos";

/** Período do pedido e nº de dias úteis; igual nos cartões dos dois blocos. */
export default function PedidosDatas({ pedido: p }: { pedido: Pedido }) {
  const dias = diasUteis(p.data_inicio.slice(0, 10), p.data_fim.slice(0, 10));
  const horas = horasDoPedido(p);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="rounded-full bg-campo px-3 py-1 text-sm font-medium text-texto">
        {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
        {horas && ` · ${horas}`}
      </p>
      <p className="text-sm text-texto-suave">
        {dias} {dias === 1 ? "dia útil" : "dias úteis"}
      </p>
    </div>
  );
}
