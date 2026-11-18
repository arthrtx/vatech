"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Pedido, TipoPedido } from "@/lib/api";
import {
  celulasDoMes,
  cobreDia,
  diasDoPedido,
  filtrar,
  haSobreposicao,
  hojeIso,
  mesAnterior,
  mesDe,
  mesesPt,
  mesSeguinte,
  tocaMes,
  visiveis,
} from "@/lib/agenda";
import { subtipos, tipos } from "@/lib/rotulos";
import { botaoSec, input, label } from "./ui";

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// TODO: token em falta (cores de estado). Aprovado = cheio, pendente = tracejado, em zinc neutro.
const estiloEstado = {
  aprovado: "border-zinc-900 bg-zinc-900 text-white",
  pendente: "border-dashed border-zinc-600 bg-white text-zinc-900",
  recusado: "",
} as const;

const focoCls = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1";

const nomeDe = (p: Pedido, proprio?: string) => p.user?.nome ?? proprio ?? "Eu";
const descricao = (p: Pedido) => `${tipos[p.tipo]}${p.subtipo ? ` (${subtipos[p.subtipo]})` : ""}`;

export default function Agenda({
  pedidos,
  admin,
  nomeProprio,
  hoje = hojeIso(),
  aCarregar = false,
  comErro = false,
}: {
  pedidos: Pedido[];
  admin: boolean;
  nomeProprio?: string;
  hoje?: string;
  aCarregar?: boolean;
  comErro?: boolean;
}) {
  const [mes, setMes] = useState(() => mesDe(hoje));
  const [tipo, setTipo] = useState<TipoPedido | "">("");
  const [userId, setUserId] = useState("");
  const [sel, setSel] = useState<{ iso: string; pedidoId?: number } | null>(null);
  const origem = useRef<HTMLElement | null>(null);
  const painel = useRef<HTMLElement>(null);
  const abertoEm = sel === null ? null : sel.iso;

  // Foco vai para o painel ao abrir um dia ou pedido; ao fechar volta ao elemento que o abriu.
  useEffect(() => {
    if (abertoEm !== null) painel.current?.focus();
  }, [abertoEm, sel?.pedidoId]);

  const abrir = (e: { currentTarget: HTMLElement }, s: { iso: string; pedidoId?: number }) => {
    if (sel === null) origem.current = e.currentTarget;
    setSel(s);
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
    visiveis(pedidos).forEach((p) => m.set(p.user_id, nomeDe(p, nomeProprio)));
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "pt"));
  }, [pedidos, nomeProprio]);

  const filtrados = useMemo(
    () => filtrar(pedidos, { tipo: tipo || undefined, userId: userId ? Number(userId) : undefined }),
    [pedidos, tipo, userId],
  );
  const doMes = useMemo(
    () => filtrados.filter((p) => tocaMes(p, mes)).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
    [filtrados, mes],
  );
  const semanas = useMemo(() => {
    const c = celulasDoMes(mes);
    return Array.from({ length: c.length / 7 }, (_, i) => c.slice(i * 7, i * 7 + 7));
  }, [mes]);

  const pedidoSel =
    sel?.pedidoId !== undefined ? pedidos.find((p) => p.id === sel.pedidoId && p.estado !== "recusado") : undefined;
  const doDiaSel = sel ? filtrados.filter((p) => cobreDia(p, sel.iso)) : [];
  const sobreposicaoSel = sel ? haSobreposicao(visiveis(pedidos).filter((p) => cobreDia(p, sel.iso))) : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className={botaoSec} onClick={() => setMes(mesAnterior(mes))}>
          Mês anterior
        </button>
        <h2 className="min-w-40 text-center text-lg font-semibold" aria-live="polite">
          {mesesPt[mes.mes - 1]} {mes.ano}
        </h2>
        <button type="button" className={botaoSec} onClick={() => setMes(mesSeguinte(mes))}>
          Mês seguinte
        </button>
        <button type="button" className={botaoSec} onClick={() => setMes(mesDe(hoje))}>
          Hoje
        </button>
        <div>
          <label htmlFor="ag-tipo" className={label}>
            Tipo
          </label>
          <select id="ag-tipo" className={input} value={tipo} onChange={(e) => setTipo(e.target.value as TipoPedido | "")}>
            <option value="">Todos</option>
            {Object.entries(tipos).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {admin && (
          <div>
            <label htmlFor="ag-func" className={label}>
              Funcionário
            </label>
            <select id="ag-func" className={input} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Todos</option>
              {pessoas.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-700">Cheio: aprovado. Tracejado: pendente. Pedidos recusados não aparecem.</p>

      <div className="overflow-x-auto">
        <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="min-w-[42rem]">
          <div role="row" className="grid grid-cols-7 gap-1">
            {diasSemana.map((d) => (
              <div key={d} role="columnheader" className="px-1 text-xs font-medium uppercase text-zinc-700">
                {d}
              </div>
            ))}
          </div>
          {semanas.map((semana) => (
            <div key={semana[0].iso} role="row" className="mt-1 grid grid-cols-7 gap-1">
              {semana.map((c) => {
              const doDia = filtrados.filter((p) => cobreDia(p, c.iso));
              const sobrepoe = haSobreposicao(visiveis(pedidos).filter((p) => cobreDia(p, c.iso)));
              const eHoje = c.iso === hoje;
              return (
                <div
                  key={c.iso}
                  role="gridcell"
                  aria-current={eHoje ? "date" : undefined}
                  onClick={(e) => abrir(e, { iso: c.iso })}
                  className={`flex min-h-24 flex-col gap-1 rounded-md border p-1 ${
                    c.doMes ? "bg-white" : "bg-zinc-100 text-zinc-600"
                  } ${sobrepoe ? "border-2 border-zinc-900" : "border-zinc-300"}`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrir(e, { iso: c.iso });
                    }}
                    className={`self-start rounded px-1.5 text-sm ${focoCls} ${eHoje ? "bg-zinc-900 font-semibold text-white" : "hover:bg-zinc-200"}`}
                  >
                    {c.dia}
                    <span className="sr-only"> de {mesesPt[Number(c.iso.slice(5, 7)) - 1]}</span>
                    {eHoje && <span className="sr-only"> (hoje)</span>}
                  </button>
                  {sobrepoe && <span className="text-xs font-medium">Sobreposição</span>}
                  {doDia.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrir(e, { iso: c.iso, pedidoId: p.id });
                      }}
                      title={`${nomeDe(p, nomeProprio)}: ${descricao(p)}, ${p.data_inicio} a ${p.data_fim} (${p.estado})`}
                      className={`truncate rounded border px-1 text-left text-xs ${focoCls} ${estiloEstado[p.estado]}`}
                    >
                      {nomeDe(p, nomeProprio)} · {tipos[p.tipo]}
                      {p.estado === "pendente" && <span className="sr-only"> (pendente)</span>}
                    </button>
                  ))}
                </div>
              );
              })}
            </div>
          ))}
        </div>
      </div>

      {sel && (
        <section
          ref={painel}
          tabIndex={-1}
          onKeyDown={aoTecla}
          aria-labelledby="ag-detalhe"
          className="flex flex-col gap-3 rounded-md border-2 border-zinc-900 bg-white p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 id="ag-detalhe" className="text-base font-semibold">
              {pedidoSel ? `Pedido de ${nomeDe(pedidoSel, nomeProprio)}` : `Pedidos de ${sel.iso}`}
            </h3>
            <button type="button" className={botaoSec} onClick={fechar}>
              Fechar
            </button>
          </div>
          {pedidoSel ? (
            <>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="font-medium">Funcionário</dt>
                <dd>{nomeDe(pedidoSel, nomeProprio)}</dd>
                <dt className="font-medium">Tipo</dt>
                <dd>{tipos[pedidoSel.tipo]}</dd>
                <dt className="font-medium">Subtipo</dt>
                <dd>{pedidoSel.subtipo ? subtipos[pedidoSel.subtipo] : "Sem subtipo"}</dd>
                <dt className="font-medium">Datas</dt>
                <dd>
                  {pedidoSel.data_inicio} a {pedidoSel.data_fim}
                </dd>
                <dt className="font-medium">Dias</dt>
                <dd>{diasDoPedido(pedidoSel)}</dd>
                <dt className="font-medium">Estado</dt>
                <dd>{pedidoSel.estado === "aprovado" ? "Aprovado" : "Pendente"}</dd>
                <dt className="font-medium">Observação</dt>
                <dd>{pedidoSel.observacao || "Sem observação"}</dd>
                <dt className="font-medium">Decidido em</dt>
                <dd>{pedidoSel.decidido_em ? pedidoSel.decidido_em.slice(0, 10) : "Ainda não decidido"}</dd>
              </dl>
              <div>
                <button type="button" className={botaoSec} onClick={() => setSel({ iso: sel.iso })}>
                  Voltar ao dia
                </button>
              </div>
            </>
          ) : (
            <>
              {sobreposicaoSel && (
                <p className="text-sm font-medium">Sobreposição: mais de uma pessoa fora neste dia.</p>
              )}
              {doDiaSel.length === 0 ? (
                <p className="text-sm text-zinc-700">Sem pedidos neste dia.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {doDiaSel.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSel({ iso: sel.iso, pedidoId: p.id })}
                        className={`w-full rounded-md border border-zinc-300 bg-white p-2 text-left text-sm hover:bg-zinc-100 ${focoCls}`}
                      >
                        <span className="font-medium">
                          {nomeDe(p, nomeProprio)} · {descricao(p)} · {p.estado === "aprovado" ? "Aprovado" : "Pendente"}
                        </span>
                        <span className="block text-zinc-700">
                          {p.data_inicio} a {p.data_fim}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      <section aria-labelledby="ag-lista" className="flex flex-col gap-2">
        <h3 id="ag-lista" className="text-base font-semibold">
          Pedidos de {mesesPt[mes.mes - 1]} {mes.ano}
        </h3>
        {aCarregar ? (
          <p className="text-zinc-700">A carregar pedidos...</p>
        ) : comErro ? (
          <p className="text-zinc-700">Não foi possível carregar os pedidos.</p>
        ) : doMes.length === 0 ? (
          <p className="text-zinc-700">Sem pedidos neste mês.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {doMes.map((p) => (
              <li key={p.id} className="rounded-md border border-zinc-300 bg-white p-3">
                <p className="font-medium">
                  {nomeDe(p, nomeProprio)} · {descricao(p)} · {p.estado === "aprovado" ? "Aprovado" : "Pendente"}
                </p>
                <p className="text-sm text-zinc-700">
                  {p.data_inicio} a {p.data_fim}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
