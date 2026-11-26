import type { EstadoPedido } from "@/lib/api";
import { estados } from "@/lib/rotulos";

// Só tokens existentes; texto sempre em `texto`/`texto-suave` sobre fundo claro ou suave.
const cores: Record<EstadoPedido, string> = {
  pendente: "bg-campo text-texto ring-1 ring-linha-forte",
  aprovado: "bg-positivo/25 text-texto",
  recusado: "bg-rosa-suave text-texto",
  cancelado: "bg-trilho text-texto-suave",
};

/** Estado do pedido em pílula. */
export default function EtiquetaEstado({ estado, rotulo }: { estado: EstadoPedido; rotulo?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${cores[estado]}`}>
      {rotulo ?? estados[estado]}
    </span>
  );
}
