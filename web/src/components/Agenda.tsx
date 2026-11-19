"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { PedidoAgenda as Pedido, TipoPedido } from "@/lib/api";
import { aplicarFiltrosAgenda, contarAtivos, type FiltrosAgenda } from "@/lib/filtros";
import {
  celulasDoMes,
  cobreDia,
  diasDoPedido,
  haSobreposicao,
  hojeIso,
  inicioSemana,
  isoDe,
  mesAnterior,
  mesDe,
  mesesPt,
  mesSeguinte,
  nomeDoDia,
  quemE,
  reduzido,
  somaDias,
  type Mes,
  tocaMes,
  visiveis,
} from "@/lib/agenda";
import { datasDoAno, datasDoDia, type DataEspecial } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { subtipos, tipos } from "@/lib/rotulos";
import EscolhaLocalidade from "./EscolhaLocalidade";
import { botao, botaoSec, label } from "./ui";
import GrupoChips from "./GrupoChips";
import PainelFiltros from "./PainelFiltros";
import PedidoForm from "./PedidoForm";
import Seletor from "./Seletor";

// Marcas por dia no calendário pequeno; o dia aberto mostra sempre todos.
const MAX_MARCAS = 3;

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Cores de estado com os tokens de globals.css. Aprovado = cheio a verde, pendente = tracejado.
const estiloMarca = {
  aprovado: "border-positivo bg-positivo",
  pendente: "border-dashed border-primaria bg-painel",
  recusado: "",
} as const;
const barraEstado = { aprovado: "bg-positivo", pendente: "bg-primaria", recusado: "" } as const;
const pilulaEstado = {
  aprovado: "bg-positivo/15 text-texto",
  pendente: "border border-dashed border-primaria text-texto",
  recusado: "",
} as const;

const rotulosData = { feriado: "Feriado nacional", municipal: "Feriado municipal", comemorativa: "Data comemorativa" } as const;
const rotuloData = (d: DataEspecial) => rotulosData[d.tipo];
const pilulaData = {
  feriado: "bg-rosa-suave text-texto",
  municipal: "bg-rosa-suave text-texto ring-1 ring-inset ring-rosa",
  comemorativa: "border border-linha-forte text-texto",
} as const;

const focoCls = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-1";

const nomeDe = (p: Pedido, proprio?: string) => p.user?.nome ?? proprio ?? "Eu";
const descricao = (p: Pedido) => `${tipos[p.tipo]}${p.subtipo ? ` (${subtipos[p.subtipo]})` : ""}`;
const rotuloEstado = (p: Pedido) => (p.estado === "aprovado" ? "Aprovado" : "Pendente");

// "2026-11-27" -> "27 nov"
const curta = (iso: string) => `${Number(iso.slice(8, 10))} ${mesesPt[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}`;
const periodo = (p: Pedido) => (p.data_inicio === p.data_fim ? curta(p.data_inicio) : `${curta(p.data_inicio)} a ${curta(p.data_fim)}`);
const nDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
const diaDoPedido = (p: Pedido, iso: string) => diasDoPedido({ ...p, data_fim: iso });

function tituloSemana(seg: string) {
  const dom = somaDias(seg, 6);
  const mesSeg = mesesPt[Number(seg.slice(5, 7)) - 1].toLowerCase();
  const mesDom = mesesPt[Number(dom.slice(5, 7)) - 1].toLowerCase();
  const d1 = Number(seg.slice(8, 10));
  const d2 = Number(dom.slice(8, 10));
  return mesSeg === mesDom ? `${d1} a ${d2} de ${mesDom} de ${dom.slice(0, 4)}` : `${d1} de ${mesSeg} a ${d2} de ${mesDom} de ${dom.slice(0, 4)}`;
}

export default function Agenda({
  pedidos,
  admin,
  nomeProprio,
  hoje = hojeIso(),
  aCarregar = false,
  comErro = false,
  aoMudarMes,
  podeCriar = false,
  aoCriar,
}: {
  pedidos: Pedido[];
  admin: boolean;
  nomeProprio?: string;
  hoje?: string;
  aCarregar?: boolean;
  comErro?: boolean;
  aoMudarMes?: (m: Mes) => void;
  /** Funcionário pode pedir férias a partir da agenda (admin não faz pedidos). */
  podeCriar?: boolean;
  aoCriar?: () => void;
}) {
  const [localidade] = useLocalidade();
  const [novo, setNovo] = useState<{ data: string } | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [mes, setMes] = useState(() => mesDe(hoje));
  useEffect(() => {
    aoMudarMes?.(mes);
  }, [mes, aoMudarMes]);
  const [filtros, setFiltros] = useState<FiltrosAgenda>({ tipos: [], estados: [], funcionarioId: null });
  // Como no Google Calendar, a agenda abre no dia de hoje.
  const [sel, setSel] = useState<{ iso: string; pedidoId?: number } | null>(() => ({ iso: hoje }));
  const [foco, setFoco] = useState(hoje);
  const [pulso, setPulso] = useState(0);
  const origem = useRef<HTMLElement | null>(null);
  const painel = useRef<HTMLElement>(null);

  // Foco vai para o painel quando a pessoa abre um dia ou pedido; ao fechar volta ao elemento que o abriu.
  useEffect(() => {
    if (pulso > 0) painel.current?.focus();
  }, [pulso]);

  const irPara = (s: { iso: string; pedidoId?: number }) => {
    setSel(s);
    setFoco(s.iso);
    const m = mesDe(s.iso);
    if (m.ano !== mes.ano || m.mes !== mes.mes) setMes(m);
  };
  const abrir = (e: { currentTarget: HTMLElement }, s: { iso: string; pedidoId?: number }) => {
    if (!painel.current?.contains(e.currentTarget)) origem.current = e.currentTarget;
    irPara(s);
    setPulso((n) => n + 1);
  };
  const fechar = () => {
    setSel(null);
    if (origem.current?.isConnected) origem.current.focus();
    origem.current = null;
  };
  const aoTecla = (e: KeyboardEvent) => {
    if (e.key === "Escape") fechar();
  };
  const mudarMes = (m: Mes) => {
    setMes(m);
    const mh = mesDe(hoje);
    const iso = mh.ano === m.ano && mh.mes === m.mes ? hoje : isoDe(m.ano, m.mes, 1);
    setFoco(iso);
    if (sel) setSel({ iso });
  };
  const mudarSemana = (n: number) => irPara({ iso: somaDias(sel?.iso ?? foco, n * 7) });

  const pessoas = useMemo(() => {
    const m = new Map<number, string>();
    visiveis(pedidos).forEach((p) => {
      const id = quemE(p);
      if (id !== undefined) m.set(id, nomeDe(p, nomeProprio));
    });
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "pt"));
  }, [pedidos, nomeProprio]);

  const filtrados = useMemo(() => aplicarFiltrosAgenda(visiveis(pedidos), filtros), [pedidos, filtros]);
  const doMes = useMemo(
    () => filtrados.filter((p) => tocaMes(p, mes)).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
    [filtrados, mes],
  );
  const totalMes = useMemo(() => visiveis(pedidos).filter((p) => tocaMes(p, mes)).length, [pedidos, mes]);
  const ativos = contarAtivos(filtros);
  const limpar = () => setFiltros({ tipos: [], estados: [], funcionarioId: null });
  const semanas = useMemo(() => {
    const c = celulasDoMes(mes);
    return Array.from({ length: c.length / 7 }, (_, i) => c.slice(i * 7, i * 7 + 7));
  }, [mes]);

  const datasMes = useMemo(
    () => datasDoAno(mes.ano, localidade).filter((d) => Number(d.iso.slice(5, 7)) === mes.mes),
    [mes, localidade],
  );

  const diaAberto = sel?.iso ?? foco;
  const segunda = inicioSemana(diaAberto);
  const semana = Array.from({ length: 7 }, (_, i) => somaDias(segunda, i));

  const pedidoSel =
    sel?.pedidoId !== undefined ? pedidos.find((p) => p.id === sel.pedidoId && p.estado !== "recusado") : undefined;
  const doDiaSel = sel ? filtrados.filter((p) => cobreDia(p, sel.iso)) : [];
  const sobreposicaoSel = sel ? haSobreposicao(visiveis(pedidos).filter((p) => cobreDia(p, sel.iso))) : false;

  const grupos = useMemo(() => {
    const m = new Map<string, Pedido[]>();
    doMes.forEach((p) => m.set(p.data_inicio, [...(m.get(p.data_inicio) ?? []), p]));
    return [...m];
  }, [doMes]);

  const navCls =
    "min-h-10 rounded-controlo px-3 text-sm font-medium text-texto hover:bg-painel focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";

  return (
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
      {/* Coluna da esquerda: criar, mês pequeno, filtros e lista do mês (rola por dentro). */}
      <aside
        aria-label="Calendário do mês"
        className="flex w-full shrink-0 flex-col gap-5 lg:min-h-0 lg:w-80 lg:overflow-y-auto lg:border-r lg:border-linha lg:pr-5"
      >
        {podeCriar && (
          <button type="button" className={`${botao} self-start`} onClick={() => setNovo({ data: sel?.iso ?? "" })}>
            Novo pedido
          </button>
        )}
        {enviado && (
          <p role="status" className="rounded-controlo bg-primaria-suave px-3 py-2 text-sm text-texto">
            Pedido enviado. Fica pendente até ser aprovado.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold" aria-live="polite">
              {mesesPt[mes.mes - 1]} {mes.ano}
            </h2>
          </div>
          <div className="flex gap-1 rounded-controlo bg-campo p-1">
            <button type="button" className={`${navCls} flex-1`} onClick={() => mudarMes(mesAnterior(mes))}>
              Mês anterior
            </button>
            <button type="button" className={`${navCls} flex-1`} onClick={() => mudarMes(mesSeguinte(mes))}>
              Mês seguinte
            </button>
          </div>
          <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="flex flex-col gap-1">
            <div role="row" className="grid grid-cols-7 gap-1">
              {diasSemana.map((d) => (
                <div key={d} role="columnheader" className="text-center text-[0.6875rem] font-medium uppercase text-texto-suave">
                  {d}
                </div>
              ))}
            </div>
            {semanas.map((linha) => (
              <div key={linha[0].iso} role="row" className="grid grid-cols-7 gap-1">
                {linha.map((c) => {
                  const doDia = filtrados.filter((p) => cobreDia(p, c.iso));
                  const sobrepoe = haSobreposicao(visiveis(pedidos).filter((p) => cobreDia(p, c.iso)));
                  const eHoje = c.iso === hoje;
                  const aberto = c.iso === diaAberto;
                  const especiais = datasDoDia(c.iso, localidade);
                  const feriado = especiais.some((d) => d.tipo !== "comemorativa");
                  return (
                    <div
                      key={c.iso}
                      role="gridcell"
                      aria-current={eHoje ? "date" : undefined}
                      onClick={(e) => abrir(e, { iso: c.iso })}
                      className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-controlo py-1 ${
                        aberto ? "bg-primaria-suave" : "hover:bg-campo"
                      } ${c.doMes ? "" : "text-texto-suave"} ${sobrepoe ? "ring-2 ring-inset ring-rosa" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrir(e, { iso: c.iso });
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums ${focoCls} ${
                          eHoje ? "bg-primaria font-semibold text-white" : feriado ? "bg-rosa-suave font-semibold" : ""
                        } ${especiais.length > 0 && !feriado ? "underline decoration-dotted underline-offset-2" : ""}`}
                      >
                        {c.dia}
                        <span className="sr-only"> de {mesesPt[Number(c.iso.slice(5, 7)) - 1]}</span>
                        {eHoje && <span className="sr-only"> (hoje)</span>}
                      </button>
                      {sobrepoe && <span className="sr-only">Sobreposição</span>}
                      {especiais.length > 0 && <span className="sr-only">{especiais.map((d) => d.nome).join(", ")}</span>}
                      <div className="flex h-1.5 w-full justify-center gap-0.5 px-1">
                        {doDia.slice(0, MAX_MARCAS).map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrir(e, { iso: c.iso, pedidoId: p.id });
                            }}
                            title={`${nomeDe(p, nomeProprio)}: ${descricao(p)}, ${p.data_inicio} a ${p.data_fim} (${p.estado})`}
                            className={`truncate h-1.5 w-2.5 rounded-full border ${focoCls} ${estiloMarca[p.estado]}`}
                          >
                            <span className="sr-only">
                              {nomeDe(p, nomeProprio)} · {tipos[p.tipo]}
                              {p.estado === "pendente" && " (pendente)"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs text-texto-suave">
            Verde: aprovado. Tracejado: pendente. Contorno rosa: mais de uma pessoa fora. Fundo rosa: feriado. Sublinhado:
            data comemorativa. Pedidos recusados não aparecem.
          </p>
        </div>

        {!aCarregar && !comErro && (totalMes > 0 || ativos > 0) && (
          <PainelFiltros ativos={ativos} total={totalMes} mostrados={doMes.length} rotuloItens="pedidos neste mês" onLimpar={limpar}>
            <GrupoChips
              legenda="Tipo"
              opcoes={(Object.keys(tipos) as TipoPedido[]).map((valor) => ({ valor, rotulo: tipos[valor] }))}
              selecionados={filtros.tipos}
              onChange={(t) => setFiltros((f) => ({ ...f, tipos: t }))}
            />
            {admin && (
              <GrupoChips
                legenda="Estado"
                opcoes={[
                  { valor: "pendente", rotulo: "Pendente" },
                  { valor: "aprovado", rotulo: "Aprovado" },
                ]}
                selecionados={filtros.estados}
                onChange={(e) => setFiltros((f) => ({ ...f, estados: e }))}
              />
            )}
            {admin && (
              <div>
                <label htmlFor="ag-func" className={label}>
                  Funcionário
                </label>
                <Seletor
                  id="ag-func"
                  className="min-h-11"
                  valor={filtros.funcionarioId === null ? "" : String(filtros.funcionarioId)}
                  opcoes={[{ valor: "", rotulo: "Todos" }, ...pessoas.map(([id, nome]) => ({ valor: String(id), rotulo: nome }))]}
                  onChange={(v) => setFiltros((f) => ({ ...f, funcionarioId: v ? Number(v) : null }))}
                />
              </div>
            )}
          </PainelFiltros>
        )}

        <section aria-labelledby="ag-lista" className="flex flex-col gap-3">
          <h3 id="ag-lista" className="text-base font-semibold">
            Pedidos de {mesesPt[mes.mes - 1]} {mes.ano}
          </h3>
          {aCarregar ? (
            <p className="text-texto-suave">A carregar pedidos...</p>
          ) : comErro ? (
            <p className="text-texto-suave">Não foi possível carregar os pedidos.</p>
          ) : doMes.length === 0 ? (
            <p className="text-texto-suave">{ativos > 0 && totalMes > 0 ? "Sem resultados com estes filtros." : "Sem pedidos neste mês."}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {grupos.map(([data, lista]) => (
                <li key={data} className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-texto-suave">{curta(data)}</p>
                  <ul className="flex flex-col gap-1.5">
                    {lista.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={(e) => abrir(e, { iso: p.data_inicio, pedidoId: p.id })}
                          className={`flex w-full items-stretch gap-2 rounded-controlo bg-campo p-2 text-left text-sm hover:bg-primaria-suave ${focoCls}`}
                        >
                          <span aria-hidden="true" className={`w-1 shrink-0 rounded-full ${barraEstado[p.estado]}`} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {nomeDe(p, nomeProprio)} · {descricao(p)}
                            </span>
                            <span className="block text-texto-suave">
                              {periodo(p)} · {rotuloEstado(p)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section aria-labelledby="ag-datas" className="flex flex-col gap-2">
            <h3 id="ag-datas" className="text-base font-semibold">
              Feriados e datas de {mesesPt[mes.mes - 1]}
            </h3>
            <EscolhaLocalidade id="ag-localidade" compacta />
            {datasMes.length === 0 && <p className="text-sm text-texto-suave">Sem feriados nem datas neste mês.</p>}
            <ul className="flex flex-col gap-1">
              {datasMes.map((d) => (
                <li key={d.iso + d.nome}>
                  <button
                    type="button"
                    onClick={(e) => abrir(e, { iso: d.iso })}
                    className={`flex w-full items-center gap-3 rounded-controlo px-2 py-1.5 text-left text-sm hover:bg-campo ${focoCls}`}
                  >
                    <span className="w-12 shrink-0 font-medium tabular-nums">{curta(d.iso)}</span>
                    <span className="min-w-0 flex-1 truncate">{d.nome}</span>
                    <span className={`shrink-0 rounded-full px-2 text-[0.6875rem] leading-5 ${pilulaData[d.tipo]}`}>
                      {d.tipo === "feriado" ? "Feriado" : d.tipo === "municipal" ? "Municipal" : "Comemorativa"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
        </section>
      </aside>

      {/* Área principal: a semana no topo e o dia aberto por baixo. */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-controlo bg-campo p-1">
            <button type="button" className={navCls} onClick={() => irPara({ iso: hoje })}>
              Hoje
            </button>
            <button type="button" className={navCls} onClick={() => mudarSemana(-1)}>
              Semana anterior
            </button>
            <button type="button" className={navCls} onClick={() => mudarSemana(1)}>
              Semana seguinte
            </button>
          </div>
          <p className="text-lg font-semibold">{tituloSemana(segunda)}</p>
        </div>

        <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1 border-b border-linha pb-3">
          {semana.map((iso, i) => {
            const n = filtrados.filter((p) => cobreDia(p, iso)).length;
            const eHoje = iso === hoje;
            const aberto = iso === diaAberto;
            const especiais = datasDoDia(iso, localidade);
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={aberto}
                aria-label={`${nomeDoDia(iso)}${eHoje ? " (hoje)" : ""}${especiais.map((d) => `, ${d.nome}`).join("")}, ${n === 0 ? "ninguém fora" : `${n} ${n === 1 ? "pedido" : "pedidos"}`}`}
                onClick={(e) => abrir(e, { iso })}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-cartao px-1 py-2 ${focoCls} ${aberto ? "bg-primaria-suave" : "hover:bg-campo"}`}
              >
                <span className={`text-xs font-medium uppercase tracking-wide ${eHoje ? "text-texto" : "text-texto-suave"}`}>
                  {diasSemana[i]}.
                </span>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl tabular-nums ${
                    eHoje ? "bg-primaria font-semibold text-white" : "text-texto"
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </span>
                <span className="text-xs text-texto-suave">{n === 0 ? "livre" : `${n} fora`}</span>
                {especiais[0] && (
                  <span
                    aria-hidden="true"
                    className={`max-w-full truncate rounded-full px-2 text-[0.6875rem] font-medium leading-5 ${pilulaData[especiais[0].tipo]}`}
                  >
                    {especiais[0].nome}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {sel ? (
            <section
              ref={painel}
              tabIndex={-1}
              onKeyDown={aoTecla}
              aria-label={pedidoSel ? `Pedido de ${nomeDe(pedidoSel, nomeProprio)}` : `Pedidos de ${sel.iso}`}
              className="flex flex-col gap-4 rounded-cartao focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">
                    {pedidoSel ? `Pedido de ${nomeDe(pedidoSel, nomeProprio)}` : nomeDoDia(sel.iso)}
                  </h3>
                  {!pedidoSel && (
                    <p className="text-sm text-texto-suave">
                      {doDiaSel.length === 0
                        ? "Ninguém fora"
                        : `${doDiaSel.length} ${doDiaSel.length === 1 ? "pedido" : "pedidos"} neste dia`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {podeCriar && !pedidoSel && (
                    <button type="button" className={botaoSec} onClick={() => setNovo({ data: sel.iso })}>
                      Pedir a partir deste dia
                    </button>
                  )}
                  <button type="button" className={botaoSec} onClick={fechar}>
                    Fechar
                  </button>
                </div>
              </div>
              {pedidoSel ? (
                <div className="flex max-w-xl flex-col gap-3 rounded-cartao bg-painel p-4 shadow-suave ring-1 ring-linha">
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="font-medium">Funcionário</dt>
                    <dd>{nomeDe(pedidoSel, nomeProprio)}</dd>
                    <dt className="font-medium">Tipo</dt>
                    <dd>{tipos[pedidoSel.tipo]}</dd>
                    {!reduzido(pedidoSel) && (
                      <>
                        <dt className="font-medium">Subtipo</dt>
                        <dd>{pedidoSel.subtipo ? subtipos[pedidoSel.subtipo] : "Sem subtipo"}</dd>
                      </>
                    )}
                    <dt className="font-medium">Datas</dt>
                    <dd>
                      {pedidoSel.data_inicio} a {pedidoSel.data_fim}
                    </dd>
                    <dt className="font-medium">Dias</dt>
                    <dd>{diasDoPedido(pedidoSel)}</dd>
                    <dt className="font-medium">Estado</dt>
                    <dd>{rotuloEstado(pedidoSel)}</dd>
                    {!reduzido(pedidoSel) && (
                      <>
                        <dt className="font-medium">Descrição</dt>
                        <dd>{pedidoSel.observacao || "Sem observação"}</dd>
                        <dt className="font-medium">Decidido em</dt>
                        <dd>{pedidoSel.decidido_em ? pedidoSel.decidido_em.slice(0, 10) : "Ainda não decidido"}</dd>
                      </>
                    )}
                  </dl>
                  <div>
                    <button type="button" className={botaoSec} onClick={() => setSel({ iso: sel.iso })}>
                      Voltar ao dia
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {datasDoDia(sel.iso, localidade).map((d) => (
                    <p key={d.nome} className={`self-start rounded-controlo px-3 py-2 text-sm ${pilulaData[d.tipo]}`}>
                      <span className="font-semibold">{rotuloData(d)}</span> · {d.nome}
                      {d.tipo === "feriado" && " · dia de descanso obrigatório"}
                      {d.tipo === "municipal" && " · só neste concelho"}
                    </p>
                  ))}
                  {sobreposicaoSel && (
                    <p className="rounded-controlo bg-rosa-suave px-3 py-2 text-sm font-medium text-texto">
                      Sobreposição: mais de uma pessoa fora neste dia.
                    </p>
                  )}
                  {aCarregar ? (
                    <div aria-hidden="true" className="flex flex-col gap-3">
                      <div className="h-20 animate-pulse rounded-cartao bg-campo" />
                      <div className="h-20 animate-pulse rounded-cartao bg-campo" />
                    </div>
                  ) : doDiaSel.length === 0 ? (
                    <p className="rounded-cartao bg-campo p-6 text-texto-suave">
                      Ninguém está fora neste dia. Escolhe outro dia na semana ou no calendário.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {doDiaSel.map((p) => {
                        const total = diasDoPedido(p);
                        const n = diaDoPedido(p, sel.iso);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSel({ iso: sel.iso, pedidoId: p.id })}
                              className={`flex w-full items-stretch gap-4 rounded-cartao bg-painel p-4 text-left shadow-suave ring-1 ring-linha hover:bg-primaria-suave ${focoCls}`}
                            >
                              <span aria-hidden="true" className={`w-1.5 shrink-0 rounded-full ${barraEstado[p.estado]}`} />
                              <span className="flex min-w-0 flex-1 flex-col gap-2">
                                <span className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-base">
                                    <span className="font-semibold">{nomeDe(p, nomeProprio)}</span>
                                    <span> · {descricao(p)} · </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pilulaEstado[p.estado]}`}>
                                      {rotuloEstado(p)}
                                    </span>
                                  </span>
                                  <span className="text-sm text-texto-suave">
                                    {periodo(p)} · {nDias(total)}
                                  </span>
                                </span>
                                <span className="flex items-center gap-3 text-xs text-texto-suave">
                                  <span className="h-1.5 flex-1 rounded-full bg-trilho">
                                    <span
                                      className={`block h-1.5 rounded-full ${barraEstado[p.estado]}`}
                                      style={{ width: `${Math.round((n / total) * 100)}%` }}
                                    />
                                  </span>
                                  <span className="shrink-0">
                                    Dia {n} de {total}
                                  </span>
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </section>
          ) : (
            <p className="rounded-cartao bg-campo p-6 text-texto-suave">Escolhe um dia na semana ou no calendário para ver quem está fora.</p>
          )}
        </div>
      </div>

      {novo && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-barra/50 p-4 pt-16"
          onClick={() => setNovo(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="novo-pedido"
            className="relative w-full max-w-lg rounded-cartao bg-painel p-6 shadow-suave"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setNovo(null)}
          >
            <button type="button" className={`${botaoSec} absolute right-4 top-4`} onClick={() => setNovo(null)}>
              Fechar
            </button>
            <PedidoForm
              key={novo.data}
              dataInicial={novo.data}
              className="flex flex-col gap-4"
              onCriado={(avisos) => {
                aoCriar?.();
                if (avisos.length === 0) {
                  setNovo(null);
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
