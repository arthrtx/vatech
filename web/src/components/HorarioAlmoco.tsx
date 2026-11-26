"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type Horario } from "@/lib/api";
import { textoAlmoco } from "@/lib/horario";

/** Só leitura: o horário é definido pelo admin nas Definições (empresa ou por pessoa). */
export default function HorarioAlmoco() {
  const { user } = useAuth();
  const [meu, setMeu] = useState<Horario | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    api
      .getHorario()
      .then((r) => ativo && setMeu(r.meu))
      .catch(() => ativo && setMeu(null)); // sem a leitura as horas aparecem à mesma
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        {meu === undefined
          ? "A carregar o horário..."
          : meu === null
            ? "Horário indisponível."
            : `O teu horário: ${meu.entrada} às ${meu.saida}, ${textoAlmoco(meu.almoco_inicio, meu.almoco_min)}`}
      </p>
      <p className="text-texto-suave">O tempo de almoço não conta para o total.</p>
      {user?.papel === "admin" && (
        <p>
          <Link href="/definicoes" className="underline underline-offset-2">
            Alterar nas Definições
          </Link>
        </p>
      )}
    </div>
  );
}
