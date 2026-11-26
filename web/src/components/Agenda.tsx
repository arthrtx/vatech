"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api, mensagemDeErro, type Aniversario, type Compromisso, type PedidoAgenda as Pedido, type Presenca, type TipoPedido } from "@/lib/api";
import { aplicarFiltrosAgenda, contarAtivos, type FiltrosAgenda } from "@/lib/filtros";
import {
  cobreDia,
  diasDoPedido,
  estagioCobre,
  haSobreposicao,
  hojeIso,
  horasDoPedido,
  inicioSemana,
  mesDe,
  mesesPt,
  nomeDoDia,
  presencasDoDia,
  quemE,
  reduzido,
  somaDias,
  type Estagio,
  type Mes,
  tocaMes,
  visiveis,
} from "@/lib/agenda";
import { datasDasPontes, datasDoAno, datasDoDia, type DataEspecial, type PonteDia } from "@/lib/feriados";
import { useAuth } from "@/lib/auth";
import { useLocalidade } from "@/lib/localidade";
import { dataPt, horaDe, totalHoras } from "@/lib/presencas";
import { subtipos, tipos } from "@/lib/rotulos";
import EscolhaLocalidade from "./EscolhaLocalidade";
import { botaoSec, label, vidro } from "./ui";
import GrupoChips from "./GrupoChips";
import CompromissoForm, { tiposCompromisso } from "./CompromissoForm";
import { IconeSeta } from "./Icones";
import JanelaFormulario from "./JanelaFormulario";
import NovaMarcacao from "./NovaMarcacao";
import PainelFiltros from "./PainelFiltros";
import PedidoForm from "./PedidoForm";
import Seletor from "./Seletor";

const botaoSeta =
  "flex h-9 w-9 items-center justify-center rounded-full border border-linha-forte bg-painel text-texto transition hover:bg-primaria-suave focus-visible:outline-2 focus-visible:outline-offset-2";

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Cores de estado com os tokens de globals.css. Aprovado = traço cheio a verde, pendente = traço vazado.
const barraEstado = { aprovado: "bg-positivo", pendente: "bg-primaria", recusado: "", cancelado: "" } as const;
const pilulaEstado = {
  aprovado: "bg-positivo/15 text-texto",
  pendente: "border border-dashed border-primaria text-texto",
  recusado: "",
  cancelado: "",
} as const;

const rotulosData = { feriado: "Feriado nacional", municipal: "Feriado municipal", comemorativa: "Data comemorativa", ponte: "Ponte" } as const;
const rotuloData = (d: DataEspecial) => rotulosData[d.tipo];
const pilulaData = {
  feriado: "bg-rosa-suave text-texto",
  municipal: "bg-rosa-suave text-texto ring-1 ring-inset ring-rosa",
  comemorativa: "border border-linha-forte text-texto",
  ponte: "bg-primaria-suave text-texto ring-1 ring-inset ring-primaria",
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
  presencas = [],
  estagios = [],
  aniversarios = [],
  pontes = [],
  compromissos = [],
  aoMudarCompromissos,
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
  /** Presenças do intervalo visível (a API já limita a cada pessoa quem não é admin). */
  presencas?: Presenca[];
  /** Períodos de estágio a mostrar (o próprio, ou todos para o admin). */
  estagios?: Estagio[];
  /** Aniversários do intervalo visível (quem indicou a data de nascimento). */
  aniversarios?: Aniversario[];
  /** Pontes da empresa (registadas pelo admin) a mostrar como dias de descanso. */
  pontes?: PonteDia[];
  /** Compromissos da agenda pessoal no intervalo visível. */
  compromissos?: Compromisso[];
  /** Chamado depois de marcar ou apagar um compromisso, para recarregar a lista. */
  aoMudarCompromissos?: () => void;
}) {
  const [localidade] = useLocalidade();
  // Estagiários não tiram férias: só pedem ausências e licenças.
  const semFerias = useAuth().user?.papel === "estagiario";
  const [novo, setNovo] = useState<{ data: string } | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [novoComp, setNovoComp] = useState<{ data: string } | null>(null);
  const [erroComp, setErroComp] = useState<string | null>(null);
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

  const datasDePontes = useMemo(() => datasDasPontes(pontes), [pontes]);
  const especiaisDe = (iso: string) => [...datasDoDia(iso, localidade), ...datasDePontes.filter((d) => d.iso === iso)];
  const datasMes = useMemo(
    () =>
      [...datasDoAno(mes.ano, localidade), ...datasDePontes]
        .filter((d) => Number(d.iso.slice(0, 4)) === mes.ano && Number(d.iso.slice(5, 7)) === mes.mes)
        .sort((a, b) => a.iso.localeCompare(b.iso)),
    [mes, localidade, datasDePontes],
  );

  const aniversariosDoDia = useMemo(() => {
    const m = new Map<string, string[]>();
    aniversarios.forEach((a) => m.set(a.data, [...(m.get(a.data) ?? []), a.user.nome]));
    return (iso: string) => m.get(iso) ?? [];
  }, [aniversarios]);
  const aniversariosMes = aniversarios.filter((a) => Number(a.data.slice(5, 7)) === mes.mes && Number(a.data.slice(0, 4)) === mes.ano);

  const diaAberto = sel?.iso ?? foco;
  const segunda = inicioSemana(diaAberto);
  const semana = Array.from({ length: 7 }, (_, i) => somaDias(segunda, i));

  const pedidoSel =
    sel?.pedidoId !== undefined ? pedidos.find((p) => p.id === sel.pedidoId && p.estado !== "recusado" && p.estado !== "cancelado") : undefined;
  const presencasSel = sel ? presencasDoDia(presencas, sel.iso) : [];
  const estagiosSel = sel ? estagios.filter((e) => estagioCobre(e, sel.iso)) : [];
  const doDiaSel = sel ? filtrados.filter((p) => cobreDia(p, sel.iso)) : [];
  const compromissosDoDia = (iso: string) => compromissos.filter((c) => c.data === iso);
  const compSel = sel ? compromissosDoDia(sel.iso) : [];
  async function apagarCompromisso(c: Compromisso) {
    setErroComp(null);
    try {
      await api.apagarCompromisso(c.id);
      aoMudarCompromissos?.();
    } catch (e) {
      setErroComp(mensagemDeErro(e));
    }
  }
  const sobreposicaoSel = sel ? haSobreposicao(visiveis(pedidos).filter((p) => cobreDia(p, sel.iso))) : false;

  const grupos = useMemo(() => {
    const m = new Map<string, Pedido[]>();
    doMes.forEach((p) => m.set(p.data_inicio, [...(m.get(p.data_inicio) ?? []), p]));
    return [...m];
  }, [doMes]);


  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
      {/* Coluna da esquerda: criar, mês pequeno, filtros e lista do mês (rola por dentro). */}
      <aside
        aria-label="Calendário do mês"
        className="flex w-full shrink-0 flex-col gap-5 lg:min-h-0 lg:w-[26rem] xl:w-[32rem] lg:overflow-y-auto lg:scroll-fino"
      >
        {enviado && (
          <p role="status" className="rounded-controlo bg-primaria-suave px-3 py-2 text-sm text-texto">
            Pedido enviado. Fica pendente até ser aprovado.
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold" aria-live="polite">
            {mesesPt[mes.mes - 1]} {mes.ano}
          </h2>
        </div>

        {!aCarregar && !comErro && admin && (totalMes > 0 || ativos > 0) && (
          <PainelFiltros ativos={ativos} total={totalMes} mostrados={doMes.length} rotuloItens="pedidos neste mês" onLimpar={limpar}>
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

        {estagios.length > 0 && (
          <section aria-labelledby="ag-estagio" className={`${vidro} flex flex-col gap-2 p-5`}>
            <h3 id="ag-estagio" className="text-base font-semibold">
              {admin ? "Períodos de estágio" : "O meu estágio"}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {estagios.map((e) => (
                <li key={e.id} className="rounded-cartao bg-campo px-4 py-2 text-sm">
                  {admin && <span className="block font-medium">{e.nome}</span>}
                  <span className="block text-texto-suave">
                    {e.inicio && e.fim ? `${dataPt(e.inicio)} a ${dataPt(e.fim)}` : "Período ainda não definido."}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="ag-lista" className={`${vidro} flex flex-col gap-3 p-5`}>
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
                          className={`flex w-full items-start gap-3 rounded-cartao bg-campo px-4 py-2.5 text-left text-sm hover:bg-primaria-suave ${focoCls}`}
                        >
                          <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${barraEstado[p.estado]}`} />
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
        <section aria-labelledby="ag-datas" className={`${vidro} flex flex-col gap-2 p-5`}>
            <h3 id="ag-datas" className="text-base font-semibold">
              Feriados e datas de {mesesPt[mes.mes - 1]}
            </h3>
            <EscolhaLocalidade id="ag-localidade" compacta />
            {datasMes.length === 0 && aniversariosMes.length === 0 && (
              <p className="text-sm text-texto-suave">Sem feriados, datas nem aniversários neste mês.</p>
            )}
            <ul className="flex flex-col gap-1">
              {aniversariosMes.map((a) => (
                <li key={`${a.data}-${a.user.id}`}>
                  <button
                    type="button"
                    onClick={(e) => abrir(e, { iso: a.data })}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm hover:bg-campo ${focoCls}`}
                  >
                    <span className="w-12 shrink-0 font-medium tabular-nums">{curta(a.data)}</span>
                    <span className="min-w-0 flex-1 truncate">Aniversário de {a.user.nome}</span>
                    <span className="shrink-0 rounded-full bg-rosa-suave px-2 text-[0.6875rem] leading-5 text-texto">Aniversário</span>
                  </button>
                </li>
              ))}
              {datasMes.map((d) => (
                <li key={d.iso + d.nome}>
                  <button
                    type="button"
                    onClick={(e) => abrir(e, { iso: d.iso })}
                    className={`flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm hover:bg-campo ${focoCls}`}
                  >
                    <span className="w-12 shrink-0 font-medium tabular-nums">{curta(d.iso)}</span>
                    <span className="min-w-0 flex-1 truncate">{d.nome}</span>
                    <span className={`shrink-0 rounded-full px-2 text-[0.6875rem] leading-5 ${pilulaData[d.tipo]}`}>
                      {d.tipo === "feriado" ? "Feriado" : d.tipo === "municipal" ? "Municipal" : d.tipo === "ponte" ? "Ponte" : "Comemorativa"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
        </section>
      </aside>

      {/* Área principal: a semana no topo e o dia aberto por baixo. */}
      <div className={`${vidro} flex min-w-0 flex-1 flex-col gap-4 p-5 lg:min-h-0`}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xl font-semibold">{tituloSemana(segunda)}</p>
          <div className="flex items-center gap-2">
            <button type="button" className={botaoSeta} aria-label="Semana anterior" title="Semana anterior" onClick={() => irPara({ iso: somaDias(diaAberto, -7) })}>
              <IconeSeta direcao="esquerda" className="h-4 w-4" />
            </button>
            <button type="button" className={botaoSeta} aria-label="Semana seguinte" title="Semana seguinte" onClick={() => irPara({ iso: somaDias(diaAberto, 7) })}>
              <IconeSeta direcao="direita" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1 border-b border-linha pb-3">
          {semana.map((iso, i) => {
            const n = filtrados.filter((p) => cobreDia(p, iso)).length;
            const eHoje = iso === hoje;
            const aberto = iso === diaAberto;
            const especiais = especiaisDe(iso);
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
                {compromissosDoDia(iso).length > 0 && (
                  <span className="rounded-full bg-primaria-suave px-2 text-[0.6875rem] font-medium leading-5 text-texto">
                    {compromissosDoDia(iso).length} na agenda
                  </span>
                )}
                {aniversariosDoDia(iso).length > 0 && (
                  <span
                    aria-hidden="true"
                    className="max-w-full truncate rounded-full bg-rosa-suave px-2 text-[0.6875rem] font-medium leading-5 text-texto"
                  >
                    Aniversário de {aniversariosDoDia(iso)[0]}
                    {aniversariosDoDia(iso).length > 1 && ` +${aniversariosDoDia(iso).length - 1}`}
                  </span>
                )}
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

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:scroll-fino">
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
                  {!pedidoSel && (
                    <NovaMarcacao
                      opcoes={[
                        ...(podeCriar
                          ? [{ rotulo: semFerias ? "Pedido de ausência ou licença" : "Pedido de férias ou ausência", ajuda: semFerias ? "Ausência ou licença" : "Férias, ausência ou licença", aoEscolher: () => setNovo({ data: sel.iso }) }]
                          : []),
                        ...(sel.iso >= hoje
                          ? [{ rotulo: "Compromisso na agenda", ajuda: "Reunião, chamada, lembrete...", aoEscolher: () => setNovoComp({ data: sel.iso }) }]
                          : []),
                      ]}
                    />
                  )}
                  <button type="button" className={botaoSec} onClick={fechar}>
                    Fechar
                  </button>
                </div>
              </div>
              {pedidoSel ? (
                <div className="flex max-w-xl flex-col gap-3 rounded-cartao bg-campo p-5">
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
                    {horasDoPedido(pedidoSel) && (
                      <>
                        <dt className="font-medium">Horas</dt>
                        <dd>{horasDoPedido(pedidoSel)}</dd>
                      </>
                    )}
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
                  <section aria-labelledby="ag-compromissos" className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 id="ag-compromissos" className="text-base font-semibold">
                        Agenda do dia
                      </h4>
                    </div>
                    {erroComp && (
                      <p role="alert" className="rounded-controlo border border-rosa bg-rosa-suave px-3 py-2 text-sm text-texto">
                        {erroComp}
                      </p>
                    )}
                    {compSel.length === 0 ? (
                      <p className="text-sm text-texto-suave">
                        {sel.iso < hoje ? "Nada na agenda neste dia." : "Nada marcado na agenda para este dia."}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {compSel.map((c) => (
                          <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-cartao bg-campo px-4 py-2 text-sm">
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium [overflow-wrap:anywhere]">{c.titulo}</span>
                              <span className="block text-texto-suave">
                                {tiposCompromisso[c.tipo]} · {c.hora_inicio ? `${c.hora_inicio} às ${c.hora_fim}` : "o dia todo"}
                              </span>
                              {c.descricao && <span className="mt-1 block break-words">{c.descricao}</span>}
                            </span>
                            <button
                              type="button"
                              className={`${botaoSec} min-h-9 px-3 py-1`}
                              aria-label={`Apagar ${c.titulo}`}
                              onClick={() => apagarCompromisso(c)}
                            >
                              Apagar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  {especiaisDe(sel.iso).map((d) => (
                    <p key={d.nome} className={`self-start rounded-full px-4 py-2 text-sm ${pilulaData[d.tipo]}`}>
                      <span className="font-semibold">{rotuloData(d)}</span> · {d.nome}
                      {d.tipo === "feriado" && " · dia de descanso obrigatório"}
                      {d.tipo === "ponte" && " · ponte da empresa"}
                      {d.tipo === "municipal" && " · só neste concelho"}
                    </p>
                  ))}
                  {aniversariosDoDia(sel.iso).map((nome) => (
                    <p key={nome} className="self-start rounded-full bg-rosa-suave px-4 py-2 text-sm text-texto">
                      <span className="font-semibold">Aniversário</span> · Aniversário de {nome}
                    </p>
                  ))}
                  {sobreposicaoSel && (
                    <p className="rounded-full bg-rosa-suave px-4 py-2 text-sm font-medium text-texto">
                      Sobreposição: mais de uma pessoa fora neste dia.
                    </p>
                  )}
                  {estagiosSel.length > 0 && (
                    <p className="self-start rounded-full border border-linha-forte px-4 py-2 text-sm text-texto">
                      <span className="font-semibold">Estágio</span> · {estagiosSel.map((e) => (admin ? e.nome : "em curso")).join(", ")}
                    </p>
                  )}
                  {presencasSel.length > 0 && (
                    <section aria-labelledby="ag-presencas" className="flex flex-col gap-2">
                      <h4 id="ag-presencas" className="text-base font-semibold">
                        Presenças neste dia
                      </h4>
                      <ul className="flex flex-col gap-1.5">
                        {presencasSel.map((pr) => (
                          <li key={pr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-cartao bg-campo px-4 py-2 text-sm">
                            <span className="font-medium">
                              {pr.user?.nome ?? nomeProprio ?? "Eu"}
                              {pr.atrasada && <span className="ml-2 text-xs font-normal text-texto-suave">Atrasada</span>}
                            </span>
                            <span className="tabular-nums">
                              {horaDe(pr.entrada)} a {pr.saida ? horaDe(pr.saida) : "sem saída marcada"}
                              {pr.saida && <span className="text-texto-suave"> · {totalHoras(pr)}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {aCarregar ? (
                    <div aria-hidden="true" className="flex flex-col gap-3">
                      <div className="h-20 animate-pulse rounded-cartao bg-campo" />
                      <div className="h-20 animate-pulse rounded-cartao bg-campo" />
                    </div>
                  ) : doDiaSel.length === 0 ? (
                    <p className="rounded-cartao bg-campo p-6 text-texto-suave">
                      Ninguém está fora neste dia. Escolhe outro dia na semana.
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
                              className={`flex w-full items-stretch gap-4 rounded-cartao bg-campo p-4 text-left hover:bg-primaria-suave ${focoCls}`}
                            >
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
            <p className="rounded-cartao bg-campo p-6 text-texto-suave">Escolhe um dia na semana para ver quem está fora.</p>
          )}
        </div>
      </div>

      {novo && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto scroll-fino bg-barra/50 p-4 pt-16"
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
      {novoComp && (
        <JanelaFormulario titulo="Marcar na agenda" aoFechar={() => setNovoComp(null)}>
          <CompromissoForm
            dataInicial={novoComp.data}
            aoCancelar={() => setNovoComp(null)}
            aoCriar={(c) => {
              setNovoComp(null);
              aoMudarCompromissos?.();
              irPara({ iso: c.data });
            }}
          />
        </JanelaFormulario>
      )}
      </div>
    </div>
  );
}
