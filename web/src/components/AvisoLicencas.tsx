"use client";

import { useEffect, useState } from "react";
import { api, mensagemDeErro, type Pedido } from "@/lib/api";
import { formatarData } from "@/lib/rotulos";

const INTERVALO = 60_000;

/** Aviso ao admin: licenças comunicadas que ainda não viu. Fica no topo de todas as páginas até carregar em «Visto». */
export default function AvisoLicencas() {
  const [lista, setLista] = useState<Pedido[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      try {
        const l = await api.licencasPorVer();
        if (vivo) setLista(l);
      } catch {
        // sem rede: tenta na próxima volta
      }
    }
    carregar();
    const t = setInterval(carregar, INTERVALO);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  if (lista.length === 0) return null;

  async function visto(id: number) {
    setErro(null);
    try {
      await api.marcarLicencaVista(id);
      setLista((l) => l.filter((p) => p.id !== id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  return (
    <section
      role="alert"
      aria-labelledby="aviso_licencas"
      className="mb-4 rounded-cartao border-2 border-rosa bg-rosa-suave p-4 text-texto shadow-suave"
    >
      <h2 id="aviso_licencas" className="text-base font-semibold">
        {lista.length === 1 ? "Nova licença comunicada" : `${lista.length} licenças comunicadas`}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {lista.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-controlo bg-painel/70 px-3 py-2">
            <div className="min-w-0 text-sm">
              <p>
                <strong>{p.user?.nome ?? "Alguém"}</strong> vai estar de licença de {formatarData(p.data_inicio)} a{" "}
                {formatarData(p.data_fim)}.
              </p>
              {p.observacao && <p className="mt-0.5 break-words text-texto-suave">{p.observacao}</p>}
            </div>
            <button
              type="button"
              onClick={() => visto(p.id)}
              className="min-h-touch rounded-controlo border border-linha-forte bg-painel px-4 py-2 text-sm font-medium hover:bg-primaria-suave focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              Visto
            </button>
          </li>
        ))}
      </ul>
      {erro && <p className="mt-2 text-sm">{erro}</p>}
    </section>
  );
}
