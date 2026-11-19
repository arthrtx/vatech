"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Limite } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { diasTxt, feriasPorMarcar, passouPrazo, prazoTxt } from "@/lib/ferias";
import { erro as avisoCls } from "../ui";

const ligacaoCls = "inline-flex min-h-10 items-center underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

/** Funcionário: aviso de férias por marcar depois do prazo e, no dashboard, as férias transitadas. */
export default function AvisoFerias({ comTransitadas = false }: { comTransitadas?: boolean }) {
  const [hoje] = useState(() => hojeIso());
  const [dados, setDados] = useState<{ ferias: Limite | undefined; prazo: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    api.limites().then(
      (r) => ativo && setDados({ ferias: r.limites.find((l) => l.tipo === "ferias"), prazo: r.prazo_ferias }),
      () => {
        // Sem aviso; a validação final é do servidor.
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  if (!dados) return null;
  const porMarcar = feriasPorMarcar(dados.ferias);
  const transitados = dados.ferias?.transitados ?? 0;
  const avisar = porMarcar !== null && porMarcar > 0 && passouPrazo(hoje, dados.prazo);

  if (!avisar && !(comTransitadas && transitados > 0)) return null;
  return (
    <div className="flex flex-col gap-2 lg:shrink-0">
      {avisar && (
        <p role="status" className={`${avisoCls} flex flex-wrap items-center gap-x-3`}>
          <span>
            Tem {diasTxt(porMarcar)} de férias por marcar. O prazo era {prazoTxt(dados.prazo)}.
          </span>
          <Link href="/" className={ligacaoCls}>
            Fazer pedido de férias
          </Link>
        </p>
      )}
      {comTransitadas && transitados > 0 && <p className="text-sm text-texto-suave">Férias transitadas: {diasTxt(transitados)}</p>}
    </div>
  );
}
