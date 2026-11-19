"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type FeriasResumo } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { diasTxt, passouPrazo, prazoTxt } from "@/lib/ferias";
import { vidro } from "../ui";

const MAX = 3;

/** Admin: depois do prazo, quem ainda tem férias por marcar; antes, só o total de transitados da equipa. */
export default function FeriasPorMarcar() {
  const [hoje] = useState(() => hojeIso());
  const [dados, setDados] = useState<{ resumo: FeriasResumo[]; prazo: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api.feriasResumo().then(
      (r) => ativo && setDados({ resumo: r.resumo, prazo: r.prazo_ferias }),
      () => {
        // Bloco opcional: sem dados, não aparece.
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  if (!dados) return null;
  const depois = passouPrazo(hoje, dados.prazo);
  const pessoas = dados.resumo.filter((r) => r.por_marcar > 0);
  const transitados = dados.resumo.reduce((t, r) => t + r.transitados, 0);

  if (depois ? pessoas.length === 0 : transitados === 0) return null;
  return (
    <section aria-label="Férias por marcar" className={`${vidro} flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm lg:shrink-0`}>
      {depois ? (
        <>
          <h3 className="font-semibold">Férias por marcar (prazo: {prazoTxt(dados.prazo)})</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {pessoas.slice(0, MAX).map((p) => (
              <li key={p.user_id}>
                {p.nome}: {diasTxt(p.por_marcar)}
              </li>
            ))}
          </ul>
          {pessoas.length > MAX && (
            <Link
              href="/funcionarios"
              className="inline-flex min-h-10 items-center underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              Ver pessoas ({pessoas.length - MAX} mais)
            </Link>
          )}
        </>
      ) : (
        <p className="text-texto-suave">Férias transitadas na equipa: {diasTxt(transitados)}.</p>
      )}
    </section>
  );
}
