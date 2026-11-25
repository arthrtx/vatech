"use client";

import { Fragment, useMemo, useState } from "react";
import type { Aniversario, PedidoAgenda, Ponte } from "@/lib/api";
import { hojeIso, mesesPt, nomeDoDia, quemE, visiveis } from "@/lib/agenda";
import { marcasDoAno } from "@/lib/calendario";
import { diasUteis } from "@/lib/diasUteis";
import { datasDasPontes, datasDoAno, type TipoData } from "@/lib/feriados";
import { useLocalidade } from "@/lib/localidade";
import { tipos } from "@/lib/rotulos";
import EscolhaLocalidade from "./EscolhaLocalidade";
import { filtrar } from "@/lib/busca";
import CampoBusca from "./CampoBusca";
import { IconeDescarregar, IconeSeta } from "./Icones";
import PedidoForm from "./PedidoForm";
import { botao, botaoSec } from "./ui";

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

// Uma cor por pessoa (tokens da plataforma). Férias: cor cheia; ausência e licença: cor suave; pendente: só contorno tracejado.
const cores = [
  { cheia: "bg-positivo", suave: "bg-positivo/40", anel: "border-positivo", texto: "text-texto" },
  { cheia: "bg-violeta", suave: "bg-violeta/40", anel: "border-violeta", texto: "text-texto" },
  { cheia: "bg-laranja", suave: "bg-laranja/40", anel: "border-laranja", texto: "text-texto" },
  { cheia: "bg-pessego", suave: "bg-pessego/40", anel: "border-pessego", texto: "text-texto" },
  { cheia: "bg-primaria", suave: "bg-primaria/30", anel: "border-primaria", texto: "text-white" },
] as const;

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dois = (n: number) => String(n).padStart(2, "0");
const diasDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const fimDeSemana = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
};
const letraDoDia = (iso: string) => ["D", "S", "T", "Q", "Q", "S", "S"][new Date(`${iso}T00:00:00Z`).getUTCDay()];
const inicial = (nome: string | undefined) => (nome ?? "?").trim().charAt(0).toUpperCase();

// Ao imprimir, só o mapa do ano aparece (o resto da página fica escondido), em A4 deitado e com as cores.
const IMPRESSAO = `@media print {
  @page { size: A4 landscape; margin: 8mm; }
  body * { visibility: hidden; }
  #calendario-imprimir, #calendario-imprimir * { visibility: visible; }
  #calendario-imprimir { position: absolute; left: 0; top: 0; width: 100%; }
  #calendario-imprimir * { -webkit-print-color-adjust: exact; print-color-adjust: exact; backdrop-filter: none !important; }
  #calendario-imprimir table { min-width: 0 !important; font-size: 8px; }
  #calendario-imprimir tbody { break-inside: avoid; }
}`;

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

/**
 * Mapa do ano, como a folha de férias da equipa: um quadro por mês, os dias em colunas, uma linha por pessoa,
 * fins de semana a cinzento e feriados e pontes em coluna rosa. À direita, a legenda com a cor e os dias de férias de cada um.
 */
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

  // Pessoas com pedidos ativos no ano (por ordem alfabética), cada uma com a sua cor.
  const pessoas = useMemo(() => {
    const m = new Map<number, string>();
    visiveis(pedidos).forEach((p) => {
      const id = quemE(p);
      if (id !== undefined) m.set(id, p.user?.nome ?? "Alguém");
    });
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "pt")).map(([id, nome], i) => ({ id, nome, cor: cores[i % cores.length] }));
  }, [pedidos]);
  const visiveisNaPesquisa = useMemo(() => new Set(filtrar(pedidos, busca, (p) => [p.user?.nome, tipos[p.tipo]]).map((p) => quemE(p))), [pedidos, busca]);
  const linhas = pessoas.filter((p) => visiveisNaPesquisa.has(p.id));

  // Dias úteis de férias de cada pessoa neste ano (aprovadas e pendentes).
  const diasDeFerias = useMemo(() => {
    const m = new Map<number, number>();
    visiveis(pedidos)
      .filter((p) => p.tipo === "ferias")
      .forEach((p) => {
        const id = quemE(p);
        if (id === undefined) return;
        const de = p.data_inicio < `${ano}-01-01` ? `${ano}-01-01` : p.data_inicio;
        const ate = p.data_fim > `${ano}-12-31` ? `${ano}-12-31` : p.data_fim;
        if (de <= ate) m.set(id, (m.get(id) ?? 0) + diasUteis(de, ate));
      });
    return m;
  }, [pedidos, ano]);

  /** Abre a impressão só com o mapa do ano (A4 deitado): em "Destino", escolher "Guardar como PDF". */
  function descarregarPdf() {
    const titulo = document.title;
    document.title = `Calendario-${ano}`; // nome sugerido para o ficheiro
    window.print();
    document.title = titulo;
  }

  const totalFeriados = listaDatas.filter((d) => d.tipo === "feriado" || d.tipo === "municipal").length;
  const totalPontes = listaDatas.filter((d) => d.tipo === "ponte").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 max-w-md flex-1">
          <CampoBusca id="busca-calendario" rotulo="Pesquisar no calendário" valor={busca} onChange={setBusca} />
        </div>
        {podeCriar && (
          <button type="button" className={`${botao} shrink-0`} onClick={() => setNovo(true)}>
            Novo pedido
          </button>
        )}
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
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <EscolhaLocalidade id="cal-localidade" compacta />
          <button type="button" className={`${botaoSec} inline-flex items-center gap-2`} onClick={descarregarPdf}>
            <IconeDescarregar className="h-4 w-4" />
            Descarregar PDF
          </button>
        </div>
      </div>

      <style>{IMPRESSAO}</style>
      <div id="calendario-imprimir" className="flex flex-col gap-2">
        <h2 className="hidden text-lg font-semibold print:block">Mapa de férias {ano}</h2>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className={`min-w-0 overflow-hidden rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 ${aCarregar ? "opacity-60" : ""}`}
          aria-busy={aCarregar}
        >
          <div className="overflow-x-auto scroll-fino print:overflow-visible">
            <table aria-label={`Calendário ${ano}`} className="w-full min-w-[60rem] table-fixed border-collapse text-xs">
              <colgroup>
                <col className="w-20" />
                <col className="w-28" />
                {Array.from({ length: 31 }, (_, k) => (
                  <col key={k} />
                ))}
              </colgroup>
              {mesesPt.map((nome, i) => {
                const mes = i + 1;
                const total = diasDoMes(ano, mes);
                // 31 posições; as que passam do fim do mês ficam vazias.
                const dias = Array.from({ length: 31 }, (_, k) => (k < total ? `${ano}-${dois(mes)}-${dois(k + 1)}` : null));
                const aniversariosDoMes = dias.filter((iso) => iso && marcas.get(iso)?.aniversarios.length);
                const celulaDia = (iso: string) => {
                  const m = marcas.get(iso);
                  const feriado = !!m?.datas.some((d) => d.tipo === "feriado" || d.tipo === "municipal");
                  const ponte = !!m?.datas.some((d) => d.tipo === "ponte");
                  return {
                    m,
                    fundo: feriado ? "bg-rosa-suave" : ponte ? "bg-primaria-suave" : fimDeSemana(iso) ? "bg-trilho" : "",
                    comemorativa: !!m?.datas.some((d) => d.tipo === "comemorativa") && !feriado,
                  };
                };
                const foraDoMes = (k: number) => <td key={`f${k}`} aria-hidden="true" className="h-7 border border-linha-forte/30 bg-campo" />;
                const nLinhas = 1 + Math.max(linhas.length, 1) + (aniversariosDoMes.length > 0 ? 1 : 0);
                return (
                  <Fragment key={nome}>
                  {i > 0 && (
                    <tbody aria-hidden="true">
                      <tr>
                        <td colSpan={33} className="h-3 border-0 p-0" />
                      </tr>
                    </tbody>
                  )}
                  <tbody className="[break-inside:avoid]">
                    <tr>
                      <th
                        scope="rowgroup"
                        rowSpan={nLinhas}
                        className="border border-primaria bg-primaria px-2 text-left align-middle text-sm font-semibold uppercase tracking-wide text-white"
                      >
                        {nome}
                      </th>
                      <th scope="col" className="border border-linha-forte/30 bg-primaria-suave px-2 py-1 text-left text-xs font-semibold">
                        Pessoa
                      </th>
                      {dias.map((iso, k) => {
                        if (!iso) return foraDoMes(k);
                        const { m, fundo, comemorativa } = celulaDia(iso);
                        const descricao = [
                          nomeDoDia(iso),
                          ...(m?.datas.map((d) => `${rotulosData[d.tipo]}: ${d.nome}`) ?? []),
                          ...(m?.aniversarios.map((n) => `Aniversário de ${n}`) ?? []),
                        ].join(". ");
                        return (
                          <th key={iso} scope="col" className={`border border-linha-forte/30 p-0 font-normal ${fundo || "bg-primaria-suave"}`}>
                            <button
                              type="button"
                              aria-label={descricao}
                              aria-pressed={aberto === iso}
                              aria-current={iso === hoje ? "date" : undefined}
                              title={descricao}
                              onClick={() => setAberto(aberto === iso ? null : iso)}
                              className={`flex h-9 w-full flex-col items-center justify-center leading-none ${foco} ${
                                iso === hoje ? "bg-primaria text-white" : "text-texto hover:bg-primaria-suave"
                              } ${comemorativa ? "underline decoration-dotted underline-offset-2" : ""} ${aberto === iso ? "ring-2 ring-inset ring-primaria" : ""}`}
                            >
                              <span className="text-sm font-semibold tabular-nums">{Number(iso.slice(8, 10))}</span>
                              <span className="mt-0.5 text-[0.625rem] opacity-70">{letraDoDia(iso)}</span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                    {linhas.length === 0 && (
                      <tr>
                        <th scope="row" className="border border-linha-forte/30 px-2 py-1 text-left font-normal text-texto-suave">
                          Ninguém fora
                        </th>
                        {dias.map((iso, k) => (iso ? <td key={iso} className={`h-7 border border-linha-forte/30 ${celulaDia(iso).fundo}`} /> : foraDoMes(k)))}
                      </tr>
                    )}
                    {linhas.map((pessoa) => (
                      <tr key={pessoa.id} className="odd:bg-painel/40 hover:bg-primaria-suave/50">
                        <th scope="row" className="truncate border border-linha-forte/30 px-2 py-1 text-left font-medium" title={pessoa.nome}>
                          <span aria-hidden="true" className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle ${pessoa.cor.cheia}`} />
                          {pessoa.nome}
                        </th>
                        {dias.map((iso, k) => {
                          if (!iso) return foraDoMes(k);
                          const { m, fundo } = celulaDia(iso);
                          const p = m?.pedidos.find((x) => quemE(x) === pessoa.id);
                          if (!p) return <td key={iso} className={`h-7 border border-linha-forte/30 ${fundo}`} />;
                          const pendente = p.estado === "pendente";
                          const rotulo = `${pessoa.nome}: ${tipos[p.tipo].toLowerCase()}${pendente ? " (pendente)" : ""}, ${nomeDoDia(iso)}`;
                          return (
                            <td key={iso} className={`h-7 border border-linha-forte/30 p-0 ${fundo}`}>
                              <button
                                type="button"
                                aria-label={rotulo}
                                title={rotulo}
                                onClick={() => setAberto(iso)}
                                className={`flex h-full min-h-7 w-full items-center justify-center text-[0.625rem] font-semibold ${foco} ${
                                  pendente
                                    ? `border-2 border-dashed bg-painel/60 ${pessoa.cor.anel} text-texto`
                                    : `${p.tipo === "ferias" ? pessoa.cor.cheia : pessoa.cor.suave} ${p.tipo === "ferias" ? pessoa.cor.texto : "text-texto"}`
                                }`}
                              >
                                {inicial(pessoa.nome)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {aniversariosDoMes.length > 0 && (
                      <tr>
                        <th scope="row" className="border border-linha-forte/30 px-2 py-1 text-left font-medium text-texto-suave">
                          Aniversários
                        </th>
                        {dias.map((iso, k) => {
                          if (!iso) return foraDoMes(k);
                          const { m, fundo } = celulaDia(iso);
                          return (
                            <td key={iso} className={`h-7 border border-linha-forte/30 text-center ${fundo}`}>
                              {m?.aniversarios.length ? (
                                <span title={m.aniversarios.map((n) => `Aniversário de ${n}`).join(", ")} className="inline-block h-2 w-2 rounded-full bg-rosa" />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                  </Fragment>
                );
              })}
            </table>
          </div>
        </div>

        <aside aria-label="Legenda" className="flex flex-col gap-4 xl:sticky xl:top-4">
          <div className="overflow-hidden rounded-cartao bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primaria-suave text-left">
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Nome
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Cor
                  </th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                    Dias de férias
                  </th>
                </tr>
              </thead>
              <tbody>
                {pessoas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-texto-suave">
                      Sem férias nem ausências em {ano}.
                    </td>
                  </tr>
                )}
                {pessoas.map((p) => (
                  <tr key={p.id} className="border-t border-linha/60">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">
                      {p.nome}
                    </th>
                    <td className="px-3 py-1.5">
                      <span aria-hidden="true" className={`flex h-5 w-10 items-center justify-center rounded-sm text-[0.625rem] font-semibold ${p.cor.cheia} ${p.cor.texto}`}>
                        {inicial(p.nome)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{diasDeFerias.get(p.id) ?? 0}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-linha-forte/60">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    Feriados
                  </th>
                  <td className="px-3 py-1.5">
                    <span aria-hidden="true" className="block h-5 w-10 rounded-sm bg-rosa-suave" />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{totalFeriados}</td>
                </tr>
                <tr className="border-t border-linha/60">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    Pontes
                  </th>
                  <td className="px-3 py-1.5">
                    <span aria-hidden="true" className="block h-5 w-10 rounded-sm bg-primaria-suave" />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{totalPontes}</td>
                </tr>
                <tr className="border-t border-linha/60">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    Descanso semanal
                  </th>
                  <td className="px-3 py-1.5">
                    <span aria-hidden="true" className="block h-5 w-10 rounded-sm bg-trilho" />
                  </td>
                  <td />
                </tr>
                <tr className="border-t border-linha/60">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    Aniversário
                  </th>
                  <td className="px-3 py-1.5">
                    <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-rosa" />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-texto-suave">
            Cor cheia: férias. Cor suave: ausência ou licença. Contorno tracejado: pedido pendente. Dias de férias: dias úteis, sem feriados.
          </p>

          {aberto && (
            <section
              aria-labelledby="cal-dia"
              className="flex flex-col gap-2 rounded-cartao print:hidden bg-painel/55 p-4 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10"
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
        </aside>
      </div>

      </div>

      <section aria-labelledby="cal-lista" className="flex flex-col gap-2 print:hidden">
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
