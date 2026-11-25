"use client";

import { MUNICIPIOS } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { IconeLocal } from "./Icones";
import Seletor from "./Seletor";
import { label } from "./ui";

/** Escolha do concelho para mostrar o feriado municipal na Agenda e no Dashboard. */
export default function EscolhaLocalidade({ id = "localidade", compacta = false }: { id?: string; compacta?: boolean }) {
  const [valor, definir] = useLocalidade();
  return (
    <div>
      <label htmlFor={id} className={compacta ? "sr-only" : label}>
        Localidade (feriado municipal)
      </label>
      <Seletor
        id={id}
        className={compacta ? "min-w-56 rounded-full py-2 pl-3 text-sm font-medium shadow-suave" : ""}
        icone={compacta ? <IconeLocal className="h-4 w-4 shrink-0 text-primaria" /> : undefined}
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
