"use client";

import { useRef, useState } from "react";
import type { Anexo } from "@/lib/api";
import { ACEITA, MAX_ANEXOS, tamanhoLegivel, validarFicheiro } from "@/lib/anexos";
import { botaoSec } from "./ui";

const foco = "focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria";
const linha = "flex items-center justify-between gap-3 rounded-controlo bg-campo px-3 py-2 text-sm";
const remover = `shrink-0 rounded-controlo px-2 py-1 font-medium text-perigo hover:bg-perigo-suave ${foco}`;

interface Props {
  /** Ficheiros escolhidos, ainda por enviar. */
  novos: File[];
  onNovos: (f: File[]) => void;
  /** Já guardados no pedido (modo de edição). */
  guardados?: Anexo[];
  onRemoverGuardado?: (a: Anexo) => void;
}

/** Anexar ficheiros ao pedido: botão + arrastar para a zona; lista com tamanho e "Remover". */
export default function CampoAnexos({ novos, onNovos, guardados = [], onRemoverGuardado }: Props) {
  const campo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aArrastar, setAArrastar] = useState(false);
  const total = novos.length + guardados.length;

  function juntar(lista: FileList | File[]) {
    const recusas: string[] = [];
    const aceites = [...novos];
    for (const f of Array.from(lista)) {
      const motivo = validarFicheiro(f);
      if (motivo) recusas.push(motivo);
      else if (aceites.some((x) => x.name === f.name && x.size === f.size)) continue;
      else if (aceites.length + guardados.length >= MAX_ANEXOS) {
        recusas.push(`Máximo de ${MAX_ANEXOS} ficheiros por pedido.`);
        break;
      } else aceites.push(f);
    }
    onNovos(aceites);
    setAviso(recusas.length ? recusas.join(" ") : null);
  }

  return (
    <div>
      <span id="anexos-rotulo" className="mb-1 block text-sm font-medium text-texto">
        Anexos <span className="font-normal text-texto-suave">(opcional)</span>
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setAArrastar(true);
        }}
        onDragLeave={() => setAArrastar(false)}
        onDrop={(e) => {
          e.preventDefault();
          setAArrastar(false);
          juntar(e.dataTransfer.files);
        }}
        className={`flex flex-col gap-3 rounded-controlo border border-dashed p-3 ${
          aArrastar ? "border-primaria bg-primaria-suave" : "border-linha-forte bg-painel/60"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={campo}
            type="file"
            multiple
            accept={ACEITA}
            aria-labelledby="anexos-rotulo"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) juntar(e.target.files);
              e.target.value = "";
            }}
          />
          <button type="button" disabled={total >= MAX_ANEXOS} className={botaoSec} onClick={() => campo.current?.click()}>
            Anexar ficheiros
          </button>
          <p className="text-sm text-texto-suave">
            Imagens, PDF, Word, Excel ou texto. Até {MAX_ANEXOS} ficheiros de 5 MB. Também podes arrastar para aqui.
          </p>
        </div>
        {total > 0 && (
          <ul className="flex flex-col gap-1.5">
            {guardados.map((a) => (
              <li key={`g${a.id}`} className={linha}>
                <span className="min-w-0 truncate">
                  {a.nome} <span className="text-texto-suave">· {tamanhoLegivel(a.tamanho)}</span>
                </span>
                <button type="button" className={remover} onClick={() => onRemoverGuardado?.(a)}>
                  Remover<span className="sr-only"> {a.nome}</span>
                </button>
              </li>
            ))}
            {novos.map((f) => (
              <li key={`n${f.name}${f.size}`} className={linha}>
                <span className="min-w-0 truncate">
                  {f.name} <span className="text-texto-suave">· {tamanhoLegivel(f.size)}</span>
                </span>
                <button type="button" className={remover} onClick={() => onNovos(novos.filter((x) => x !== f))}>
                  Remover<span className="sr-only"> {f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {aviso && (
        <p role="alert" className="mt-1 text-sm text-texto">
          {aviso}
        </p>
      )}
    </div>
  );
}
