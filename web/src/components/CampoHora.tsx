"use client";

import { useEffect, useRef, useState } from "react";
import { IconeRelogio } from "./Icones";
import { input } from "./ui";

const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const textoBtn = `min-h-9 rounded-controlo px-3 text-sm font-medium text-texto hover:bg-primaria-suave ${foco}`;
const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutos = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** Aceita "hh:mm" (também "h:mm"); devolve "HH:MM" ou null. */
export function lerHora(texto: string): string | null {
  const m = /^(\d{1,2})[:.h](\d{2})$/.exec(texto.trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Põe os dois pontos sozinhos enquanto se escreve: "09" passa a "09:". Ao apagar não volta a pô-los.
 * Um primeiro dígito acima de 2 vira hora com zero ("9" → "09:") e "9:" vira "09:".
 */
export function mascaraHora(texto: string, anterior: string): string {
  const partes = texto.split(/[:.h]/);
  let digitos = partes
    .map((p, i) => {
      const d = p.replace(/\D/g, "");
      return i < partes.length - 1 && i < 1 && d.length === 1 ? `0${d}` : d;
    })
    .join("")
    .slice(0, 4);
  const aApagar = texto.length < anterior.length;
  if (!aApagar && digitos.length === 1 && +digitos > 2) digitos = `0${digitos}`;
  let r = digitos.slice(0, 2);
  if (digitos.length > 2 || (!aApagar && digitos.length === 2)) r += ":";
  return r + digitos.slice(2);
}

interface Props {
  id: string;
  /** "HH:MM" ou "" */
  valor: string;
  onChange: (hora: string) => void;
  required?: boolean;
  className?: string;
}

/** Campo de hora no estilo do campo de data: escreve-se com os ":" automáticos ou escolhe-se no relógio. */
export default function CampoHora({ id, valor, onChange, required, className = "" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const [h, m] = valor ? valor.split(":") : ["", ""];

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
    const lida = lerHora(texto);
    if (lida) {
      setRascunho(null);
      onChange(lida);
    } else if (texto.trim() === "") {
      setRascunho(null);
      onChange("");
    } else {
      setRascunho(texto);
    }
  }

  const escolher = (hh: string, mm: string) => onChange(`${hh}:${mm}`);

  return (
    <div ref={raiz} className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="hh:mm"
        required={required}
        className={`${input} pr-11 ${className}`}
        maxLength={5}
        value={rascunho ?? valor}
        onChange={(e) => escrever(mascaraHora(e.target.value, rascunho ?? valor))}
        onBlur={() => setRascunho(null)}
      />
      <button
        type="button"
        aria-label="Abrir relógio"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-controlo text-texto-suave hover:bg-primaria-suave hover:text-texto ${foco}`}
      >
        <IconeRelogio className="h-4 w-4" />
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher hora"
          className="absolute left-0 top-full z-30 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-cartao bg-painel p-3 shadow-suave ring-1 ring-linha"
        >
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-texto-suave">Hora</p>
            <div className="grid grid-cols-6 gap-1">
              {horas.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={x === h}
                  onClick={() => escolher(x, m || "00")}
                  className={`h-8 rounded-full text-sm tabular-nums ${foco} ${x === h ? "bg-primaria font-semibold text-white" : "text-texto hover:bg-primaria-suave"}`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-texto-suave">Minutos</p>
            <div className="grid grid-cols-6 gap-1">
              {minutos.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={x === m}
                  onClick={() => escolher(h || "00", x)}
                  className={`h-8 rounded-full text-sm tabular-nums ${foco} ${x === m ? "bg-primaria font-semibold text-white" : "text-texto hover:bg-primaria-suave"}`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              className={textoBtn}
              onClick={() => {
                onChange("");
                setRascunho(null);
                setAberto(false);
              }}
            >
              Limpar
            </button>
            <button type="button" className={textoBtn} onClick={() => setAberto(false)}>
              Feito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
