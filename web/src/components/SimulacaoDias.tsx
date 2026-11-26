"use client";

import { useRef } from "react";
import type { PedidoAgenda } from "@/lib/api";
import type { DataEspecial } from "@/lib/feriados";
import { nomeDoDia } from "@/lib/agenda";
import { tipos } from "@/lib/rotulos";
import Avatar from "./Avatar";

export interface DiaSim {
  iso: string;
  fimDeSemana: boolean;
  datas: DataEspecial[];
  aniversarios: string[];
  /** Já filtrados pelas camadas ligadas. */
  pedidos: PedidoAgenda[];
  conflito: boolean;
}

export const rotuloData = { feriado: "Feriado", municipal: "Feriado municipal", comemorativa: "Data comemorativa", ponte: "Ponte" } as const;

const chip = "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-texto";
const cor = { feriado: "bg-rosa-suave", municipal: "bg-rosa-suave", comemorativa: "bg-campo", ponte: "bg-laranja/30" } as const;

/** O que já existe num dia, em chips: fim de semana, datas especiais, aniversários e pedidos de outras pessoas. */
export function Chips({ dia, vazio = "Livre" }: { dia: DiaSim; vazio?: string }) {
  const nada = !dia.fimDeSemana && !dia.datas.length && !dia.aniversarios.length && !dia.pedidos.length;
  if (nada) return <span className="text-xs text-texto-suave">{vazio}</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Neste dia">
      {dia.fimDeSemana && <li className={`${chip} bg-trilho text-texto-suave`}>Fim de semana</li>}
      {dia.datas.map((d) => (
        <li key={`${d.tipo}-${d.nome}`} className={`${chip} ${cor[d.tipo]}`}>
          {rotuloData[d.tipo]}: {d.nome}
        </li>
      ))}
      {dia.aniversarios.map((a) => (
        <li key={a} className={`${chip} bg-violeta/30`}>
          Aniversário de {a}
        </li>
      ))}
      {dia.pedidos.map((p) => (
        <li key={p.id} className={`${chip} ${p.estado === "pendente" ? "bg-campo ring-1 ring-linha-forte" : "bg-positivo/25"}`}>
          <Avatar nome={p.user?.nome ?? "?"} id={p.user?.id ?? 0} className="h-5 w-5 text-[0.625rem]" />
          <span className="min-w-0 break-words">
            {p.user?.nome ?? "Alguém"}, {tipos[p.tipo].toLowerCase()}, {p.estado === "pendente" ? "pendente" : "aprovado"}
          </span>
        </li>
      ))}
    </ul>
  );
}

const diaCurto = (iso: string) => ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${iso}T00:00:00Z`).getUTCDay()];

interface Props {
  dias: DiaSim[];
  destaque: string | null;
  aoDestacar: (iso: string | null) => void;
}

/** Linha do tempo vertical: um botão por dia, com roving tabindex (teclas de seta, Home e End). */
export default function SimulacaoDias({ dias, destaque, aoDestacar }: Props) {
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  const ativo = dias.some((d) => d.iso === destaque) ? destaque : dias[0]?.iso;

  function tecla(e: React.KeyboardEvent, i: number) {
    const alvo = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: dias.length - 1 }[e.key];
    if (alvo === undefined) return;
    e.preventDefault();
    botoes.current.get(dias[Math.max(0, Math.min(dias.length - 1, alvo))].iso)?.focus();
  }

  return (
    <ol aria-label="Dia a dia" className="flex flex-col gap-2">
      {dias.map((d, i) => {
        const sel = d.iso === destaque;
        return (
          <li
            key={d.iso}
            className={`rounded-cartao border p-3 transition-colors motion-reduce:transition-none ${d.conflito ? "border-rosa bg-rosa-suave" : "border-linha bg-painel"} ${sel ? "ring-2 ring-primaria" : ""}`}
          >
            <button
              type="button"
              ref={(el) => {
                if (el) botoes.current.set(d.iso, el);
                else botoes.current.delete(d.iso);
              }}
              tabIndex={d.iso === ativo ? 0 : -1}
              aria-pressed={sel}
              onClick={() => aoDestacar(sel ? null : d.iso)}
              onKeyDown={(e) => tecla(e, i)}
              className="flex w-full items-center gap-3 rounded-controlo text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center rounded-controlo bg-campo py-1 leading-tight">
                <span className="text-[0.625rem] font-medium uppercase text-texto-suave">{diaCurto(d.iso)}</span>
                <span className="text-lg font-semibold tabular-nums text-texto">{Number(d.iso.slice(8, 10))}</span>
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-texto">
                {nomeDoDia(d.iso)}
                {d.conflito && <span className="ml-2 text-xs font-medium">Sobreposição</span>}
              </span>
            </button>
            <div className="mt-2 pl-14">
              <Chips dia={d} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
