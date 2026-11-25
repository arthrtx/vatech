"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, mensagemDeErro, type Anexo, type Limite, type Pedido, type SubtipoPedido, type TipoPedido } from "@/lib/api";
import { hojeIso } from "@/lib/agenda";
import { tipos } from "@/lib/rotulos";
import CampoAnexos from "./CampoAnexos";
import { diasUteis } from "@/lib/diasUteis";
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
  const { user } = useAuth();
  const semFerias = user?.papel === "estagiario";
  const hoje = hojeIso();
  const [tipo, setTipo] = useState<TipoPedido>(pedido?.tipo ?? (semFerias ? "ausencia" : "ferias"));
  const [subtipo, setSubtipo] = useState<SubtipoPedido | "">(pedido?.subtipo ?? "");
  const [inicio, setInicio] = useState(pedido?.data_inicio ?? dataInicial);
  const [fim, setFim] = useState(pedido?.data_fim ?? dataInicial);
  const [obs, setObs] = useState(pedido?.observacao ?? "");
  const [urgente, setUrgente] = useState(pedido?.urgente ?? false);
  const [aMelhorar, setAMelhorar] = useState(false);
  const [antesDeMelhorar, setAntesDeMelhorar] = useState<string | null>(null);
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const [novos, setNovos] = useState<File[]>([]);
  const [guardados, setGuardados] = useState<Anexo[]>(pedido?.anexos ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const [limites, setLimites] = useState<Limite[]>([]);
  useEffect(() => {
    let ativo = true;
    api
      .limites()
      .then((r) => ativo && setLimites(r.limites))
      .catch(() => {
        // Sem saldo visível; a validação final é do servidor.
      });
    return () => {
      ativo = false;
    };
  }, []);

  const limite = limites.find((l) => l.tipo === tipo);
  const ano = hoje.slice(0, 4);
  // Ao editar um pedido do mesmo tipo, os seus dias já estão em «usados».
  const proprios = pedido && pedido.tipo === tipo && pedido.estado !== "recusado" ? diasUteis(pedido.data_inicio, pedido.data_fim) : 0;
  const usados = limite ? Math.max(0, limite.usados - proprios) : 0;
  const total = limite?.dias_ano != null ? limite.dias_ano + limite.transitados : null;
  const restam = total !== null ? Math.max(0, total - usados) : null;
  const diasPedidos = inicio && fim && fim >= inicio ? diasUteis(inicio, fim) : 0;
  const excede = restam !== null && diasPedidos > restam;

  async function melhorar() {
    setErroTexto(null);
    setAMelhorar(true);
    try {
      const melhorado = await api.melhorarTexto(obs);
      setAntesDeMelhorar(obs);
      setObs(melhorado);
    } catch (err) {
      setErroTexto(mensagemDeErro(err));
    } finally {
      setAMelhorar(false);
    }
  }

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
        urgente,
      };
      const r = pedido ? await api.editarPedido(pedido.id, corpo) : await api.criarPedido(corpo);
      setAvisos(r.avisos ?? []);
      let falhaAnexos: string | null = null;
      if (novos.length > 0) {
        try {
          const criados = await api.enviarAnexos(r.data.id, novos);
          setGuardados((g) => [...g, ...criados]);
        } catch (err) {
          falhaAnexos = `${edicao ? "Alterações guardadas" : "Pedido criado"}, mas os anexos não foram enviados: ${mensagemDeErro(err)}`;
        }
        setNovos([]);
      }
      if (!pedido) {
        setInicio("");
        setFim("");
        setObs("");
        setUrgente(false);
        setGuardados([]);
      }
      if (falhaAnexos) setErro(`${falhaAnexos}${edicao ? "" : " Edite o pedido para os juntar."}`);
      onCriado?.(r.avisos ?? []);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={className} aria-labelledby="novo-pedido">
      <div className="flex items-center justify-between gap-3">
        <h2 id="novo-pedido" className="text-lg font-semibold">
          {edicao ? "Editar pedido" : "Novo pedido"}
        </h2>
        <label htmlFor="urgente" className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          Urgente
          <button
            id="urgente"
            type="button"
            role="switch"
            aria-checked={urgente}
            onClick={() => setUrgente((u) => !u)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${urgente ? "bg-yellow-400" : "bg-white/20 ring-1 ring-white/20"}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${urgente ? "translate-x-5" : ""}`} />
          </button>
        </label>
      </div>
      <div>
        <label htmlFor="tipo" className={label}>
          Tipo
        </label>
        <Seletor
          id="tipo"
          valor={tipo}
          opcoes={[
            ...(semFerias ? [] : [{ valor: "ferias", rotulo: "Férias" }]),
            { valor: "ausencia", rotulo: "Ausência" },
            { valor: "licenca", rotulo: "Licença" },
          ]}
          onChange={(v) => setTipo(v as TipoPedido)}
        />
      </div>
      {tipo === "licenca" && !edicao && (
        <p role="note" className="rounded-controlo border border-linha-forte bg-painel/60 px-3 py-2 text-sm">
          A licença é um direito seu: não precisa de aprovação. O admin recebe um aviso.
        </p>
      )}
      {limite?.dias_ano != null && (
        <p role="status" className="text-sm text-texto-suave">
          {tipos[tipo]}: {usados} de {total} dias úteis usados em {ano} (
          {limite.transitados > 0 ? `${limite.dias_ano} do ano + ${limite.transitados} transitados; ` : ""}restam {restam})
        </p>
      )}
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
          <CampoData
            id="data_inicio"
            required
            min={hoje}
            valor={inicio}
            onChange={(v) => {
              setInicio(v);
              if (fim && v > fim) setFim("");
            }}
          />
        </div>
        <div>
          <label htmlFor="data_fim" className={label}>
            Data de fim
          </label>
          <CampoData id="data_fim" required min={inicio && inicio > hoje ? inicio : hoje} valor={fim} onChange={setFim} />
        </div>
      </div>
      {excede && (
        <p role="alert" className={erroCls}>
          Este pedido tem {diasPedidos} dias úteis e só restam {restam} de {tipos[tipo].toLowerCase()} em {ano}.
        </p>
      )}
      <div>
        <label htmlFor="observacao" className={label}>
          Descrição
        </label>
        <textarea
          id="observacao"
          rows={3}
          className={input}
          value={obs}
          maxLength={2000}
          onChange={(e) => {
            setObs(e.target.value);
            setAntesDeMelhorar(null);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={aMelhorar || obs.trim().length < 3} onClick={melhorar} className={`${botaoSec} min-h-9 px-3 py-1`}>
            {aMelhorar ? "A melhorar..." : "Melhorar texto"}
          </button>
          {antesDeMelhorar !== null && !aMelhorar && (
            <>
              <button
                type="button"
                className={`${botaoSec} min-h-9 px-3 py-1`}
                onClick={() => {
                  setObs(antesDeMelhorar);
                  setAntesDeMelhorar(null);
                }}
              >
                Desfazer
              </button>
              <span role="status" className="text-sm text-texto-suave">
                Texto melhorado. Reveja antes de submeter.
              </span>
            </>
          )}
        </div>
        {erroTexto && (
          <p role="alert" className={`${erroCls} mt-2`}>
            {erroTexto}
          </p>
        )}
      </div>
      <CampoAnexos
        novos={novos}
        onNovos={setNovos}
        guardados={guardados}
        onRemoverGuardado={async (a) => {
          if (!pedido) return;
          try {
            await api.apagarAnexo(pedido.id, a.id);
            setGuardados((g) => g.filter((x) => x.id !== a.id));
          } catch (err) {
            setErro(mensagemDeErro(err));
          }
        }}
      />
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
          {enviando ? "A enviar..." : edicao ? "Guardar alterações" : tipo === "licenca" ? "Comunicar licença" : "Submeter pedido"}
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
