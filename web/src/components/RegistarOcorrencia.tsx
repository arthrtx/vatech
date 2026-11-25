"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, mensagemDeErro, type MotivoOcorrencia, type TipoOcorrencia } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { motivosOcorrencia, tiposOcorrencia } from "@/lib/ocorrencias";
import Seletor from "./Seletor";
import { botao, botaoSec, erro as erroCls, input, label, vidro } from "./ui";

interface Props {
  onRegistado: () => void;
  onCancelar: () => void;
}

/** O estagiário comunica uma falta ou um atraso, com o motivo e o que aconteceu. */
export default function RegistarOcorrencia({ onRegistado, onCancelar }: Props) {
  const [data, setData] = useState(() => hojeIso());
  const [tipo, setTipo] = useState<TipoOcorrencia>("atraso");
  const [motivo, setMotivo] = useState<MotivoOcorrencia>("imprevisto");
  const [descricao, setDescricao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const primeiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primeiro.current?.focus();
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!data || !descricao.trim()) return setMsg("Indique o dia e descreva o que aconteceu.");
    setMsg(null);
    setAEnviar(true);
    try {
      await api.registarOcorrencia({ data, tipo, motivo, descricao: descricao.trim() });
      onRegistado();
    } catch (err) {
      setMsg(mensagemDeErro(err));
      setAEnviar(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      onKeyDown={(e) => e.key === "Escape" && onCancelar()}
      aria-labelledby="ocor_titulo"
      className={`${vidro} grid gap-4 p-4 sm:grid-cols-3`}
    >
      <h2 id="ocor_titulo" className="text-lg font-semibold sm:col-span-3">
        Comunicar falta ou atraso
      </h2>
      <div>
        <label htmlFor="ocor_dia" className={label}>
          Dia
        </label>
        <input
          ref={primeiro}
          id="ocor_dia"
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`${input} min-h-10`}
        />
      </div>
      <div>
        <label htmlFor="ocor_tipo" className={label}>
          Tipo
        </label>
        <Seletor id="ocor_tipo" valor={tipo} opcoes={tiposOcorrencia} onChange={(v) => setTipo(v as TipoOcorrencia)} />
      </div>
      <div>
        <label htmlFor="ocor_motivo" className={label}>
          Motivo
        </label>
        <Seletor
          id="ocor_motivo"
          valor={motivo}
          opcoes={motivosOcorrencia}
          onChange={(v) => setMotivo(v as MotivoOcorrencia)}
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor="ocor_descricao" className={label}>
          Descrição
        </label>
        <textarea
          id="ocor_descricao"
          required
          rows={3}
          maxLength={2000}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={input}
        />
      </div>
      {msg && (
        <p role="alert" className={`${erroCls} sm:col-span-3`}>
          {msg}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <button type="submit" disabled={aEnviar} className={`${botao} min-h-10`}>
          {aEnviar ? "A enviar..." : "Enviar"}
        </button>
        <button type="button" onClick={onCancelar} className={`${botaoSec} min-h-10`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
