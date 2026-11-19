"use client";

import { MUNICIPIOS } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { input, label } from "./ui";

/** Escolha do concelho para mostrar o feriado municipal na Agenda e no Dashboard. */
export default function EscolhaLocalidade({ id = "localidade", compacta = false }: { id?: string; compacta?: boolean }) {
  const [valor, definir] = useLocalidade();
  return (
    <div>
      <label htmlFor={id} className={compacta ? "mb-1 block text-xs font-medium text-texto-suave" : label}>
        Localidade (feriado municipal)
      </label>
      <select id={id} className={`${input} ${compacta ? "py-1.5 text-sm" : ""}`} value={valor ?? ""} onChange={(e) => definir(e.target.value || null)}>
        <option value="">Sem feriado municipal</option>
        {MUNICIPIOS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome} ({m.dia}/{m.mes})
          </option>
        ))}
      </select>
    </div>
  );
}
