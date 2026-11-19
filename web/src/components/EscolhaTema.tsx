"use client";

import { useTema, type Tema } from "@/lib/tema";
import { input, label } from "./ui";

const OPCOES: { valor: Tema; rotulo: string }[] = [
  { valor: "sistema", rotulo: "Igual ao sistema" },
  { valor: "claro", rotulo: "Tema Joana" },
  { valor: "escuro", rotulo: "Tema João" },
];

/** Escolha do tema (Joana = claro, João = escuro, ou o do sistema), para as Definições. */
export default function EscolhaTema({ id = "tema" }: { id?: string }) {
  const { tema, definir } = useTema();
  return (
    <div>
      <label htmlFor={id} className={label}>
        Tema
      </label>
      <select id={id} className={input} value={tema} onChange={(e) => definir(e.target.value as Tema)}>
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
