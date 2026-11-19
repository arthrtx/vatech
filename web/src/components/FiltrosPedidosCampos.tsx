"use client";

import { useId } from "react";
import type { EstadoPedido, Pedido, TipoPedido } from "@/lib/api";
import { contarAtivos, filtrosVazios, type FiltrosPedidos } from "@/lib/filtros";
import { estados, tipos } from "@/lib/rotulos";
import CampoData from "./CampoData";
import GrupoChips from "./GrupoChips";
import Seletor from "./Seletor";
import PainelFiltros from "./PainelFiltros";
import { label } from "./ui";

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
  semResumo?: boolean;
}

export default function FiltrosPedidosCampos({ filtros, onChange, pedidos, mostrarFuncionario, mostrados, semResumo }: Props) {
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
      semResumo={semResumo}
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
          <Seletor
            id={`${id}-func`}
            className="min-h-11"
            valor={filtros.funcionarioId === null ? "" : String(filtros.funcionarioId)}
            opcoes={[{ valor: "", rotulo: "Todos" }, ...lista.map(([uid, nome]) => ({ valor: String(uid), rotulo: nome }))]}
            onChange={(v) => onChange({ ...filtros, funcionarioId: v ? Number(v) : null })}
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
          <div>
            <label htmlFor={`${id}-de`} className={label}>
              De
            </label>
            <CampoData id={`${id}-de`} className="min-h-11" valor={filtros.de} onChange={(de) => onChange({ ...filtros, de })} />
          </div>
          <div>
            <label htmlFor={`${id}-ate`} className={label}>
              Até
            </label>
            <CampoData
              id={`${id}-ate`}
              className="min-h-11"
              valor={filtros.ate}
              aria-invalid={periodoInvalido}
              aria-describedby={periodoInvalido ? `${id}-erro` : undefined}
              onChange={(ate) => onChange({ ...filtros, ate })}
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
