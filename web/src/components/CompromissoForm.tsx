"use client";

import { useState } from "react";
import { api, mensagemDeErro, type Compromisso, type TipoCompromisso } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import CampoData from "./CampoData";
import CampoHora from "./CampoHora";
import Seletor from "./Seletor";
import { botao, botaoSec, erro as erroCls, input, label } from "./ui";

export const tiposCompromisso: Record<TipoCompromisso, string> = {
  reuniao: "Reunião",
  chamada: "Chamada",
  lembrete: "Lembrete",
  outro: "Outro",
};

/** Marca um compromisso na agenda pessoal: só hoje ou dias seguintes. */
export default function CompromissoForm({
  dataInicial,
  aoCriar,
  aoCancelar,
}: {
  dataInicial: string;
  aoCriar: (c: Compromisso) => void;
  aoCancelar: () => void;
}) {
  const hoje = hojeIso();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoCompromisso>("reuniao");
  const [data, setData] = useState(dataInicial < hoje ? hoje : dataInicial);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (inicio && !fim) return setErro("Indique também a hora de fim.");
    if (inicio && fim <= inicio) return setErro("A hora de fim tem de ser depois da hora de início.");
    setAEnviar(true);
    try {
      aoCriar(
        await api.criarCompromisso({
          data,
          titulo: titulo.trim(),
          tipo,
          ...(inicio ? { hora_inicio: inicio, hora_fim: fim } : {}),
          ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
        }),
      );
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      aria-labelledby="novo-compromisso"
      className="flex flex-col gap-4 rounded-cartao bg-painel/80 p-5 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10"
    >
      <h2 id="novo-compromisso" className="text-lg font-semibold">
        Marcar na agenda
      </h2>
      <div>
        <label htmlFor="comp-titulo" className={label}>
          Título
        </label>
        <input id="comp-titulo" required maxLength={120} className={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="comp-tipo" className={label}>
            Tipo
          </label>
          <Seletor
            id="comp-tipo"
            valor={tipo}
            opcoes={(Object.keys(tiposCompromisso) as TipoCompromisso[]).map((v) => ({ valor: v, rotulo: tiposCompromisso[v] }))}
            onChange={(v) => setTipo(v as TipoCompromisso)}
          />
        </div>
        <div>
          <label htmlFor="comp-data" className={label}>
            Dia
          </label>
          <CampoData id="comp-data" required min={hoje} valor={data} onChange={setData} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="comp-inicio" className={label}>
            Das (opcional)
          </label>
          <CampoHora id="comp-inicio" valor={inicio} onChange={setInicio} />
        </div>
        <div>
          <label htmlFor="comp-fim" className={label}>
            Até às
          </label>
          <CampoHora id="comp-fim" required={!!inicio} valor={fim} onChange={setFim} />
        </div>
      </div>
      <div>
        <label htmlFor="comp-descricao" className={label}>
          Descrição (opcional)
        </label>
        <textarea id="comp-descricao" rows={3} maxLength={2000} className={input} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={aEnviar || !data} className={botao}>
          {aEnviar ? "A guardar..." : "Guardar"}
        </button>
        <button type="button" onClick={aoCancelar} className={botaoSec}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
