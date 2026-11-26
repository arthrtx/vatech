"use client";

import CampoHora from "./CampoHora";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, mensagemDeErro } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import FormaCanto from "../app/definicoes/FormaCanto";
import { botao, botaoSec, erro as erroCls, input, label, vidro } from "./ui";

interface Props {
  /** Primeiro dia permitido (início do estágio), se existir. */
  min?: string | null;
  onRegistado: () => void;
  onCancelar: () => void;
}

/** Painel para registar uma presença esquecida num dia passado. */
export default function PresencaAtrasada({ min, onRegistado, onCancelar }: Props) {
  const [hoje] = useState(() => hojeIso());
  const [data, setData] = useState("");
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const primeiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primeiro.current?.focus();
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!data || !entrada || !saida) return setMsg("Preencha o dia, a entrada e a saída.");
    if (entrada >= saida) return setMsg("A entrada tem de ser anterior à saída.");
    setMsg(null);
    setAEnviar(true);
    try {
      await api.marcarPresencaAtrasada({ data, entrada, saida });
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
      aria-labelledby="pres_atr_titulo"
      className={`${vidro} relative isolate grid gap-4 p-5 md:p-6 sm:grid-cols-3`}
    >
      <FormaCanto tom="rosa" />
      <h2 id="pres_atr_titulo" className="text-xl font-bold tracking-tight sm:col-span-3">
        Registar presença esquecida
      </h2>
      <div>
        <label htmlFor="pres_atr_dia" className={label}>
          Dia
        </label>
        <input
          ref={primeiro}
          id="pres_atr_dia"
          type="date"
          required
          min={min || undefined}
          max={hoje}
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`${input} min-h-10`}
        />
      </div>
      <div>
        <label htmlFor="pres_atr_entrada" className={label}>
          Entrada
        </label>
        <CampoHora id="pres_atr_entrada" required className="min-h-10" valor={entrada} onChange={setEntrada} />
      </div>
      <div>
        <label htmlFor="pres_atr_saida" className={label}>
          Saída
        </label>
        <CampoHora id="pres_atr_saida" required className="min-h-10" valor={saida} onChange={setSaida} />
      </div>
      {msg && (
        <p role="alert" className={`${erroCls} sm:col-span-3`}>
          {msg}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <button type="submit" disabled={aEnviar} className={`${botao} min-h-10`}>
          {aEnviar ? "A registar..." : "Registar"}
        </button>
        <button type="button" onClick={onCancelar} className={`${botaoSec} min-h-10`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
