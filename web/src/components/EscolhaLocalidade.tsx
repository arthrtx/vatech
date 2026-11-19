"use client";

import { MUNICIPIOS } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import Seletor from "./Seletor";
import { label } from "./ui";

/** Escolha do concelho para mostrar o feriado municipal na Agenda e no Dashboard. */
export default function EscolhaLocalidade({ id = "localidade", compacta = false }: { id?: string; compacta?: boolean }) {
  const [valor, definir] = useLocalidade();
  return (
    <div>
      <label htmlFor={id} className={compacta ? "mb-1 block text-xs font-medium text-texto-suave" : label}>
        Localidade (feriado municipal)
      </label>
      <Seletor
        id={id}
        className={compacta ? "py-1.5 text-sm" : ""}
        valor={valor ?? ""}
        opcoes={[
          { valor: "", rotulo: "Sem feriado municipal" },
          ...MUNICIPIOS.map((m) => ({ valor: m.id, rotulo: `${m.nome} (${m.dia}/${m.mes})` })),
        ]}
        onChange={(v) => definir(v || null)}
      />
    </div>
  );
}
