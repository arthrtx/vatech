"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Aniversario, PedidoAgenda, Ponte, TipoPedido } from "@/lib/api";
import { nomeDoDia, quemE, somaDias, visiveis } from "@/lib/agenda";
import { marcasDoAno } from "@/lib/calendario";
import { diasUteis } from "@/lib/diasUteis";
import { datasDasPontes, datasDoAno } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { formatarData, tipos } from "@/lib/rotulos";
import Avatar from "./Avatar";
import CampoData from "./CampoData";
import EtiquetaEstado from "./EtiquetaEstado";
import SimulacaoDias, { Chips, type DiaSim } from "./SimulacaoDias";
import { botaoSec, label } from "./ui";

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

const camadas = [
  { chave: "aprovados", rotulo: "Pedidos aprovados" },
  { chave: "pendentes", rotulo: "Pedidos pendentes" },
  { chave: "pontes", rotulo: "Pontes" },
  { chave: "aniversarios", rotulo: "Aniversários" },
] as const;
type Camada = (typeof camadas)[number]["chave"];

const fimDeSemana = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay());

interface Props {
  /** Pedido original: pessoa, tipo e datas de partida. */
  simulacao: Simulacao;
  /** Datas em simulação (podem diferir das do pedido). */
  intervalo: { de: string; ate: string };
  aoMudarIntervalo: (i: { de: string; ate: string }) => void;
  /** Dia em destaque; `foco` sobe quando o destaque veio do calendário (leva scroll e foco ao detalhe). */
  destaque: string | null;
  foco: number;
  aoDestacar: (iso: string | null) => void;
  /** Ano carregado no calendário: só esses dias têm dados. */
  ano: number;
  pedidos: PedidoAgenda[];
  aniversarios: Aniversario[];
  pontes: Ponte[];
  nomeDe?: string;
}

const chipBase =
  "min-h-9 rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2";

/** Painel da simulação: veredicto, datas ajustáveis, camadas e linha do tempo. Só lê e calcula em memória; nunca escreve. */
export default function SimulacaoPainel({ simulacao: s, intervalo, aoMudarIntervalo, destaque, foco, aoDestacar, ano, pedidos, aniversarios, pontes, nomeDe }: Props) {
  const [localidade] = useLocalidade();
  const [ligadas, setLigadas] = useState<Record<Camada, boolean>>({ aprovados: true, pendentes: true, pontes: true, aniversarios: true });
  const detalhe = useRef<HTMLDivElement>(null);
  const nome = nomeDe ?? `Utilizador ${s.user}`;
  const de = intervalo.de < `${ano}-01-01` ? `${ano}-01-01` : intervalo.de;
  const ate = intervalo.ate > `${ano}-12-31` ? `${ano}-12-31` : intervalo.ate;
  const original = intervalo.de === s.de && intervalo.ate === s.ate;

  const { diaDe, dias, outros } = useMemo(() => {
    // O próprio pedido (já na agenda) e os da mesma pessoa não contam como conflito.
    const alheios = visiveis(pedidos).filter(
      (p) => p.id !== s.id && quemE(p) !== s.user && (p.estado === "pendente" ? ligadas.pendentes : ligadas.aprovados),
    );
    const datas = [...datasDoAno(ano, localidade), ...datasDasPontes(pontes)].filter((d) => d.tipo !== "ponte" || ligadas.pontes);
    const marcas = marcasDoAno(ano, datas, ligadas.aniversarios ? aniversarios : [], alheios);
    const diaDe = (dia: string): DiaSim => {
      const m = marcas.get(dia);
      return { iso: dia, fimDeSemana: fimDeSemana(dia), datas: m?.datas ?? [], aniversarios: m?.aniversarios ?? [], pedidos: m?.pedidos ?? [], conflito: !!m?.pedidos.length };
    };
    const dias: DiaSim[] = [];
    for (let d = de; d <= ate; d = somaDias(d, 1)) dias.push(diaDe(d));
    const outros = new Map<number, PedidoAgenda>();
    dias.forEach((d) => d.pedidos.forEach((p) => outros.set(quemE(p) ?? 0, p)));
    return { diaDe, dias, outros };
  }, [pedidos, aniversarios, pontes, ano, localidade, s.id, s.user, de, ate, ligadas]);

  const n = outros.size;
  const diasComConflito = dias.filter((d) => d.conflito).length;
  const uteis = diasUteis(intervalo.de, intervalo.ate);
  const sel = destaque && destaque.slice(0, 4) === String(ano) ? diaDe(destaque) : null;
  const ausentesNoDia = sel ? new Set(sel.pedidos.map(quemE)).size : 0;

  useEffect(() => {
    if (!foco || !detalhe.current) return;
    detalhe.current.focus({ preventScroll: true });
    const calmo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    detalhe.current.scrollIntoView?.({ block: "nearest", behavior: calmo ? "auto" : "smooth" });
  }, [foco]);

  return (
    <section
      aria-labelledby="sim-titulo"
      onKeyDown={(e) => {
        if (e.key === "Escape" && destaque) aoDestacar(null);
      }}
      className="flex min-w-0 flex-col gap-4 rounded-cartao border-2 border-dashed border-texto bg-painel p-4 sm:p-5 print:hidden"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar nome={nome} id={s.user} className="h-12 w-12 text-base" />
          <div className="min-w-0">
            <h2 id="sim-titulo" className="text-lg font-semibold leading-tight">
              Simulação
            </h2>
            <p className="truncate text-sm font-medium">{nome}</p>
          </div>
        </div>
        <Link href="/calendario" className={`${botaoSec} shrink-0`}>
          Sair da simulação
        </Link>
      </header>

      <p className="text-sm">
        {tipos[s.tipo]} · {formatarData(intervalo.de)} a {formatarData(intervalo.ate)} · {uteis} {uteis === 1 ? "dia útil" : "dias úteis"}
      </p>

      <div
        role="status"
        aria-live="polite"
        className={`rounded-cartao border p-4 ${n > 0 ? "border-rosa bg-rosa-suave" : "border-transparent bg-primaria-suave"}`}
      >
        <p className="text-xl font-semibold leading-tight text-texto">
          {n > 0 ? `Sobreposição com ${n} ${n === 1 ? "pessoa" : "pessoas"}` : "Sem conflitos"}
        </p>
        <p className="mt-1 text-sm text-texto">
          {n > 0
            ? `${diasComConflito} ${diasComConflito === 1 ? "dia afetado" : "dias afetados"} em ${dias.length}.`
            : dias.length
              ? "Mais ninguém está fora nestes dias."
              : `Nenhum dia desta simulação cai em ${ano}.`}
        </p>
        {n > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pessoas ausentes">
            {[...outros.values()].map((p) => (
              <li key={quemE(p)} className="inline-flex items-center gap-1.5 rounded-full bg-painel px-2.5 py-1 text-xs font-medium text-texto">
                <Avatar nome={p.user?.nome ?? "?"} id={p.user?.id ?? 0} className="h-5 w-5 text-[0.625rem]" />
                {p.user?.nome ?? "Alguém"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-semibold">Datas da simulação</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="sim-de" className={label}>
              Início
            </label>
            <CampoData id="sim-de" valor={intervalo.de} onChange={(v) => v && aoMudarIntervalo({ de: v, ate: intervalo.ate < v ? v : intervalo.ate })} />
          </div>
          <div>
            <label htmlFor="sim-ate" className={label}>
              Fim
            </label>
            <CampoData id="sim-ate" valor={intervalo.ate} min={intervalo.de} onChange={(v) => v && aoMudarIntervalo({ de: intervalo.de, ate: v })} />
          </div>
        </div>
        <button type="button" disabled={original} onClick={() => aoMudarIntervalo({ de: s.de, ate: s.ate })} className={`${botaoSec} mt-3`}>
          Repor datas do pedido
        </button>
      </fieldset>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-semibold">O que contar</legend>
        <div className="flex flex-wrap gap-2">
          {camadas.map((c) => (
            <button
              key={c.chave}
              type="button"
              aria-pressed={ligadas[c.chave]}
              onClick={() => setLigadas((l) => ({ ...l, [c.chave]: !l[c.chave] }))}
              className={`${chipBase} ${ligadas[c.chave] ? "border-primaria bg-primaria font-semibold text-white hover:bg-primaria-forte" : "border-linha-forte bg-painel font-medium text-texto hover:bg-primaria-suave"}`}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-texto-suave">Os pedidos aprovados e pendentes entram no veredicto; as pontes e os aniversários só aparecem no dia a dia.</p>
      </fieldset>

      {sel && (
        <div
          ref={detalhe}
          tabIndex={-1}
          role="group"
          aria-labelledby="sim-detalhe"
          className="flex flex-col gap-2 rounded-cartao bg-campo p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria motion-safe:animate-subir"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="sim-detalhe" className="text-base font-semibold">
              {nomeDoDia(sel.iso)}
            </h3>
            <button type="button" onClick={() => aoDestacar(null)} className={`${botaoSec} min-h-9 px-3 py-1`}>
              Limpar destaque
            </button>
          </div>
          <p className="text-sm">
            {sel.iso >= intervalo.de && sel.iso <= intervalo.ate ? "Dentro da simulação. " : "Fora da simulação. "}
            {ausentesNoDia === 0 ? "Ninguém ausente." : ausentesNoDia === 1 ? "1 pessoa ausente." : `${ausentesNoDia} pessoas ausentes.`}
          </p>
          {sel.pedidos.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm" aria-label="Ausentes neste dia">
              {sel.pedidos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <Avatar nome={p.user?.nome ?? "?"} id={p.user?.id ?? 0} className="h-6 w-6 text-xs" />
                  <span className="font-medium">{p.user?.nome ?? "Alguém"}</span>
                  <span>{tipos[p.tipo]}</span>
                  <EtiquetaEstado estado={p.estado} />
                </li>
              ))}
            </ul>
          )}
          <Chips dia={{ ...sel, pedidos: [] }} vazio="" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Dia a dia</h3>
        {(intervalo.de < de || intervalo.ate > ate) && <p className="text-sm text-texto-suave">Dia a dia, só os dias de {ano}.</p>}
        {dias.length > 0 && <SimulacaoDias dias={dias} destaque={destaque} aoDestacar={aoDestacar} />}
        <p className="text-xs text-texto-suave">Escolhe um dia para ver o detalhe. Com as teclas de seta passas de um dia ao outro e Esc limpa o destaque.</p>
      </div>

      <p className="text-xs text-texto-suave">É só uma pré-visualização: nada é guardado. Os compromissos não estão incluídos: o calendário anual não os carrega.</p>
    </section>
  );
}
