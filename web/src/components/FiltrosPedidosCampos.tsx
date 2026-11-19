"use client";

import { useId } from "react";
import type { EstadoPedido, Pedido, TipoPedido } from "@/lib/api";
import { contarAtivos, filtrosVazios, type FiltrosPedidos } from "@/lib/filtros";
import { estados, tipos } from "@/lib/rotulos";
import GrupoChips from "./GrupoChips";
import PainelFiltros from "./PainelFiltros";
import { input, label } from "./ui";

export const filtrosIniciais: FiltrosPedidos = { ...filtrosVazios, estados: ["pendente"] };

const opcoesEstado = (Object.keys(estados) as EstadoPedido[]).map((valor) => ({ valor, rotulo: estados[valor] }));
const opcoesTipo = (Object.keys(tipos) as TipoPedido[]).map((valor) => ({ valor, rotulo: tipos[valor] }));

/** Periodo invertido nao filtra (a mensagem de campo avisa). */
export function filtrosEfetivos(f: FiltrosPedidos): FiltrosPedidos {
  return f.de && f.ate && f.ate < f.de ? { ...f, de: "", ate: "" } : f;
}

interface Props {
  filtros: FiltrosPedidos;
  onChange: (f: FiltrosPedidos) => void;
  /** Lista completa, para o seletor de funcionario. */
  pedidos: Pedido[];
  mostrarFuncionario: boolean;
  mostrados: number;
}

export default function FiltrosPedidosCampos({ filtros, onChange, pedidos, mostrarFuncionario, mostrados }: Props) {
  const id = useId();
  const efetivos = filtrosEfetivos(filtros);
  const periodoInvalido = filtros.de !== "" && filtros.ate !== "" && filtros.ate < filtros.de;
  const funcionarios = new Map<number, string>();
  for (const p of pedidos) {
    const uid = p.user?.id ?? p.user_id;
    funcionarios.set(uid, p.user?.nome ?? `Utilizador ${uid}`);
  }
  const lista = [...funcionarios].sort((a, b) => a[1].localeCompare(b[1], "pt"));

  return (
    <PainelFiltros
      ativos={contarAtivos(efetivos)}
      total={pedidos.length}
      mostrados={mostrados}
      rotuloItens="pedidos"
      onLimpar={() => onChange(filtrosVazios)}
    >
      <GrupoChips
        legenda="Estado"
        opcoes={opcoesEstado}
        selecionados={filtros.estados}
        onChange={(v) => onChange({ ...filtros, estados: v })}
      />
      <GrupoChips
        legenda="Tipo"
        opcoes={opcoesTipo}
        selecionados={filtros.tipos}
        onChange={(v) => onChange({ ...filtros, tipos: v })}
      />
      {mostrarFuncionario && (
        <div className="min-w-0 md:w-56">
          <label htmlFor={`${id}-func`} className={label}>
            Funcionário
          </label>
          <select
            id={`${id}-func`}
            className={`${input} min-h-11`}
            value={filtros.funcionarioId ?? ""}
            onChange={(e) => onChange({ ...filtros, funcionarioId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Todos</option>
            {lista.map(([uid, nome]) => (
              <option key={uid} value={uid}>
                {nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="min-w-0">
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
          <div>
            <label htmlFor={`${id}-de`} className={label}>
              De
            </label>
            <input
              id={`${id}-de`}
              type="date"
              className={`${input} min-h-11`}
              value={filtros.de}
              onChange={(e) => onChange({ ...filtros, de: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`${id}-ate`} className={label}>
              Até
            </label>
            <input
              id={`${id}-ate`}
              type="date"
              className={`${input} min-h-11`}
              value={filtros.ate}
              aria-invalid={periodoInvalido}
              aria-describedby={periodoInvalido ? `${id}-erro` : undefined}
              onChange={(e) => onChange({ ...filtros, ate: e.target.value })}
            />
          </div>
        </div>
        {periodoInvalido && (
          <p id={`${id}-erro`} role="alert" className="mt-1 text-sm text-texto">
            A data final é anterior à inicial
          </p>
        )}
      </div>
    </PainelFiltros>
  );
}
