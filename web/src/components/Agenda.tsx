"use client";

import { useMemo, useState } from "react";
import type { Pedido, TipoPedido } from "@/lib/api";
import {
  celulasDoMes,
  cobreDia,
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
                  className={`flex min-h-24 flex-col gap-1 rounded-md border p-1 ${
                    c.doMes ? "bg-white" : "bg-zinc-100 text-zinc-600"
                  } ${sobrepoe ? "border-2 border-zinc-900" : "border-zinc-300"}`}
                >
                  <span
                    className={`self-start rounded px-1.5 text-sm ${eHoje ? "bg-zinc-900 font-semibold text-white" : ""}`}
                  >
                    {c.dia}
                    {eHoje && <span className="sr-only"> (hoje)</span>}
                  </span>
                  {sobrepoe && <span className="text-xs font-medium">Sobreposição</span>}
                  {doDia.map((p) => (
                    <span
                      key={p.id}
                      title={`${nomeDe(p, nomeProprio)}: ${descricao(p)}, ${p.data_inicio} a ${p.data_fim} (${p.estado})`}
                      className={`truncate rounded border px-1 text-xs ${estiloEstado[p.estado]}`}
                    >
                      {nomeDe(p, nomeProprio)} · {tipos[p.tipo]}
                      {p.estado === "pendente" && <span className="sr-only"> (pendente)</span>}
                    </span>
                  ))}
                </div>
              );
              })}
            </div>
          ))}
        </div>
      </div>

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
