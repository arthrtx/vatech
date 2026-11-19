"use client";

import { useEffect, useRef, useState } from "react";
import { celulasDoMes, hojeIso, isoDe, mesAnterior, mesDe, mesesPt, mesSeguinte, type Mes } from "@/lib/agenda";
import { IconeAgenda } from "./Icones";
import { input } from "./ui";

const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const textoBtn = `min-h-9 rounded-controlo px-3 text-sm font-medium text-texto hover:bg-primaria-suave disabled:opacity-40 ${foco}`;

const valida = (ano: number, mes: number, dia: number) => {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
};

/** Aceita "dd/mm/aaaa" e "aaaa-mm-dd"; devolve ISO ou null. */
function lerData(texto: string): string | null {
  const t = texto.trim();
  const pt = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const [a, m, d] = pt ? [+pt[3], +pt[2], +pt[1]] : iso ? [+iso[1], +iso[2], +iso[3]] : [0, 0, 0];
  return a && valida(a, m, d) ? isoDe(a, m, d) : null;
}

const formatar = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

interface Props {
  id: string;
  valor: string;
  onChange: (iso: string) => void;
  /** Datas anteriores ficam desativadas no calendário. */
  min?: string;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Campo de data com calendário no estilo da plataforma (substitui o seletor nativo do navegador). */
export default function CampoData({ id, valor, onChange, min, required, className = "", ...aria }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [mes, setMes] = useState<Mes>(() => mesDe(valor || hojeIso()));
  const raiz = useRef<HTMLDivElement>(null);
  const hoje = hojeIso();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  function escrever(texto: string) {
    const iso = lerData(texto);
    if (iso) {
      setRascunho(null);
      setMes(mesDe(iso));
      onChange(iso);
    } else if (texto.trim() === "") {
      setRascunho(null);
      onChange("");
    } else {
      setRascunho(texto);
    }
  }

  function escolher(iso: string) {
    onChange(iso);
    setRascunho(null);
    setAberto(false);
  }

  function alternar() {
    if (!aberto) setMes(mesDe(valor || hoje));
    setAberto((a) => !a);
  }

  return (
    <div ref={raiz} className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        required={required}
        className={`${input} pr-11 ${className}`}
        value={rascunho ?? formatar(valor)}
        onChange={(e) => escrever(e.target.value)}
        onBlur={() => setRascunho(null)}
        {...aria}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        aria-expanded={aberto}
        onClick={alternar}
        className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-controlo text-texto-suave hover:bg-primaria-suave hover:text-texto ${foco}`}
      >
        <IconeAgenda className="h-4 w-4" />
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher data"
          className="absolute left-0 top-full z-30 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-cartao bg-painel p-3 shadow-suave ring-1 ring-linha"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold" aria-live="polite">
              {mesesPt[mes.mes - 1]} {mes.ano}
            </p>
            <div className="flex gap-1 rounded-controlo bg-campo p-1">
              <button type="button" className={textoBtn} onClick={() => setMes(mesAnterior(mes))}>
                Anterior
              </button>
              <button type="button" className={textoBtn} onClick={() => setMes(mesSeguinte(mes))}>
                Seguinte
              </button>
            </div>
          </div>
          <div role="grid" aria-label={`${mesesPt[mes.mes - 1]} ${mes.ano}`} className="grid grid-cols-7 gap-1">
            {diasSemana.map((d) => (
              <div key={d} role="columnheader" className="text-center text-[0.6875rem] font-medium uppercase text-texto-suave">
                {d}
              </div>
            ))}
            {celulasDoMes(mes).map((c) => {
              const escolhido = c.iso === valor;
              const bloqueado = !!min && c.iso < min;
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  disabled={bloqueado}
                  aria-selected={escolhido}
                  aria-current={c.iso === hoje ? "date" : undefined}
                  onClick={() => escolher(c.iso)}
                  className={`flex h-9 items-center justify-center rounded-full text-sm tabular-nums disabled:opacity-35 ${foco} ${
                    escolhido
                      ? "bg-primaria font-semibold text-white"
                      : c.iso === hoje
                        ? "bg-rosa-suave font-semibold text-texto"
                        : `hover:bg-primaria-suave ${c.doMes ? "text-texto" : "text-texto-suave"}`
                  }`}
                >
                  {c.dia}
                  <span className="sr-only"> de {mesesPt[Number(c.iso.slice(5, 7)) - 1]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button type="button" className={textoBtn} onClick={() => escolher("")}>
              Limpar
            </button>
            <button type="button" className={textoBtn} disabled={!!min && hoje < min} onClick={() => escolher(hoje)}>
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
