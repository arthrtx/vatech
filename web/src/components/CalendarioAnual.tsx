"use client";

import { useMemo, useState } from "react";
import type { Aniversario, PedidoAgenda, Ponte, TipoPedido } from "@/lib/api";
import { celulasDoMes, hojeIso, mesesPt, nomeDoDia, quemE } from "@/lib/agenda";
import { marcasDoAno } from "@/lib/calendario";
import { datasDasPontes, datasDoAno, type TipoData } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { tipos } from "@/lib/rotulos";
import EscolhaLocalidade from "./EscolhaLocalidade";
import { filtrar } from "@/lib/busca";
import CampoBusca from "./CampoBusca";
import { IconeSeta } from "./Icones";
import PedidoForm from "./PedidoForm";
import { botao, botaoSec } from "./ui";

const diasSemana = ["S", "T", "Q", "Q", "S", "S", "D"];
const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-1";
const botaoAno = `${botaoSec} min-h-9 px-3 py-1`;
const botaoSeta =
  "flex h-10 w-10 items-center justify-center rounded-full bg-painel/70 text-texto shadow-suave ring-1 ring-white/70 transition hover:bg-primaria-suave focus-visible:outline-2 focus-visible:outline-offset-2 dark:ring-white/10";

const rotulosData: Record<TipoData, string> = {
  feriado: "Feriado nacional",
  municipal: "Feriado municipal",
  comemorativa: "Data comemorativa",
  ponte: "Ponte",
};
// Ponto por tipo de pedido; pendente fica vazado (como na Agenda).
const pontoTipo: Record<TipoPedido, string> = { ferias: "bg-positivo", ausencia: "bg-violeta", licenca: "bg-primaria" };
const bordaTipo: Record<TipoPedido, string> = { ferias: "border-positivo", ausencia: "border-violeta", licenca: "border-primaria" };

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

interface Props {
  ano: number;
  aoMudarAno: (ano: number) => void;
  aCarregar?: boolean;
  pedidos: PedidoAgenda[];
  aniversarios: Aniversario[];
  pontes: Ponte[];
  /** Mostra o botão "Novo pedido" (como na Agenda). */
  podeCriar?: boolean;
  aoCriar?: () => void;
}

function Ponto({ tipo, pendente }: { tipo: TipoPedido; pendente: boolean }) {
  return <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full border ${bordaTipo[tipo]} ${pendente ? "bg-painel" : pontoTipo[tipo]}`} />;
}

/** Calendário do ano inteiro: feriados, pontes, aniversários e ausências da equipa. */
export default function CalendarioAnual({ ano, aoMudarAno, aCarregar = false, pedidos, aniversarios, pontes, podeCriar = false, aoCriar }: Props) {
  const [localidade] = useLocalidade();
  const hoje = hojeIso();
  const anoHoje = Number(hoje.slice(0, 4));
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // A pesquisa filtra datas, aniversários e pedidos; vazia, mostra tudo.
  const marcas = useMemo(() => {
    const datas = filtrar([...datasDoAno(ano, localidade), ...datasDasPontes(pontes)], busca, (d) => [d.nome, rotulosData[d.tipo]]);
    const anivs = filtrar(aniversarios, busca, (a) => [a.user.nome, "aniversario"]);
    const peds = filtrar(pedidos, busca, (p) => [p.user?.nome, tipos[p.tipo]]);
    return marcasDoAno(ano, datas, anivs, peds);
  }, [ano, localidade, pontes, aniversarios, pedidos, busca]);
  const abertoMarcas = aberto ? marcas.get(aberto) : undefined;
  const listaDatas = useMemo(
    () => [...marcas.values()].flatMap((m) => m.datas).sort((a, b) => a.iso.localeCompare(b.iso) || a.nome.localeCompare(b.nome, "pt")),
    [marcas],
  );
  const vazio = !abertoMarcas || abertoMarcas.datas.length + abertoMarcas.aniversarios.length + abertoMarcas.pedidos.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3">
        {podeCriar && (
          <button type="button" className={botao} onClick={() => setNovo(true)}>
            Novo pedido
          </button>
        )}
        <div className="w-full max-w-md">
          <CampoBusca id="busca-calendario" rotulo="Pesquisar no calendário" valor={busca} onChange={setBusca} />
        </div>
      </div>
      {enviado && (
        <p role="status" className="rounded-controlo bg-primaria-suave px-3 py-2 text-sm text-texto">
          Pedido enviado. Fica pendente até ser aprovado.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Escolher ano">
          <button type="button" className={botaoSeta} aria-label="Ano anterior" title="Ano anterior" onClick={() => aoMudarAno(ano - 1)}>
            <IconeSeta direcao="esquerda" className="h-5 w-5" />
          </button>
          <p className="min-w-24 rounded-full bg-painel/70 px-5 py-2 text-center text-lg font-semibold tabular-nums shadow-suave ring-1 ring-white/70 dark:ring-white/10" aria-live="polite">
            {ano}
          </p>
          <button type="button" className={botaoSeta} aria-label="Ano seguinte" title="Ano seguinte" onClick={() => aoMudarAno(ano + 1)}>
            <IconeSeta direcao="direita" className="h-5 w-5" />
          </button>
        </div>
        {ano !== anoHoje && (
          <button type="button" className={botaoAno} onClick={() => aoMudarAno(anoHoje)}>
            Hoje
          </button>
        )}
        <div className="ml-auto">
          <EscolhaLocalidade id="cal-localidade" compacta />
        </div>
      </div>

      <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-texto-suave">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-rosa-suave" />
          Feriado
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-primaria-suave ring-1 ring-inset ring-primaria" />
          Ponte
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-texto underline decoration-dotted underline-offset-2">
            12
          </span>
          Data comemorativa
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rosa" />
          Aniversário
        </li>
        {(Object.keys(tipos) as TipoPedido[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <Ponto tipo={t} pendente={false} />
            {tipos[t]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <Ponto tipo="ferias" pendente />
          Pendente
        </li>
      </ul>

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${aCarregar ? "opacity-60" : ""}`} aria-busy={aCarregar}>
        {mesesPt.map((nome, i) => (
          <section
            key={nome}
            aria-label={`${nome} ${ano}`}
            className="rounded-cartao bg-painel/55 p-3 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10"
          >
            <h2 className="mb-2 text-sm font-semibold">{nome}</h2>
            <div role="grid" aria-label={`${nome} ${ano}`} className="grid grid-cols-7 gap-y-1">
              {diasSemana.map((d, k) => (
                <div key={k} role="columnheader" className="text-center text-[0.6875rem] font-medium uppercase text-texto-suave">
                  {d}
                </div>
              ))}
              {celulasDoMes({ ano, mes: i + 1 }).map((c) => {
                if (!c.doMes) return <div key={c.iso} role="gridcell" aria-hidden="true" />;
                const m = marcas.get(c.iso);
                const feriado = !!m?.datas.some((d) => d.tipo === "feriado" || d.tipo === "municipal");
                const ponte = !!m?.datas.some((d) => d.tipo === "ponte");
                const comemorativa = !!m?.datas.some((d) => d.tipo === "comemorativa");
                const escolhido = aberto === c.iso;
                // Um ponto por pessoa, tipo e estado; no máximo 3 para a célula não rebentar.
                const pontos = [...new Map((m?.pedidos ?? []).map((p) => [`${quemE(p)}|${p.tipo}|${p.estado}`, p])).entries()].slice(0, 3);
                const descricao = [
                  nomeDoDia(c.iso),
                  ...(m?.datas.map((d) => `${rotulosData[d.tipo]}: ${d.nome}`) ?? []),
                  ...(m?.aniversarios.map((n) => `Aniversário de ${n}`) ?? []),
                  ...(m?.pedidos.map((p) => `${p.user?.nome ?? "Alguém"}: ${tipos[p.tipo].toLowerCase()}${p.estado === "pendente" ? " (pendente)" : ""}`) ?? []),
                ].join(". ");
                return (
                  <button
                    key={c.iso}
                    type="button"
                    role="gridcell"
                    aria-label={descricao}
                    aria-selected={escolhido}
                    aria-current={c.iso === hoje ? "date" : undefined}
                    title={descricao}
                    onClick={() => setAberto(escolhido ? null : c.iso)}
                    className={`mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-xs tabular-nums ${foco} ${
                      c.iso === hoje
                        ? "bg-primaria font-semibold text-white"
                        : feriado
                          ? "bg-rosa-suave font-semibold text-texto"
                          : ponte
                            ? "bg-primaria-suave text-texto ring-1 ring-inset ring-primaria"
                            : "text-texto hover:bg-primaria-suave"
                    } ${comemorativa && !feriado ? "underline decoration-dotted underline-offset-2" : ""} ${escolhido ? "ring-2 ring-primaria" : ""}`}
                  >
                    {c.dia}
                    <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                      {m?.aniversarios.length ? <span className="h-1.5 w-1.5 rounded-full bg-rosa" /> : null}
                      {pontos.map(([chave, p]) => (
                        <Ponto key={chave} tipo={p.tipo} pendente={p.estado === "pendente"} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {aberto && (
        <section
          aria-labelledby="cal-dia"
          className="flex flex-col gap-2 rounded-cartao bg-painel/55 p-4 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10"
        >
          <h2 id="cal-dia" className="text-lg font-semibold">
            {nomeDoDia(aberto)}
          </h2>
          {vazio ? (
            <p className="text-texto-suave">Sem marcações neste dia.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {abertoMarcas?.datas.map((d) => (
                <li key={`${d.tipo}${d.nome}`}>
                  <span className="font-medium">{d.nome}</span> · {rotulosData[d.tipo]}
                </li>
              ))}
              {abertoMarcas?.aniversarios.map((n) => (
                <li key={n} className="font-medium">
                  Aniversário de {n}
                </li>
              ))}
              {abertoMarcas?.pedidos.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.user?.nome ?? "Alguém"}</span> · {tipos[p.tipo]}
                  {p.estado === "pendente" ? " (pendente)" : ""} · {dataCurta(p.data_inicio)} a {dataCurta(p.data_fim)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="cal-lista" className="flex flex-col gap-2">
        <h2 id="cal-lista" className="text-lg font-semibold">
          Feriados e datas de {ano}
        </h2>
        {listaDatas.length === 0 ? (
          <p className="text-texto-suave">Sem feriados nem datas em {ano}.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {listaDatas.map((d) => (
              <li key={`${d.iso}${d.nome}`} className="flex gap-2">
                <span className="w-12 shrink-0 tabular-nums text-texto-suave">{dataCurta(d.iso).slice(0, 5)}</span>
                <span>
                  {d.nome} <span className="text-texto-suave">· {rotulosData[d.tipo]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {novo && (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto scroll-fino bg-barra/50 p-4 pt-16" onClick={() => setNovo(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="novo-pedido"
            className="relative w-full max-w-lg rounded-cartao bg-painel p-6 shadow-suave"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setNovo(false)}
          >
            <button type="button" className={`${botaoSec} absolute right-4 top-4`} onClick={() => setNovo(false)}>
              Fechar
            </button>
            <PedidoForm
              dataInicial={aberto ?? ""}
              className="flex flex-col gap-4"
              onCriado={(avisos) => {
                aoCriar?.();
                if (avisos.length === 0) {
                  setNovo(false);
                  setEnviado(true);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
