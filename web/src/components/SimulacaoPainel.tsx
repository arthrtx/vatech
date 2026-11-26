"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Aniversario, PedidoAgenda, Ponte, TipoPedido } from "@/lib/api";
import { nomeDoDia, quemE, somaDias, visiveis } from "@/lib/agenda";
import { marcasDoAno } from "@/lib/calendario";
import { diasUteis } from "@/lib/diasUteis";
import { datasDasPontes, datasDoAno } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { formatarData, tipos } from "@/lib/rotulos";
import { botaoSec } from "./ui";

export interface Simulacao {
  id: number;
  user: number;
  tipo: TipoPedido;
  de: string;
  ate: string;
}

const iso = /^\d{4}-\d{2}-\d{2}$/;

/** Lê os parâmetros de /calendario; qualquer valor inválido desliga a simulação. */
export function lerSimulacao(q: { get(k: string): string | null } | null): Simulacao | null {
  if (!q) return null;
  const id = Number(q.get("simular"));
  const user = Number(q.get("user"));
  const [de, ate, tipo] = [q.get("de") ?? "", q.get("ate") ?? "", q.get("tipo") ?? ""];
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(user) || user <= 0) return null;
  if (!iso.test(de) || !iso.test(ate) || de > ate || !Object.hasOwn(tipos, tipo)) return null;
  return { id, user, tipo: tipo as TipoPedido, de, ate };
}

interface Props {
  simulacao: Simulacao;
  /** Ano carregado no calendário: só esses dias têm dados. */
  ano: number;
  pedidos: PedidoAgenda[];
  aniversarios: Aniversario[];
  pontes: Ponte[];
  nomeDe?: string;
}

const rotuloData = { feriado: "Feriado", municipal: "Feriado municipal", comemorativa: "Data comemorativa", ponte: "Ponte" } as const;

/** Faixa da simulação: resumo, aviso de sobreposição e, dia a dia, o que já existe. Só lê; nunca escreve. */
export default function SimulacaoPainel({ simulacao: s, ano, pedidos, aniversarios, pontes, nomeDe }: Props) {
  const [localidade] = useLocalidade();
  const nome = nomeDe ?? `Utilizador ${s.user}`;
  const de = s.de < `${ano}-01-01` ? `${ano}-01-01` : s.de;
  const ate = s.ate > `${ano}-12-31` ? `${ano}-12-31` : s.ate;

  const { dias, outros } = useMemo(() => {
    // O próprio pedido (já na agenda) e os da mesma pessoa não contam como conflito.
    const alheios = visiveis(pedidos).filter((p) => p.id !== s.id && quemE(p) !== s.user);
    const marcas = marcasDoAno(ano, [...datasDoAno(ano, localidade), ...datasDasPontes(pontes)], aniversarios, alheios);
    const dias: { iso: string; m: ReturnType<typeof marcas.get> }[] = [];
    for (let d = de; d <= ate; d = somaDias(d, 1)) dias.push({ iso: d, m: marcas.get(d) });
    const outros = new Set(dias.flatMap((d) => d.m?.pedidos.map(quemE) ?? []));
    return { dias, outros };
  }, [pedidos, aniversarios, pontes, ano, localidade, s.id, s.user, de, ate]);

  const n = outros.size;
  const fimDeSemana = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay());

  return (
    <section aria-labelledby="sim-titulo" className="flex flex-col gap-3 rounded-cartao border-2 border-dashed border-texto bg-painel p-4 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sim-titulo" className="text-lg font-semibold">
            Simulação
          </h2>
          <p className="text-sm">
            {nome} · {tipos[s.tipo]} · {formatarData(s.de)} a {formatarData(s.ate)} · {diasUteis(s.de, s.ate)} dias úteis
          </p>
          <p className="text-sm text-texto-suave">É só uma pré-visualização: nada é guardado.</p>
          {(s.de < de || s.ate > ate) && <p className="text-sm text-texto-suave">Dia a dia, só os dias de {ano}.</p>}
        </div>
        <Link href="/calendario" className={`${botaoSec} shrink-0`}>
          Sair da simulação
        </Link>
      </div>

      <div aria-live="polite" className={`rounded-controlo px-3 py-2 text-sm font-medium text-texto ${n > 0 ? "border border-rosa bg-rosa-suave" : "bg-primaria-suave"}`}>
        {n > 0 ? `Sobreposição: ${n} ${n === 1 ? "pessoa ausente" : "pessoas ausentes"} nestes dias.` : "Sem conflitos."}
      </div>

      <ul className="flex flex-col gap-1 text-sm" aria-label="Dia a dia">
        {dias.map(({ iso: d, m }) => {
          const notas = [
            fimDeSemana(d) ? "Fim de semana" : null,
            ...(m?.datas.map((x) => `${rotuloData[x.tipo]}: ${x.nome}`) ?? []),
            ...(m?.aniversarios.map((a) => `Aniversário de ${a}`) ?? []),
            ...(m?.pedidos.map((p) => `${p.user?.nome ?? "Alguém"}, ${tipos[p.tipo].toLowerCase()}${p.estado === "pendente" ? " (pendente)" : " (aprovado)"}`) ?? []),
          ].filter(Boolean);
          return (
            <li key={d} className="flex flex-wrap gap-x-3">
              <span className="w-44 shrink-0 font-medium">{nomeDoDia(d)}</span>
              <span className={notas.length ? "" : "text-texto-suave"}>{notas.length ? notas.join(" · ") : "Livre"}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-texto-suave">Os compromissos não estão incluídos: o calendário anual não os carrega.</p>
    </section>
  );
}
