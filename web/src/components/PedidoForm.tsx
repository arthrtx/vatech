"use client";

import { useState } from "react";
import { api, mensagemDeErro, type SubtipoPedido, type TipoPedido } from "@/lib/api";
import { botao, erro as erroCls, input, label } from "./ui";

const subtipos: { v: SubtipoPedido; t: string }[] = [
  { v: "medica", t: "Médica" },
  { v: "documentacao", t: "Documentação" },
  { v: "falta_justificada", t: "Falta justificada" },
];

export default function PedidoForm({ onCriado }: { onCriado?: () => void }) {
  const [tipo, setTipo] = useState<TipoPedido>("ferias");
  const [subtipo, setSubtipo] = useState<SubtipoPedido | "">("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAvisos([]);
    setEnviando(true);
    try {
      const r = await api.criarPedido({
        tipo,
        ...(tipo === "ausencia" && subtipo ? { subtipo } : {}),
        data_inicio: inicio,
        data_fim: fim,
        ...(obs ? { observacao: obs } : {}),
      });
      setAvisos(r.avisos ?? []);
      setInicio("");
      setFim("");
      setObs("");
      onCriado?.();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex max-w-xl flex-col gap-4 rounded-cartao bg-painel p-5 shadow-suave" aria-labelledby="novo-pedido">
      <h2 id="novo-pedido" className="text-lg font-semibold">
        Novo pedido
      </h2>
      <div>
        <label htmlFor="tipo" className={label}>
          Tipo
        </label>
        <select
          id="tipo"
          className={input}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoPedido)}
        >
          <option value="ferias">Férias</option>
          <option value="ausencia">Ausência</option>
          <option value="licenca">Licença</option>
        </select>
      </div>
      {tipo === "ausencia" && (
        <div>
          <label htmlFor="subtipo" className={label}>
            Subtipo
          </label>
          <select
            id="subtipo"
            className={input}
            value={subtipo}
            onChange={(e) => setSubtipo(e.target.value as SubtipoPedido | "")}
          >
            <option value="">Sem subtipo</option>
            {subtipos.map((s) => (
              <option key={s.v} value={s.v}>
                {s.t}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="data_inicio" className={label}>
            Data de início
          </label>
          <input
            id="data_inicio"
            type="date"
            required
            className={input}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="data_fim" className={label}>
            Data de fim
          </label>
          <input
            id="data_fim"
            type="date"
            required
            min={inicio || undefined}
            className={input}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
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
          <p className="font-medium">Pedido criado, com avisos:</p>
          <ul className="list-disc pl-5">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <button type="submit" disabled={enviando} className={botao}>
          {enviando ? "A enviar..." : "Submeter pedido"}
        </button>
      </div>
    </form>
  );
}
