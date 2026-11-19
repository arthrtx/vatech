"use client";

import { useState } from "react";
import { api, mensagemDeErro, type Pedido, type SubtipoPedido, type TipoPedido } from "@/lib/api";
import CampoData from "./CampoData";
import Seletor from "./Seletor";
import { botao, botaoSec, erro as erroCls, input, label } from "./ui";

const subtipos: { v: SubtipoPedido; t: string }[] = [
  { v: "medica", t: "Médica" },
  { v: "documentacao", t: "Documentação" },
  { v: "falta_justificada", t: "Falta justificada" },
];

export default function PedidoForm({
  onCriado,
  pedido,
  onCancelar,
  dataInicial = "",
  className = "flex max-w-xl flex-col gap-4 rounded-cartao p-5 bg-painel/55 shadow-suave ring-1 ring-white/70 backdrop-blur-xl dark:ring-white/10 has-[[role=dialog]]:relative has-[[role=dialog]]:z-20",
}: {
  /** Chamado depois de criar (ou, em modo de edição, de guardar) o pedido. */
  onCriado?: (avisos: string[]) => void;
  /** Se existir, o formulário edita este pedido em vez de criar um novo. */
  pedido?: Pedido;
  /** Botão "Cancelar" (modo de edição). */
  onCancelar?: () => void;
  /** Preenche início e fim (ex.: dia escolhido na Agenda). */
  dataInicial?: string;
  className?: string;
}) {
  const edicao = !!pedido;
  const [tipo, setTipo] = useState<TipoPedido>(pedido?.tipo ?? "ferias");
  const [subtipo, setSubtipo] = useState<SubtipoPedido | "">(pedido?.subtipo ?? "");
  const [inicio, setInicio] = useState(pedido?.data_inicio ?? dataInicial);
  const [fim, setFim] = useState(pedido?.data_fim ?? dataInicial);
  const [obs, setObs] = useState(pedido?.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAvisos([]);
    setEnviando(true);
    try {
      const corpo = {
        tipo,
        ...(tipo === "ausencia" && subtipo ? { subtipo } : {}),
        data_inicio: inicio,
        data_fim: fim,
        ...(obs ? { observacao: obs } : {}),
      };
      const r = pedido ? await api.editarPedido(pedido.id, corpo) : await api.criarPedido(corpo);
      setAvisos(r.avisos ?? []);
      if (!pedido) {
        setInicio("");
        setFim("");
        setObs("");
      }
      onCriado?.(r.avisos ?? []);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={className} aria-labelledby="novo-pedido">
      <h2 id="novo-pedido" className="text-lg font-semibold">
        {edicao ? "Editar pedido" : "Novo pedido"}
      </h2>
      <div>
        <label htmlFor="tipo" className={label}>
          Tipo
        </label>
        <Seletor
          id="tipo"
          valor={tipo}
          opcoes={[
            { valor: "ferias", rotulo: "Férias" },
            { valor: "ausencia", rotulo: "Ausência" },
            { valor: "licenca", rotulo: "Licença" },
          ]}
          onChange={(v) => setTipo(v as TipoPedido)}
        />
      </div>
      {tipo === "ausencia" && (
        <div>
          <label htmlFor="subtipo" className={label}>
            Subtipo
          </label>
          <Seletor
            id="subtipo"
            valor={subtipo}
            opcoes={[{ valor: "", rotulo: "Sem subtipo" }, ...subtipos.map((x) => ({ valor: x.v, rotulo: x.t }))]}
            onChange={(v) => setSubtipo(v as SubtipoPedido | "")}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="data_inicio" className={label}>
            Data de início
          </label>
          <CampoData id="data_inicio" required valor={inicio} onChange={setInicio} />
        </div>
        <div>
          <label htmlFor="data_fim" className={label}>
            Data de fim
          </label>
          <CampoData id="data_fim" required min={inicio || undefined} valor={fim} onChange={setFim} />
        </div>
      </div>
      <div>
        <label htmlFor="observacao" className={label}>
          Observação
        </label>
        <textarea
          id="observacao"
          rows={3}
          className={input}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>
      {erro && (
        <p role="alert" className={erroCls}>
          {erro}
        </p>
      )}
      {avisos.length > 0 && (
        <div role="status" className={erroCls}>
          <p className="font-medium">{edicao ? "Pedido guardado, com avisos:" : "Pedido criado, com avisos:"}</p>
          <ul className="list-disc pl-5">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={botao}>
          {enviando ? "A enviar..." : edicao ? "Guardar alterações" : "Submeter pedido"}
        </button>
        {edicao && onCancelar && (
          <button type="button" onClick={onCancelar} className={botaoSec}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
