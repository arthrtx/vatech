"use client";

import { useTema, type Tema } from "@/lib/tema";
import Seletor from "./Seletor";
import { label } from "./ui";

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
      <Seletor id={id} valor={tema} opcoes={OPCOES} onChange={(v) => definir(v as Tema)} />
    </div>
  );
}
